const pool = require('../config/db');
const path = require('path');

const listUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, avatar_url, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query('SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: userResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.status = 400;
      throw error;
    }

    const userId = req.user.id;
    const avatarUrl = `/uploads/${req.file.filename}`;

    const updateResult = await pool.query(
      'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, avatar_url',
      [avatarUrl, userId]
    );

    if (updateResult.rows.length === 0) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: updateResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listUsers, getMe, uploadAvatar };
