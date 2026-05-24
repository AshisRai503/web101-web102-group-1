/**
 * authRoutes.js – Authentication Routes
 *
 * Mounts public (unauthenticated) endpoints for user registration and login
 * under the /api/v1/auth prefix defined in server.js.
 *
 * Middleware pipeline for each route:
 *  validate()  → validates the request body against a Joi schema
 *  controller  → executes the business logic and sends the response
 *
 * Endpoints:
 *  POST /api/v1/auth/signup  – Register a new user account
 *  POST /api/v1/auth/login   – Authenticate and receive a JWT
 */

const express = require('express');
const { signup, login }                    = require('../controllers/authController');
const { validate, signupSchema, loginSchema } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/v1/auth/signup
 *
 * Registers a new user.
 *
 * Middleware:
 *  validate(signupSchema) – Ensures email, password, and name are present and
 *    valid; optionally accepts inviteToken for admin role assignment.
 *  signup (controller)    – Hashes the password, inserts the user, and returns
 *    the created user record (id, email, name, role).
 *
 * Request body  : { email, password, name, inviteToken? }
 * Success (201) : { success: true, message, data: { id, email, name, role } }
 * Error   (409) : User already exists.
 */
router.post('/signup', validate(signupSchema, 'body'), signup);

/**
 * POST /api/v1/auth/login
 *
 * Authenticates an existing user and returns a signed JWT.
 *
 * Middleware:
 *  validate(loginSchema) – Ensures email and password are present.
 *  login (controller)    – Verifies credentials and returns a JWT +
 *    basic user info.
 *
 * Request body  : { email, password }
 * Success (200) : { success: true, message, data: { token, user: { id, email, name, role } } }
 * Error   (401) : Invalid email or password.
 */
router.post('/login', validate(loginSchema, 'body'), login);

module.exports = router;
