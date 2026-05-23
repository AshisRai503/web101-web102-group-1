const pool = require('../config/db');

// Normalise status to always use underscore form stored in DB.
// Accepts both 'in-progress' (frontend) and 'in_progress' (DB).
const normaliseStatus = (s) => {
  if (!s) return s;
  return s.toString().toLowerCase().replace(/[_\s]+/g, '-').replace('in-progress', 'in_progress');
};

const listTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, priority } = req.query;
    let query = `SELECT id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at 
       FROM tasks 
       WHERE created_by = $1 OR assigned_to = $1`;
    const params = [userId];
    if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
    if (priority) { query += ` AND priority = $${params.length + 1}`; params.push(priority); }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, message: 'Tasks retrieved successfully', data: result.rows });
  } catch (error) { next(error); }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    const userId = req.user.id;
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at`,
      [title, description, normaliseStatus(status) || 'pending', priority || 'medium', due_date, assigned_to, userId]
    );
    res.status(201).json({ success: true, message: 'Task created successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at
       FROM tasks WHERE id = $1 AND (created_by = $2 OR assigned_to = $2)`,
      [id, userId]
    );
    if (result.rows.length === 0) { const error = new Error('Task not found'); error.status = 404; throw error; }
    res.json({ success: true, message: 'Task retrieved successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    const userId = req.user.id;
    const result = await pool.query(
      `UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description),
       status = COALESCE($3::text, status), priority = COALESCE($4, priority),
       due_date = COALESCE($5, due_date), assigned_to = COALESCE($6, assigned_to),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND (created_by = $8 OR assigned_to = $8)
       RETURNING id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at`,
      [title, description, normaliseStatus(status), priority, due_date, assigned_to, id, userId]
    );
    if (result.rows.length === 0) { const error = new Error('Task not found'); error.status = 404; throw error; }
    res.json({ success: true, message: 'Task updated successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      `DELETE FROM tasks WHERE id = $1 AND (created_by = $2 OR assigned_to = $2) RETURNING id`,
      [id, userId]
    );
    if (result.rows.length === 0) { const error = new Error('Task not found'); error.status = 404; throw error; }
    res.json({ success: true, message: 'Task deleted successfully', data: { id: result.rows[0].id } });
  } catch (error) { next(error); }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const result = await pool.query(
      `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (created_by = $3 OR assigned_to = $3)
       RETURNING id, title, status`,
      [normaliseStatus(status), id, userId]
    );
    if (result.rows.length === 0) { const error = new Error('Task not found'); error.status = 404; throw error; }
    res.json({ success: true, message: 'Task status updated successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

const getChecklists = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, task_id, title, completed, created_at FROM checklists WHERE task_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    res.json({ success: true, message: 'Checklists retrieved successfully', data: result.rows });
  } catch (error) { next(error); }
};

const createChecklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const result = await pool.query(
      `INSERT INTO checklists (task_id, title) VALUES ($1, $2) RETURNING id, task_id, title, completed, created_at`,
      [id, title]
    );
    res.status(201).json({ success: true, message: 'Checklist item created successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

const updateChecklist = async (req, res, next) => {
  try {
    const { checklist_id } = req.params;
    const { completed, title } = req.body;
    const result = await pool.query(
      `UPDATE checklists SET completed = COALESCE($1, completed), title = COALESCE($2, title)
       WHERE id = $3 RETURNING id, task_id, title, completed, created_at`,
      [completed, title, checklist_id]
    );
    if (result.rows.length === 0) { const error = new Error('Checklist item not found'); error.status = 404; throw error; }
    res.json({ success: true, message: 'Checklist item updated successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

const deleteChecklist = async (req, res, next) => {
  try {
    const { checklist_id } = req.params;
    const result = await pool.query(`DELETE FROM checklists WHERE id = $1 RETURNING id`, [checklist_id]);
    if (result.rows.length === 0) { const error = new Error('Checklist item not found'); error.status = 404; throw error; }
    res.json({ success: true, message: 'Checklist item deleted successfully', data: { id: result.rows[0].id } });
  } catch (error) { next(error); }
};

const createAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) { const error = new Error('No file uploaded'); error.status = 400; throw error; }
    const file_url = `/uploads/tasks/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO attachments (task_id, file_name, file_url) VALUES ($1, $2, $3)
       RETURNING id, task_id, file_name, file_url, uploaded_at`,
      [id, req.file.originalname, file_url]
    );
    res.status(201).json({ success: true, message: 'Attachment uploaded successfully', data: result.rows[0] });
  } catch (error) { next(error); }
};

const getAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, task_id, file_name, file_url, uploaded_at FROM attachments WHERE task_id = $1 ORDER BY uploaded_at DESC`,
      [id]
    );
    res.json({ success: true, message: 'Attachments retrieved successfully', data: result.rows });
  } catch (error) { next(error); }
};

module.exports = { listTasks, createTask, getTask, updateTask, deleteTask, updateTaskStatus, getChecklists, createChecklist, updateChecklist, deleteChecklist, createAttachment, getAttachments };
