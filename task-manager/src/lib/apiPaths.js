// Central place for all backend API endpoint constants.
// Keep paths relative — the base URL is configured in src/lib/axios.js.

export const BASE_URL = 'http://localhost:5000/api/v1';

export const API_PATHS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
  },
  TASKS: {
    LIST: '/tasks',
    CREATE: '/tasks',
    BY_ID: (id) => `/tasks/${id}`,
    UPDATE: (id) => `/tasks/${id}`,
    DELETE: (id) => `/tasks/${id}`,
  },
  USERS: {
    LIST: '/users',
    ME: '/users/me',
  },
};

export default API_PATHS;
