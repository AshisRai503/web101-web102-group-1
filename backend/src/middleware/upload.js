/**
 * upload.js – Multer File Upload Middleware
 *
 * Configures and exports two Multer upload handlers:
 *
 *  upload         – Avatar images for user profiles.
 *                   Destination : /backend/uploads/
 *                   File filter : images only (JPEG, PNG, GIF, WebP)
 *                   Size limit  : 5 MB
 *
 *  uploadTaskFile – Arbitrary file attachments for tasks.
 *                   Destination : /backend/uploads/tasks/
 *                   File filter : any type accepted
 *                   Size limit  : 10 MB
 *                   Pre-configured as a single-file middleware for the
 *                   multipart field named 'file'.
 *
 * Both handlers use disk storage with collision-safe filenames formed by
 * combining a Unix timestamp with a large random integer.
 *
 * The target directories are created at module-load time if they don't exist,
 * so the application starts cleanly without manual setup steps.
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ─────────────────────────────────────────────
// Directory bootstrap
// ─────────────────────────────────────────────

/** Root directory for all uploaded files. */
const uploadsDir     = path.join(__dirname, '../../uploads');

/** Sub-directory specifically for task attachment files. */
const taskUploadsDir = path.join(__dirname, '../../uploads/tasks');

// Create directories synchronously at startup; fs.existsSync prevents EEXIST.
if (!fs.existsSync(uploadsDir))     fs.mkdirSync(uploadsDir);
if (!fs.existsSync(taskUploadsDir)) fs.mkdirSync(taskUploadsDir);

// ─────────────────────────────────────────────
// Storage engines
// ─────────────────────────────────────────────

/**
 * Disk storage for user avatar uploads.
 *
 * Generates filenames in the format: avatar-<timestamp>-<random>.<ext>
 * e.g. avatar-1718000000000-432156789.jpg
 */
const avatarStorage = multer.diskStorage({
  /**
   * Sets the destination folder for avatar uploads.
   * @param {import('express').Request} req  – Incoming request.
   * @param {Express.Multer.File}       file – File being uploaded.
   * @param {Function}                  cb   – Callback: cb(err, destinationPath).
   */
  destination: (req, file, cb) => { cb(null, uploadsDir); },

  /**
   * Generates a unique filename for the avatar.
   * @param {import('express').Request} req  – Incoming request.
   * @param {Express.Multer.File}       file – File being uploaded.
   * @param {Function}                  cb   – Callback: cb(err, filename).
   */
  filename: (req, file, cb) => {
    // Timestamp + large random number ensures uniqueness under concurrency.
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  },
});

/**
 * Disk storage for task attachment uploads.
 *
 * Generates filenames in the format: task-<timestamp>-<random>.<ext>
 */
const taskStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, taskUploadsDir); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'task-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// ─────────────────────────────────────────────
// File filters
// ─────────────────────────────────────────────

/**
 * Restricts avatar uploads to common image MIME types.
 * Rejects anything that is not JPEG, PNG, GIF, or WebP.
 *
 * @param {import('express').Request} req  – Incoming request.
 * @param {Express.Multer.File}       file – File being evaluated.
 * @param {Function}                  cb   – Callback: cb(err, acceptFile: boolean).
 */
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);  // Accept the file
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'));
  }
};

/**
 * Accepts all file types for task attachments (no MIME restriction).
 *
 * @param {import('express').Request} req  – Incoming request.
 * @param {Express.Multer.File}       file – File being evaluated.
 * @param {Function}                  cb   – Callback: cb(err, acceptFile: boolean).
 */
const anyFileFilter = (req, file, cb) => { cb(null, true); };

// ─────────────────────────────────────────────
// Multer instances
// ─────────────────────────────────────────────

/**
 * Avatar upload handler.
 * Used as: upload.single('avatar')
 *
 * @example
 *   router.post('/me/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);
 */
const upload = multer({
  storage:    avatarStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Task attachment upload handler – pre-configured as single-file middleware.
 * Expects the multipart field to be named 'file'.
 *
 * @example
 *   router.post('/:id/attachments', uploadTaskFile, createAttachment);
 */
const uploadTaskFile = multer({
  storage:    taskStorage,
  fileFilter: anyFileFilter,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('file');

module.exports = { upload, uploadTaskFile };
