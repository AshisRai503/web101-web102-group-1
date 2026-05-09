const express = require('express');
const { listTasks, createTask, getTask, updateTask, deleteTask } = require('../controllers/tasksController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

router.get('/', listTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
