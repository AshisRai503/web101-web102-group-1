/**
 * server.js
 *
 * Entry point for the Task Manager Express backend server.
 *
 * Responsibilities:
 *  - Load environment variables from .env via dotenv
 *  - Register global middleware: CORS, JSON body parser, static file serving
 *  - Mount versioned API route modules under /api/v1
 *  - Register the catch-all 404 handler for unmatched routes
 *  - Register the global error-handling middleware (must be last)
 *  - Start the HTTP server on the configured PORT
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config(); // Load .env into process.env before anything else

// --- Route modules ---
const authRoutes  = require('./routes/authRoutes');
const usersRoutes = require('./routes/usersRoutes');
const tasksRoutes = require('./routes/tasksRoutes');

// --- Global error handler ---
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─────────────────────────────────────────────
// Global Middleware
// ─────────────────────────────────────────────

/**
 * CORS – allow cross-origin requests only from the Next.js dev server.
 * Update the `origin` value (or read from env) when deploying to production.
 */
app.use(cors({ origin: 'http://localhost:3000' }));

/** Parse incoming request bodies as JSON and expose them on req.body. */
app.use(express.json());

/**
 * Serve the /backend/uploads directory as static files so the frontend
 * can reference uploaded images and attachments via a direct URL,
 * e.g. GET /uploads/tasks/task-123.pdf
 */
app.use(express.static(path.join(__dirname, '../uploads')));

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

/**
 * Health-check endpoint.
 * Route:  GET /api/v1/health
 * Access: Public
 * Returns a simple JSON response confirming the server is alive.
 */
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Backend is running' });
});

/**
 * Authentication routes – signup and login.
 * All paths in authRoutes are prefixed with /api/v1/auth
 */
app.use('/api/v1/auth', authRoutes);

/**
 * User management routes – list users, get profile, upload avatar.
 * All paths in usersRoutes are prefixed with /api/v1/users
 */
app.use('/api/v1/users', usersRoutes);

/**
 * Task management routes – CRUD, status updates, checklists, attachments.
 * All paths in tasksRoutes are prefixed with /api/v1/tasks
 */
app.use('/api/v1/tasks', tasksRoutes);

// ─────────────────────────────────────────────
// Fallback Handlers
// ─────────────────────────────────────────────

/**
 * 404 handler – catches any request that did not match a defined route.
 * Returns a consistent JSON error so API clients don't receive HTML.
 */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

/**
 * Global error handler – must be registered LAST (four-argument signature
 * tells Express this is an error handler, not regular middleware).
 * Delegates formatting to errorHandler.js.
 */
app.use(errorHandler);

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

/** Default port is 5000 if PORT is not set in the environment. */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
