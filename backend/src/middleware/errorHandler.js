/**
 * errorHandler.js – Global Express Error-Handling Middleware
 *
 * Must be registered LAST in the middleware chain (after all routes).
 * Every call to next(error) anywhere in the application reaches here.
 *
 * Handles three categories of known errors with tailored HTTP responses:
 *  1. Joi validation errors  – produced by the validate() middleware
 *  2. Multer file-upload errors – produced by the upload middleware
 *  3. JWT errors (JsonWebTokenError, TokenExpiredError)
 *
 * All other errors fall through to the generic handler.
 *
 * Every response follows the same JSON envelope:
 *  { success: false, error: { code: number, message: string, details: [] } }
 */

/**
 * Four-argument Express error handler.
 *
 * @param {Error}  err  – Error forwarded via next(err).
 *   Custom properties:
 *     err.status   {number}  HTTP status code (default 500).
 *     err.message  {string}  Human-readable message (default 'Internal server error').
 *     err.details  {Array}   Validation detail objects set by validate() in validation.js.
 *     err.name     {string}  Used to identify Multer / JWT error types.
 * @param {import('express').Request}      req  – Express request (unused).
 * @param {import('express').Response}     res  – Used to send the error response.
 * @param {import('express').NextFunction} next – Required for Express to recognise this
 *   as an error handler; intentionally not called.
 */
const errorHandler = (err, req, res, next) => {
  const status  = err.status  || 500;
  const message = err.message || 'Internal server error';

  // Log with an ISO timestamp so errors can be correlated with access logs.
  console.error(`[${new Date().toISOString()}] ${status} - ${message}`);

  // ── 1. Joi Validation Errors ─────────────────────────────────────────────
  // The validate() middleware attaches an err.details array of { field, message }
  // objects when a request body fails schema validation.
  if (err.details) {
    return res.status(status).json({
      success: false,
      error: { code: status, message, details: err.details },
    });
  }

  // ── 2. Multer File Upload Errors ─────────────────────────────────────────
  // Multer sets err.name = 'MulterError' for issues such as file-size exceeded
  // or unexpected multipart field names. Always respond with 400 Bad Request.
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: { code: 400, message: 'File upload error: ' + err.message, details: [] },
    });
  }

  // ── 3. JWT Errors ────────────────────────────────────────────────────────
  // jsonwebtoken throws typed errors we can detect by name.

  /** Bad signature, malformed token, or wrong secret. */
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({
      success: false,
      error: { code: 403, message: 'Invalid token', details: [] },
    });
  }

  /** Token was valid but has passed its expiry time (exp claim). */
  if (err.name === 'TokenExpiredError') {
    return res.status(403).json({
      success: false,
      error: { code: 403, message: 'Token expired', details: [] },
    });
  }

  // ── 4. Generic / Default Error ───────────────────────────────────────────
  // Handles all remaining errors (database errors, manually thrown errors, etc.)
  // using whatever status and message were set on the error object.
  res.status(status).json({
    success: false,
    error: { code: status, message, details: [] },
  });
};

module.exports = errorHandler;
