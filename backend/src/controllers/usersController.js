/**
 * usersController.js – Users Controller
 *
 * Handles user-related API operations:
 *  - Listing all registered users (team page / task assignment UI)
 *  - Fetching the authenticated user's own profile
 *  - Uploading / replacing the authenticated user's avatar image
 *
 * Exported functions:
 *  listUsers    – GET  /api/v1/users
 *  getMe        – GET  /api/v1/users/me
 *  uploadAvatar – POST /api/v1/users/me/avatar
 */

const pool = require('../config/db');
const path = require('path'); // Available for future path manipulation if needed

// ─────────────────────────────────────────────
// listUsers
// ─────────────────────────────────────────────

/**
 * Returns all registered users, excluding their password hashes.
 * Results are ordered by creation date, newest first.
 *
 * @param {import('express').Request}      req  – No body or query params needed.
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: User[] }
 *   Each User: { id, email, name, role, avatar_url, created_at }
 */
const listUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, avatar_url, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, message: 'Users retrieved successfully', data: result.rows });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// getMe
// ─────────────────────────────────────────────

/**
 * Returns the profile of the currently authenticated user.
 *
 * The user's ID is read from req.user.id, which is decoded from the JWT
 * by the authenticateToken middleware before this handler runs.
 * Returns 404 if the token references a user ID that no longer exists
 * (e.g. the account was deleted after the token was issued).
 *
 * @param {import('express').Request}      req  – req.user.id set by auth middleware.
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, data: User }
 * @returns {404} User not found.
 */
const getMe = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const userResult = await pool.query(
      'SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    res.json({ success: true, data: userResult.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// uploadAvatar
// ─────────────────────────────────────────────

/**
 * Replaces the authenticated user's avatar with a newly uploaded image.
 *
 * This handler runs AFTER upload.single('avatar') (Multer middleware), which
 * saves the image to /uploads/ and populates req.file. This function only
 * updates the avatar_url column in the database.
 *
 * The stored URL is a server-relative path (e.g. /uploads/avatar-xxx.jpg)
 * that the frontend prefixes with the API base URL to build a full link.
 *
 * @param {import('express').Request}      req
 *   req.user.id – ID of the authenticated user.
 *   req.file    – Multer file object: { filename, originalname, size, … }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 * @returns {200} { success, message, data: { id, email, name, role, avatar_url } }
 * @returns {400} No file was included in the request.
 * @returns {404} User not found in the database.
 */
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.status = 400;
      throw error;
    }
    const userId   = req.user.id;
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
    res.json({ success: true, message: 'Avatar uploaded successfully', data: updateResult.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = { listUsers, getMe, uploadAvatar };
