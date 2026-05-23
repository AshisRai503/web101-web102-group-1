/**
 * validation.js – Request Body Validation Middleware (Joi)
 *
 * Exports a `validate` factory that wraps a Joi schema into an Express
 * middleware, plus pre-built schemas for the auth endpoints.
 *
 * How it works:
 *  1. Call validate(schema) to create a middleware function.
 *  2. The middleware validates req[property] (default: req.body) against
 *     the Joi schema with abortEarly:false (collect ALL errors) and
 *     stripUnknown:true (remove fields not in the schema).
 *  3. On success  → sanitised value replaces req[property]; next() is called.
 *  4. On failure  → a 400 error with an err.details array is forwarded to
 *     the global error handler (errorHandler.js).
 *
 * Exported schemas:
 *  signupSchema – POST /api/v1/auth/signup
 *  loginSchema  – POST /api/v1/auth/login
 */

const Joi = require('joi');

/**
 * Factory that creates an Express validation middleware for a Joi schema.
 *
 * @param {Joi.ObjectSchema} schema             – Compiled Joi schema.
 * @param {string}           [property='body']  – req property to validate:
 *   'body', 'query', or 'params'.
 *
 * @returns {import('express').RequestHandler} Middleware that validates the
 *   request and calls next() or next(validationError).
 *
 * @example
 *   router.post('/signup', validate(signupSchema), signup);
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly:   false, // Collect every failing field, not just the first
      stripUnknown: true,  // Drop any extra fields the client sent
    });

    if (error) {
      // Map Joi's verbose error objects to a simpler { field, message } shape
      // so the frontend can render per-field error messages easily.
      const errors = error.details.map((detail) => ({
        field:   detail.path.join('.'), // Nested paths become "parent.child"
        message: detail.message,
      }));

      // Attach details to the error object so errorHandler.js includes them.
      const validationError = new Error('Validation failed');
      validationError.status  = 400;
      validationError.details = errors;
      return next(validationError);
    }

    // Replace the raw body with the validated and sanitised value.
    // Joi may have coerced types (e.g. string → number) or stripped unknown fields.
    req[property] = value;
    next();
  };
};

// ─────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────

/**
 * Schema for POST /api/v1/auth/signup.
 *
 * Fields:
 *  email       {string} Required. Valid email format.
 *  password    {string} Required. Minimum 6 characters.
 *  name        {string} Required. User display name.
 *  inviteToken {string} Optional. If it matches the server-side
 *                       ADMIN_INVITE_TOKEN, the account is created as 'admin'.
 */
const signupSchema = Joi.object({
  email:       Joi.string().email().required(),
  password:    Joi.string().min(6).required(),
  name:        Joi.string().required(),
  inviteToken: Joi.string().optional(),
});

/**
 * Schema for POST /api/v1/auth/login.
 *
 * Fields:
 *  email    {string} Required. Valid email format.
 *  password {string} Required. No minimum enforced here (only at signup).
 */
const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { validate, signupSchema, loginSchema };
