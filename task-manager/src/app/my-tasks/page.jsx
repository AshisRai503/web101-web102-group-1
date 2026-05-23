/**
 * my-tasks/page.jsx – My Tasks Page (Member View)
 *
 * Shows tasks assigned to or created by the currently logged-in user.
 * Members use this page to track their own workload and update task status.
 *
 * Features:
 *  - Reads current user from localStorage on mount
 *  - Fetches all tasks (GET /api/v1/tasks) and filters client-side by
 *    assigned_to === currentUser.id OR created_by === currentUser.id
 *  - Filter tabs: All / Pending / In Progress / Completed (with live counts)
 *  - Task cards identical in layout to the admin Tasks page
 *  - Inline status <select> per card – calls PATCH /api/v1/tasks/:id/status
 *    and updates local state optimistically on success
 *  - Progress bar: 0% pending / 50% in-progress / 100% completed
 *
 * Route: /my-tasks  (protected – requires valid JWT in localStorage)
 */
'use client';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

// ---------------------------------------------------------------------------
// Utility helpers (same as tasks/page.jsx – kept local to avoid a shared file)
// ---------------------------------------------------------------------------

/**
 * Normalise a task status string to lowercase hyphenated form.
 * Handles DB values ('in_progress'), display values ('In Progress'),
 * and already-normalised values ('in-progress').
 *
 * @param {string} s – Raw status value
 * @returns {string} e.g. 'in-progress', 'pending', 'completed'
 */
const normaliseStatus = (s) => (s || '').toString().toLowerCase().replace(/[_\s]+/g, '-');

/**
 * Format an ISO date string into YYYY-MM-DD for display.
 * Returns '—' when the value is falsy or unparseable.
 *
 * @param {string|Date|null} value – Raw date value
 * @returns {string} Formatted date string or '—'
 */
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
};

/** Priority badge colour classes, keyed by lowercase priority string */
const priorityStyles = {
  high:   'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low:    'bg-green-100 text-green-600',
};

/** Status badge colour classes, keyed by normalised status string */
const statusStyles = {
  completed:    'bg-green-100 text-green-600',
  'in-progress':'bg-purple-100 text-purple-600',
  pending:      'bg-orange-100 text-orange-600',
};

// ---------------------------------------------------------------------------
// MyTasksPage – main component
// ---------------------------------------------------------------------------

/**
 * MyTasksPage component.
 * Member-facing task list filtered to the logged-in user's tasks.
 * Includes an inline status dropdown for quick status updates.
 *
 * @returns {JSX.Element}
 */
export default function MyTasksPage() {
  /** Tasks belonging to the current user (filtered from full list) */
  const [tasks, setTasks] = useState([]);
  /** Active filter tab: 'all' | 'pending' | 'in-progress' | 'completed' */
  const [filter, setFilter] = useState('all');
  /** True while the task fetch is in flight */
  const [loading, setLoading] = useState(true);
  /** Non-empty string when the API returns an error */
  const [errorMessage, setErrorMessage] = useState('');
  /** Current user object read from localStorage – used only for ID matching */
  const [user, setUser] = useState(null);

  /**
   * On mount: read the current user from localStorage and fetch all tasks.
   * The task list is then filtered client-side to tasks where the logged-in
   * user is either the assignee or the creator.
   *
   * Note: localStorage is read twice – once synchronously to set `user` state
   * (for display purposes) and once inside the async function to ensure the
   * filter logic always uses the latest stored value even if React state
   * hasn't updated yet.
   *
   * API: GET /api/v1/tasks
   * Response: { success: true, data: Task[] }
   */
  useEffect(() => {
    /* Synchronously read user for display */
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(API_PATHS.TASKS.LIST);
        const allTasks = Array.isArray(res?.data?.data) ? res.data.data : [];

        /* Re-read from localStorage inside async to guarantee latest value */
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;

        /* Filter: keep tasks assigned to OR created by the current user */
        const myTasks = currentUser
          ? allTasks.filter(t => t.assigned_to === currentUser.id || t.created_by === currentUser.id)
          : allTasks; /* Fallback: show all tasks if user data is missing */

        setTasks(myTasks);
      } catch (err) {
        setErrorMessage(getErrorMessage(err, 'Failed to load tasks.'));
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  /**
   * Derived task list after applying the active filter tab.
   * Recomputed only when `tasks` or `filter` changes.
   */
  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(t => normaliseStatus(t.status) === filter);
  }, [tasks, filter]);

  /**
   * Update a task's status via the dedicated PATCH endpoint.
   * Optimistically updates local state on success so the UI reflects the
   * change immediately without a full refetch.
   *
   * API: PATCH /api/v1/tasks/:id/status
   * Request body: { status: string }  (e.g. 'in-progress')
   * Response:     { success: true, data: Task }
   *
   * @param {number} taskId   – ID of the task to update
   * @param {string} newStatus – New status value (normalised hyphenated form)
   */
  const updateStatus = async (taskId, newStatus) => {
    try {
      await axiosInstance.patch(API_PATHS.TASKS.STATUS(taskId), { status: newStatus });
      /* Merge updated status into local state */
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert(getErrorMessage(err, 'Could not update status.'));
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>

      {/* ── Filter Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'in-progress', 'completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-colors ${
              filter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            {/* Live count for each bucket */}
            <span className="ml-2 text-xs opacity-70">
              {s === 'all' ? tasks.length : tasks.filter(t => normaliseStatus(t.status) === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{errorMessage}</div>
      )}

      {/* ── Task Cards Grid ──────────────────────────────────────────── */}
      {loading ? (
        /* Skeleton placeholders while tasks are loading */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm mt-1">You have no tasks assigned to you yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task) => {
            const status   = normaliseStatus(task.status);
            const priority = (task.priority || 'medium').toLowerCase();
            return (
              <div key={task.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Status & Priority badges */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
                    {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityStyles[priority] || 'bg-gray-100 text-gray-600'}`}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                  </span>
                </div>

                {/* Title and truncated description */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{task.description || 'No description provided.'}</p>
                </div>

                {/* Progress bar: status mapped to fixed percentages */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{status === 'completed' ? '100%' : status === 'in-progress' ? '50%' : '0%'}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'in-progress' ? 'bg-purple-500' : 'bg-gray-300'}`}
                      style={{ width: status === 'completed' ? '100%' : status === 'in-progress' ? '50%' : '0%' }}></div>
                  </div>
                </div>

                {/* Footer: due date + inline status selector */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    Due: <span className="font-medium text-gray-600">{formatDate(task.due_date)}</span>
                  </div>
                  {/* Inline status dropdown – calls PATCH on change */}
                  <select
                    value={status}
                    onChange={e => updateStatus(task.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-indigo-500">
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
