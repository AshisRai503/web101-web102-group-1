const pool = require('../config/db');

const listTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at 
       FROM tasks 
       WHERE created_by = $1 OR assigned_to = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at`,
      [title, description, status || 'pending', priority || 'medium', due_date, assigned_to, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at
       FROM tasks
       WHERE id = $1 AND (created_by = $2 OR assigned_to = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: 'Task retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           due_date = COALESCE($5, due_date),
           assigned_to = COALESCE($6, assigned_to),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND (created_by = $8 OR assigned_to = $8)
       RETURNING id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at`,
      [title, description, status, priority, due_date, assigned_to, id, userId]
    );

    if (result.rows.length === 0) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND (created_by = $2 OR created_by = $2)
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      data: { id: result.rows[0].id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listTasks, createTask, getTask, updateTask, deleteTask };
