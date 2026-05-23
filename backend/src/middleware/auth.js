/**
 * auth.js – JWT Authentication Middleware
 *
 * Exports `authenticateToken`, an Express middleware that protects routes by
 * verifying the JSON Web Token sent in the Authorization header.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 *
 * On success  → decodes the payload, attaches it to req.user, calls next().
 * On failure  → forwards a 401 (missing token) or 403 (invalid/expired) error
 *               to the global error handler.
 *
 * After this middleware runs successfully, downstream handlers can read:
 *   req.user.id    – the authenticated user's database ID
 *   req.user.email – their email address
 *   req.user.role  – 'admin' | 'member'
 */

const jwt = require('jsonwebtoken');

/**
 * Express middleware that authenticates requests via JWT.
 *
 * @param {import('express').Request}      req  – Incoming request.
 * @param {import('express').Response}     res  – Outgoing response (unused directly).
 * @param {import('express').NextFunction} next – Call next(err) to pass errors to
 *   the global error handler, or next() to proceed to the next middleware.
 */
const authenticateToken = (req, res, next) => {
  // Read the Authorization header, e.g. "Bearer eyJhbGci..."
  const authHeader = req.headers['authorization'];

  // Split on the space and take the second segment (the raw token).
  // The `&&` short-circuit means token === undefined if the header is absent.
  const token = authHeader && authHeader.split(' ')[1];

  // If no token was provided at all, reject with 401 Unauthorized.
  if (!token) {
    const error = new Error('Access token required');
    error.status = 401;
    return next(error);
  }

  /**
   * Verify the token's signature and expiry time.
   *
   * JWT_SECRET must match the secret used when the token was signed (login).
   * The hardcoded fallback is for local development only – always override in
   * production via the JWT_SECRET environment variable.
   *
   * @callback verifyCallback
   * @param {Error|null} err  – Non-null if verification fails.
   * @param {object}     user – Decoded payload { id, email, role, iat, exp }.
   */
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (err, user) => {
    if (err) {
      // Token present but invalid (bad signature, expired, malformed, etc.)
      const error = new Error('Invalid or expired token');
      error.status = 403;
      return next(error);
    }

    // Attach the decoded payload so downstream handlers can use req.user.id etc.
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
