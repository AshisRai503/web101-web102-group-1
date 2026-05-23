/**
 * authController.js – Authentication Controller
 *
 * Handles user registration (signup) and login for the Task Manager API.
 * Uses bcryptjs for secure password hashing and jsonwebtoken for signing JWTs.
 *
 * Exported functions:
 *  signup – POST /api/v1/auth/signup
 *  login  – POST /api/v1/auth/login
 *
 * Environment variables:
 *  ADMIN_INVITE_TOKEN – Secret token granting 'admin' role (default: '123456')
 *  JWT_SECRET         – Key used to sign JWTs
 *  JWT_EXPIRE         – Token lifetime, e.g. '7d' (default: '7d')
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

/**
 * Server-side admin invite token.
 * Any signup that includes this value as `inviteToken` gets the 'admin' role.
 * Override in production via the ADMIN_INVITE_TOKEN environment variable.
 */
const ADMIN_INVITE_TOKEN = process.env.ADMIN_INVITE_TOKEN || '123456';

// ─────────────────────────────────────────────
// signup
// ─────────────────────────────────────────────

/**
 * Registers a new user account.
 *
 * Steps:
 *  1. Reject if a user with the same email already exists (409 Conflict).
 *  2. Hash the plaintext password with bcrypt (cost factor 10).
 *  3. Determine role: 'admin' if inviteToken matches, otherwise 'member'.
 *  4. Insert the new user and return the created record (no password hash).
 *
 * Security note: bcrypt's cost factor of 10 provides a good balance between
 * security and performance. Increase it for higher-security environments.
 *
 * @param {import('express').Request}      req  – body: { email, password, name, inviteToken? }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next – Forwards errors to errorHandler.js
 *
 * @returns {201} { success, message, data: { id, email, name, role } }
 * @returns {409} If email is already registered.
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, name, inviteToken } = req.body;

    // Prevent duplicate accounts.
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      const error = new Error('User already exists');
      error.status = 409;
      throw error;
    }

    // Hash password; saltRounds=10 means 2^10 iterations of the bcrypt function.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Grant admin role only when the caller supplies the correct invite token.
    const role = inviteToken === ADMIN_INVITE_TOKEN ? 'admin' : 'member';

    // Insert and immediately return the created row (RETURNING avoids a second query).
    const result = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, role]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data:    result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// login
// ─────────────────────────────────────────────

/**
 * Authenticates a user and issues a JSON Web Token.
 *
 * Steps:
 *  1. Look up the user by email.
 *  2. Compare the submitted password with the stored bcrypt hash.
 *  3. Sign a JWT containing id, email, and role.
 *  4. Return the token and basic user info.
 *
 * Security note: both "user not found" and "wrong password" return the
 * same 401 message to prevent user-enumeration attacks.
 *
 * @param {import('express').Request}      req  – body: { email, password }
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 *
 * @returns {200} { success, message, data: { token, user: { id, email, name, role } } }
 * @returns {401} If credentials are invalid.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch the user record; fail silently with a generic message if not found.
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    const user = userResult.rows[0];

    // bcrypt.compare is constant-time – it prevents timing-based attacks that
    // could reveal whether the email exists even if the password is wrong.
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    // Sign a JWT with a payload containing the fields required by authenticateToken.
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login };
