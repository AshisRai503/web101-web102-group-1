/**
 * usersRoutes.js – User Management Routes
 *
 * Mounts user-related endpoints under the /api/v1/users prefix (set in server.js).
 * All routes require a valid JWT – authenticateToken is applied per-route.
 *
 * Endpoints:
 *  GET  /api/v1/users           – List all registered users
 *  GET  /api/v1/users/me        – Get the authenticated user's profile
 *  POST /api/v1/users/me/avatar – Upload / replace the user's avatar image
 */

const express = require('express');
const { listUsers, getMe, uploadAvatar } = require('../controllers/usersController');
const { authenticateToken }              = require('../middleware/auth');
const { upload }                         = require('../middleware/upload');

const router = express.Router();

/**
 * GET /api/v1/users
 *
 * Returns all users (id, email, name, role, avatar_url, created_at),
 * ordered by creation date descending.
 * Useful for the Team page and the "Assign to" dropdown when creating tasks.
 *
 * Access   : Authenticated users only.
 * Response : { success, message, data: User[] }
 */
router.get('/', authenticateToken, listUsers);

/**
 * GET /api/v1/users/me
 *
 * Returns the full profile of the currently authenticated user.
 * Identity is taken from req.user.id (decoded from the JWT).
 *
 * Access   : Authenticated users only.
 * Response : { success, data: User }
 * Error    : 404 if the token's user ID no longer exists in the DB.
 */
router.get('/me', authenticateToken, getMe);

/**
 * POST /api/v1/users/me/avatar
 *
 * Uploads a new avatar image for the authenticated user.
 *
 * Middleware pipeline:
 *  1. authenticateToken       – Validates the JWT and populates req.user.
 *  2. upload.single('avatar') – Multer middleware: accepts a single image in
 *     the 'avatar' multipart field, saves it to /uploads/, fills req.file.
 *  3. uploadAvatar            – Updates avatar_url in the DB and returns the
 *     updated user record.
 *
 * Request  : multipart/form-data with an image in the 'avatar' field.
 * Response : { success, message, data: { id, email, name, role, avatar_url } }
 */
router.post('/me/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);

module.exports = router;
