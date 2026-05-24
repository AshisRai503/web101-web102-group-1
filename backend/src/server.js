const express = require('express');
const cors    = require('cors');          // ← was installed but never required
const path    = require('path');
require('dotenv').config();

const authRoutes   = require('./routes/authRoutes');
const usersRoutes  = require('./routes/usersRoutes');
const tasksRoutes  = require('./routes/tasksRoutes');
const errorHandler = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ────────────────────────────────────────────────────────────────────
// Must be the very first middleware so every response – including error
// responses from later middleware – carries the correct headers.
//
// Why not `Access-Control-Allow-Origin: *`?
//   The axios interceptor adds `Authorization: Bearer <token>` to every
//   authenticated request.  Browsers treat that as a credentialed cross-origin
//   request and REQUIRE the response to name a specific origin (not `*`) AND
//   include `Access-Control-Allow-Credentials: true`.  Using `*` causes the
//   browser to strip the header and report "No Access-Control-Allow-Origin
//   header is present" even though the header value is literally `*`.
//
// CLIENT_URL env var lets you override the origin in staging/production
// without touching code.  Multiple origins can be comma-separated:
//   CLIENT_URL=https://app.example.com,https://staging.example.com
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin (origin, callback) {
    // Allow server-to-server calls (curl, Postman, mobile) that have no Origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:   ['Content-Type', 'Authorization'],
  credentials:      true,   // sends Access-Control-Allow-Credentials: true
  optionsSuccessStatus: 200, // IE 11 chokes on the default 204
}));

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Static files ────────────────────────────────────────────────────────────
// Serve uploaded avatars and task attachments under the /uploads prefix.
// Frontend accesses them as: ${API_URL}/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── API routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth',  authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/tasks', tasksRoutes);

// ─── 404 catch-all ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 404, message: 'Route not found' } });
});

// ─── Global error handler ────────────────────────────────────────────────────
// Must be last and must have four parameters for Express to treat it as an
// error handler rather than a normal middleware.
app.use(errorHandler);

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
