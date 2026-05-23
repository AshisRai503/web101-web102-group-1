/**
 * axios.js – Centralised Axios HTTP Client
 *
 * Creates and exports a single, pre-configured Axios instance used by every
 * page and component in the application. Centralising the instance means the
 * base URL, timeout, and auth headers only need to be configured once.
 *
 * Features:
 *  - Base URL from NEXT_PUBLIC_API_URL env var (falls back to localhost:5000)
 *  - 15-second request timeout
 *  - Request interceptor: attaches the JWT from localStorage as a Bearer token
 *  - Response interceptor: handles 401 globally by clearing auth state and
 *    redirecting the user to /login
 *
 * All API calls in the app should import this instance, not bare `axios`.
 */

import axios from 'axios';
import { BASE_URL } from './apiPaths';

/**
 * Shared Axios instance with pre-configured base URL and headers.
 */
const axiosInstance = axios.create({
  baseURL: BASE_URL,   // e.g. http://localhost:5000/api/v1
  timeout: 15000,      // Abort requests that take longer than 15 s
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

// ─────────────────────────────────────────────
// Request interceptor – attach JWT
// ─────────────────────────────────────────────

/**
 * Reads the JWT from localStorage and adds it to every outgoing request as
 * an Authorization: Bearer <token> header.
 *
 * The `typeof window !== 'undefined'` guard prevents crashes during
 * server-side rendering (Next.js runs component code on the server where
 * localStorage does not exist).
 *
 * @param {import('axios').InternalAxiosRequestConfig} config
 * @returns {import('axios').InternalAxiosRequestConfig} Modified config.
 */
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// Response interceptor – global error handling
// ─────────────────────────────────────────────

/**
 * Passes successful responses through unchanged.
 * For error responses, handles 401 Unauthorized globally:
 *  - Clears stored token and user from localStorage.
 *  - Redirects to /login (includes a guard to avoid an infinite redirect loop
 *    if the 401 originates from the login page itself).
 *
 * All other errors are re-thrown so per-component catch blocks can handle them.
 *
 * @param {import('axios').AxiosResponse} response – Passed through on success.
 * @param {import('axios').AxiosError}    error    – Handled on failure.
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Guard: avoid redirect loop if already on the login page.
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
