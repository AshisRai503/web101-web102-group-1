// Central place for all backend API endpoint constants.
// Keep paths relative — the base URL is configured in src/lib/axios.js.
export const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1`;
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
    STATUS: (id) => `/tasks/${id}/status`,
    CHECKLISTS: (id) => `/tasks/${id}/checklists`,
    CHECKLIST_ITEM: (id, cid) => `/tasks/${id}/checklists/${cid}`,
    ATTACHMENTS: (id) => `/tasks/${id}/attachments`,
  },
  USERS: {
    LIST: '/users',
    ME: '/users/me',
    AVATAR: '/users/me/avatar',
  },
};
export default API_PATHS;
