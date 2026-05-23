/**
 * apiPaths.js – API Endpoint Constants
 *
 * Single source of truth for all backend API endpoint paths used by the
 * frontend. Centralising paths means:
 *  - A backend route change only requires an update in one place.
 *  - Components import named constants instead of embedding raw strings,
 *    making typos and drift immediately visible at import time.
 *
 * All paths are relative to BASE_URL and are passed directly to axiosInstance:
 *   axiosInstance.get(API_PATHS.TASKS.LIST)
 *   axiosInstance.delete(API_PATHS.TASKS.DELETE(42))
 *
 * Environment variables:
 *  NEXT_PUBLIC_API_URL – Backend origin. Defaults to 'http://localhost:5000'.
 *                        Set to the deployed server URL in production.
 */

/**
 * Full base URL for all API requests, including the versioned prefix.
 * @type {string}
 */
export const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1`;

/**
 * Structured map of all API endpoint paths.
 * Static paths are plain strings; dynamic paths are arrow functions.
 */
export const API_PATHS = {
  /** Authentication endpoints – no JWT required. */
  AUTH: {
    /** POST – Authenticate and receive a JWT. */
    LOGIN:  '/auth/login',
    /** POST – Register a new user account. */
    SIGNUP: '/auth/signup',
  },

  /** Task management endpoints – JWT required for all. */
  TASKS: {
    /** GET – List tasks for the authenticated user. */
    LIST:   '/tasks',
    /** POST – Create a new task. */
    CREATE: '/tasks',

    /**
     * GET – Fetch a single task by ID.
     * @param {number|string} id – Task primary key.
     * @returns {string} e.g. '/tasks/42'
     */
    BY_ID: (id) => `/tasks/${id}`,

    /**
     * PUT – Full/partial update of a task.
     * @param {number|string} id – Task primary key.
     * @returns {string} e.g. '/tasks/42'
     */
    UPDATE: (id) => `/tasks/${id}`,

    /**
     * DELETE – Permanently remove a task.
     * @param {number|string} id – Task primary key.
     * @returns {string} e.g. '/tasks/42'
     */
    DELETE: (id) => `/tasks/${id}`,

    /**
     * PATCH – Update only the status field.
     * @param {number|string} id – Task primary key.
     * @returns {string} e.g. '/tasks/42/status'
     */
    STATUS: (id) => `/tasks/${id}/status`,

    /**
     * GET / POST – List or create checklist items for a task.
     * @param {number|string} id – Parent task primary key.
     * @returns {string} e.g. '/tasks/42/checklists'
     */
    CHECKLISTS: (id) => `/tasks/${id}/checklists`,

    /**
     * PATCH / DELETE – Update or remove a specific checklist item.
     * @param {number|string} id  – Parent task primary key.
     * @param {number|string} cid – Checklist item primary key.
     * @returns {string} e.g. '/tasks/42/checklists/7'
     */
    CHECKLIST_ITEM: (id, cid) => `/tasks/${id}/checklists/${cid}`,

    /**
     * GET / POST – List or upload attachments for a task.
     * @param {number|string} id – Parent task primary key.
     * @returns {string} e.g. '/tasks/42/attachments'
     */
    ATTACHMENTS: (id) => `/tasks/${id}/attachments`,
  },

  /** User management endpoints – JWT required for all. */
  USERS: {
    /** GET – List all registered users. */
    LIST:   '/users',
    /** GET – Get the authenticated user's own profile. */
    ME:     '/users/me',
    /** POST – Upload / replace the authenticated user's avatar. */
    AVATAR: '/users/me/avatar',
  },
};

export default API_PATHS;
