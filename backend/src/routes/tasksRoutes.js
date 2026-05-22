const express = require('express');
const { listTasks, createTask, getTask, updateTask, deleteTask, updateTaskStatus, getChecklists, createChecklist, updateChecklist, deleteChecklist, createAttachment, getAttachments } = require('../controllers/tasksController');
const { authenticateToken } = require('../middleware/auth');
const { uploadTaskFile } = require('../middleware/upload');
const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// Task routes
router.get('/', listTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', updateTaskStatus);

// Checklist routes
router.get('/:id/checklists', getChecklists);
router.post('/:id/checklists', createChecklist);
router.patch('/:id/checklists/:checklist_id', updateChecklist);
router.delete('/:id/checklists/:checklist_id', deleteChecklist);

// Attachment routes
router.get('/:id/attachments', getAttachments);
router.post('/:id/attachments', uploadTaskFile, createAttachment);

module.exports = router;
