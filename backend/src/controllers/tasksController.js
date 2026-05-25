/**
 * tasksController.js – Tasks Controller
 *
 * All route handlers for task management, including checklist items and
 * file attachments. Every handler reads req.user.id (set by authenticateToken)
 * to enforce ownership: users can only access tasks they created or were
 * assigned to.
 *
 * Exported functions:
 *  Task CRUD   : listTasks, createTask, getTask, updateTask, deleteTask
 *  Status      : updateTaskStatus
 *  Checklists  : getChecklists, createChecklist, updateChecklist, deleteChecklist
 *  Attachments : createAttachment, getAttachments
 */

const pool = require('../config/db');

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────

/**
 * Normalises a task status string to the snake_case form stored in the DB.
 *
 * The frontend may send 'in-progress' (kebab-case) or 'In Progress' (spaced),
 * but the database column stores 'in_progress'. This helper normalises any
 * incoming format to the correct DB value.
 *
 * Conversion:
 *  1. Lowercase.
 *  2. Replace runs of underscores/spaces with a hyphen → 'in-progress'.
 *  3. Re-map the one special case back → 'in_progress'.
 *
 * @param {string} s – Raw status from the request.
 * @returns {string|undefined} Normalised DB status, or undefined if s is falsy.
 *
 * @example
 *   normaliseStatus('In Progress') // → 'in_progress'
 *   normaliseStatus('completed')   // → 'completed'
 */
const normaliseStatus = (s) => {
  if (!s) return s;
  return s.toString().toLowerCase().replace(/[_\s]+/g, '-').replace('in-progress', 'in_progress');
};

// ─────────────────────────────────────────────
// Task CRUD
// ─────────────────────────────────────────────

/**
 * Lists tasks visible to the authenticated user.
 * A task is visible if created_by OR assigned_to equals req.user.id,
 * OR if the user appears in the task_assignments join table.
 * Optional query filters: ?status=pending  ?priority=high
 * Results are ordered newest-first.
 *
 * Each returned task includes an `assigned_members` integer array containing
 * all user IDs from task_assignments for that task (empty array when none).
 *
 * Route: GET /api/v1/tasks
 *
 * @param {import('express').Request}      req  – req.user.id, query: { status?, priority? }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: Task[] }
 */
const listTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, priority } = req.query;

    // LEFT JOIN with task_assignments so every task row includes the full
    // list of assigned user IDs as an integer array.
    // ARRAY_AGG … FILTER (WHERE …) avoids a null entry in the array when
    // there are no assignment rows for that task.
    // The correlated sub-select in WHERE ensures tasks assigned via
    // task_assignments (not just assigned_to) are visible to the member.
    let query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
             t.assigned_to, t.created_by, t.created_at, t.updated_at,
             COALESCE(
               ARRAY_AGG(ta.user_id ORDER BY ta.user_id)
                 FILTER (WHERE ta.user_id IS NOT NULL),
               ARRAY[]::integer[]
             ) AS assigned_members
      FROM   tasks t
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      WHERE  (
               t.created_by = $1
               OR t.assigned_to = $1
               OR EXISTS (
                    SELECT 1 FROM task_assignments ta2
                    WHERE  ta2.task_id = t.id AND ta2.user_id = $1
                  )
             )`;
    const params = [userId];

    // Dynamically append optional filters. Column references are prefixed with
    // "t." because of the GROUP BY that follows.
    if (status)   { query += ` AND t.status   = $${params.length + 1}`; params.push(status); }
    if (priority) { query += ` AND t.priority = $${params.length + 1}`; params.push(priority); }

    // GROUP BY is required for the ARRAY_AGG aggregate.
    query += ' GROUP BY t.id ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, message: 'Tasks retrieved successfully', data: result.rows });
  } catch (error) { next(error); }
};

/**
 * Creates a new task owned by the authenticated user.
 *
 * Accepts an optional `assigned_members` array in the request body.
 * After inserting the core task row, one row per member is inserted into
 * `task_assignments` (using ON CONFLICT DO NOTHING so duplicates are harmless).
 *
 * For backward compatibility the first element of `assigned_members` is also
 * written to the legacy `assigned_to` column on the tasks row.
 *
 * Route: POST /api/v1/tasks
 *
 * @param {import('express').Request}      req  – body: { title, description?, status?,
 *   priority?, due_date?, assigned_to?, assigned_members?: number[] }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {201} { success, message, data: Task }
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date, assigned_to, assigned_members } = req.body;
    const userId = req.user.id; // Creator is always the authenticated user.

    // Resolve the legacy single-assignee column.
    // If assigned_members is provided, use its first element as assigned_to;
    // otherwise fall back to whatever was sent in the body directly.
    const members   = Array.isArray(assigned_members) ? assigned_members : [];
    const primaryId = assigned_to || (members.length > 0 ? members[0] : null);

    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, status, priority, due_date,
                 assigned_to, created_by, created_at, updated_at`,
      [
        title,
        description,
        normaliseStatus(status) || 'pending', // Default status when omitted
        priority || 'medium',                  // Default priority when omitted
        due_date,
        primaryId,
        userId,
      ]
    );
    const task = result.rows[0];

    // Insert one row per assigned member into the join table.
    // ON CONFLICT DO NOTHING prevents errors if the same user appears twice.
    if (members.length > 0) {
      await Promise.all(
        members.map(memberId =>
          pool.query(
            `INSERT INTO task_assignments (task_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [task.id, memberId]
          )
        )
      );
    }

    res.status(201).json({ success: true, message: 'Task created successfully', data: task });
  } catch (error) { next(error); }
};

/**
 * Retrieves a single task by its primary key.
 * Enforces access: only creator or assignee can fetch.
 *
 * Route: GET /api/v1/tasks/:id
 *
 * @param {import('express').Request}      req  – params: { id }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: Task }
 * @returns {404} Task not found or not accessible.
 */
const getTask = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const userId   = req.user.id;
    const result   = await pool.query(
      `SELECT id, title, description, status, priority, due_date,
              assigned_to, created_by, created_at, updated_at
       FROM tasks
       WHERE id = $1 AND (created_by = $2 OR assigned_to = $2)`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      const error = new Error('Task not found'); error.status = 404; throw error;
    }
    res.json({ success: true, message: 'Task retrieved successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

/**
 * Updates any combination of fields on an existing task.
 * Uses SQL COALESCE so omitted fields retain their current DB values
 * (partial update – the client doesn't need to send the whole object).
 *
 * Route: PUT /api/v1/tasks/:id
 *
 * @param {import('express').Request}      req  – params: { id }, body: { title?,
 *   description?, status?, priority?, due_date?, assigned_to? }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: Task }
 * @returns {404} Task not found.
 */
const updateTask = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    const userId   = req.user.id;

    const result = await pool.query(
      `UPDATE tasks
         SET title       = COALESCE($1, title),
             description = COALESCE($2, description),
             status      = COALESCE($3::text, status),
             priority    = COALESCE($4, priority),
             due_date    = COALESCE($5, due_date),
             assigned_to = COALESCE($6, assigned_to),
             updated_at  = CURRENT_TIMESTAMP
       WHERE id = $7 AND (created_by = $8 OR assigned_to = $8)
       RETURNING id, title, description, status, priority, due_date,
                 assigned_to, created_by, created_at, updated_at`,
      [title, description, normaliseStatus(status), priority, due_date, assigned_to, id, userId]
    );
    if (result.rows.length === 0) {
      const error = new Error('Task not found'); error.status = 404; throw error;
    }
    res.json({ success: true, message: 'Task updated successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

/**
 * Permanently deletes a task.
 * Child checklists and attachments are removed automatically via
 * ON DELETE CASCADE foreign-key constraints in the DB migrations.
 *
 * Route: DELETE /api/v1/tasks/:id
 *
 * @param {import('express').Request}      req  – params: { id }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: { id } }
 * @returns {404} Task not found.
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      `DELETE FROM tasks WHERE id = $1 AND (created_by = $2 OR assigned_to = $2) RETURNING id`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      const error = new Error('Task not found'); error.status = 404; throw error;
    }
    res.json({ success: true, message: 'Task deleted successfully', data: { id: result.rows[0].id } });
  } catch (error) { next(error); }
};

/**
 * Updates ONLY the status field of a task.
 * Lighter alternative to PUT – useful for Kanban column drops or quick toggles.
 *
 * Route: PATCH /api/v1/tasks/:id/status
 *
 * @param {import('express').Request}      req  – params: { id }, body: { status }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: { id, title, status } }
 * @returns {404} Task not found.
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const { id }    = req.params;
    const { status} = req.body;
    const userId    = req.user.id;
    const result    = await pool.query(
      `UPDATE tasks
         SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (created_by = $3 OR assigned_to = $3)
       RETURNING id, title, status`,
      [normaliseStatus(status), id, userId]
    );
    if (result.rows.length === 0) {
      const error = new Error('Task not found'); error.status = 404; throw error;
    }
    res.json({ success: true, message: 'Task status updated successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// Checklist handlers
// ─────────────────────────────────────────────

/**
 * Returns all checklist items for a task, ordered oldest-first.
 *
 * Route: GET /api/v1/tasks/:id/checklists
 *
 * @param {import('express').Request}      req  – params: { id } (parent task ID)
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: ChecklistItem[] }
 */
const getChecklists = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, task_id, title, completed, created_at
       FROM checklists WHERE task_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    res.json({ success: true, message: 'Checklists retrieved successfully', data: result.rows });
  } catch (error) { next(error); }
};

/**
 * Adds a new checklist item to a task (completed defaults to false).
 *
 * Route: POST /api/v1/tasks/:id/checklists
 *
 * @param {import('express').Request}      req  – params: { id }, body: { title }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {201} { success, message, data: ChecklistItem }
 */
const createChecklist = async (req, res, next) => {
  try {
    const { id }    = req.params;
    const { title } = req.body;
    const result    = await pool.query(
      `INSERT INTO checklists (task_id, title)
       VALUES ($1, $2)
       RETURNING id, task_id, title, completed, created_at`,
      [id, title]
    );
    res.status(201).json({ success: true, message: 'Checklist item created successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

/**
 * Toggles the completed state or updates the title of a checklist item.
 * Uses COALESCE so only the provided fields change.
 *
 * Route: PATCH /api/v1/tasks/:id/checklists/:checklist_id
 *
 * @param {import('express').Request}      req  – params: { id, checklist_id },
 *   body: { completed?: boolean, title?: string }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: ChecklistItem }
 * @returns {404} Item not found.
 */
const updateChecklist = async (req, res, next) => {
  try {
    const { checklist_id }    = req.params;
    const { completed, title} = req.body;
    const result              = await pool.query(
      `UPDATE checklists
         SET completed = COALESCE($1, completed),
             title     = COALESCE($2, title)
       WHERE id = $3
       RETURNING id, task_id, title, completed, created_at`,
      [completed, title, checklist_id]
    );
    if (result.rows.length === 0) {
      const error = new Error('Checklist item not found'); error.status = 404; throw error;
    }
    res.json({ success: true, message: 'Checklist item updated successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

/**
 * Deletes a single checklist item.
 *
 * Route: DELETE /api/v1/tasks/:id/checklists/:checklist_id
 *
 * @param {import('express').Request}      req  – params: { id, checklist_id }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: { id } }
 * @returns {404} Item not found.
 */
const deleteChecklist = async (req, res, next) => {
  try {
    const { checklist_id } = req.params;
    const result = await pool.query(
      `DELETE FROM checklists WHERE id = $1 RETURNING id`, [checklist_id]
    );
    if (result.rows.length === 0) {
      const error = new Error('Checklist item not found'); error.status = 404; throw error;
    }
    res.json({ success: true, message: 'Checklist item deleted successfully', data: { id: result.rows[0].id } });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// Attachment handlers
// ─────────────────────────────────────────────

/**
 * Saves a newly uploaded file's metadata into the DB.
 * Multer (uploadTaskFile middleware) runs first, writes the file to disk,
 * and populates req.file before this handler executes.
 *
 * Route: POST /api/v1/tasks/:id/attachments
 *
 * @param {import('express').Request}      req  – params: { id }, req.file from Multer
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {201} { success, message, data: Attachment }
 * @returns {400} No file uploaded.
 */
const createAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      const error = new Error('No file uploaded'); error.status = 400; throw error;
    }
    // Build the public URL the frontend uses to download the file.
    const file_url = `/uploads/tasks/${req.file.filename}`;
    const result   = await pool.query(
      `INSERT INTO attachments (task_id, file_name, file_url)
       VALUES ($1, $2, $3)
       RETURNING id, task_id, file_name, file_url, uploaded_at`,
      [id, req.file.originalname, file_url]
    );
    res.status(201).json({ success: true, message: 'Attachment uploaded successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

/**
 * Returns all file attachments for a task, ordered newest-first.
 *
 * Route: GET /api/v1/tasks/:id/attachments
 *
 * @param {import('express').Request}      req  – params: { id } (parent task ID)
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: Attachment[] }
 */
const getAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, task_id, file_name, file_url, uploaded_at
       FROM attachments WHERE task_id = $1 ORDER BY uploaded_at DESC`,
      [id]
    );
    res.json({ success: true, message: 'Attachments retrieved successfully', data: result.rows });
  } catch (error) { next(error); }
};

module.exports = {
  listTasks, createTask, getTask, updateTask, deleteTask, updateTaskStatus,
  getChecklists, createChecklist, updateChecklist, deleteChecklist,
  createAttachment, getAttachments,
};
