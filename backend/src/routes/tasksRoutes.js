/**
 * tasksRoutes.js – Task Management Routes
 *
 * Mounts all task-related endpoints under the /api/v1/tasks prefix (server.js).
 * ALL routes require a valid JWT enforced by router.use(authenticateToken).
 *
 * Route groups:
 *  Core CRUD   : GET /, POST /, GET /:id, PUT /:id, DELETE /:id
 *  Status only : PATCH /:id/status
 *  Checklists  : GET/POST /:id/checklists, PATCH/DELETE /:id/checklists/:cid
 *  Attachments : GET/POST /:id/attachments
 */

const express = require('express');
const {
  listTasks, createTask, getTask, updateTask, deleteTask, updateTaskStatus,
  getChecklists, createChecklist, updateChecklist, deleteChecklist,
  createAttachment, getAttachments,
} = require('../controllers/tasksController');
const { authenticateToken } = require('../middleware/auth');
const { uploadTaskFile }    = require('../middleware/upload');

const router = express.Router();

/**
 * Apply JWT authentication to every route in this router.
 * Requests without a valid Bearer token are rejected before any controller runs.
 */
router.use(authenticateToken);

// ─── Core Task CRUD ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/tasks
 * List all tasks the authenticated user created or was assigned to.
 * Supports optional query filters: ?status=pending  ?priority=high
 * Response: { success, message, data: Task[] }
 */
router.get('/', listTasks);

/**
 * POST /api/v1/tasks
 * Create a new task owned by the authenticated user.
 * Body   : { title, description?, status?, priority?, due_date?, assigned_to? }
 * Response (201): { success, message, data: Task }
 */
router.post('/', createTask);

/**
 * GET /api/v1/tasks/:id
 * Retrieve a single task by ID.
 * Returns 404 if the task doesn't exist or the user lacks access.
 * Response: { success, message, data: Task }
 */
router.get('/:id', getTask);

/**
 * PUT /api/v1/tasks/:id
 * Update any subset of task fields (COALESCE keeps unchanged fields).
 * Body   : { title?, description?, status?, priority?, due_date?, assigned_to? }
 * Response: { success, message, data: Task }
 */
router.put('/:id', updateTask);

/**
 * DELETE /api/v1/tasks/:id
 * Permanently delete a task. Child checklists and attachments are removed
 * automatically via ON DELETE CASCADE.
 * Response: { success, message, data: { id } }
 */
router.delete('/:id', deleteTask);

/**
 * PATCH /api/v1/tasks/:id/status
 * Update only the status field – lighter than a full PUT.
 * Useful for drag-and-drop Kanban boards or quick status toggles.
 * Body   : { status }
 * Response: { success, message, data: { id, title, status } }
 */
router.patch('/:id/status', updateTaskStatus);

// ─── Checklist Endpoints ─────────────────────────────────────────────────────

/**
 * GET /api/v1/tasks/:id/checklists
 * Return all checklist items for a task (ordered ASC by created_at).
 * Response: { success, message, data: ChecklistItem[] }
 */
router.get('/:id/checklists', getChecklists);

/**
 * POST /api/v1/tasks/:id/checklists
 * Add a new checklist item to a task (default completed = false).
 * Body     : { title }
 * Response (201): { success, message, data: ChecklistItem }
 */
router.post('/:id/checklists', createChecklist);

/**
 * PATCH /api/v1/tasks/:id/checklists/:checklist_id
 * Toggle completed or update the title of a checklist item.
 * Body    : { completed?: boolean, title?: string }
 * Response: { success, message, data: ChecklistItem }
 */
router.patch('/:id/checklists/:checklist_id', updateChecklist);

/**
 * DELETE /api/v1/tasks/:id/checklists/:checklist_id
 * Remove a single checklist item.
 * Response: { success, message, data: { id } }
 */
router.delete('/:id/checklists/:checklist_id', deleteChecklist);

// ─── Attachment Endpoints ────────────────────────────────────────────────────

/**
 * GET /api/v1/tasks/:id/attachments
 * Return all attachments for a task (ordered DESC by uploaded_at).
 * Response: { success, message, data: Attachment[] }
 */
router.get('/:id/attachments', getAttachments);

/**
 * POST /api/v1/tasks/:id/attachments
 * Upload a file and record its metadata.
 * Middleware: uploadTaskFile (Multer) saves the file and populates req.file.
 * Request  : multipart/form-data, field name 'file'.
 * Response (201): { success, message, data: Attachment }
 */
router.post('/:id/attachments', uploadTaskFile, createAttachment);

module.exports = router;
