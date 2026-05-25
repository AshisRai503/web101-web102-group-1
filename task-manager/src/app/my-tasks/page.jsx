/**
 * my-tasks/page.jsx – My Tasks Page (Member View)
 *
 * Shows tasks assigned to or created by the currently logged-in user.
 * Members use this page to track their own workload, tick checklist items,
 * and update task status.
 *
 * Features:
 *  - Reads current user from localStorage on mount
 *  - Fetches all tasks (GET /api/v1/tasks) and filters client-side by
 *    assigned_to === currentUser.id OR created_by === currentUser.id
 *  - For each task, fetches its checklist items so members can tick them off
 *  - Filter tabs: All / Pending / In Progress / Completed (with live counts)
 *  - Task cards with real checklist progress bar based on completed items
 *  - Inline checklist toggle per card – calls PATCH /api/v1/tasks/:id/checklists/:cid
 *    and updates local state optimistically on success
 *  - Inline status <select> per card – calls PATCH /api/v1/tasks/:id/status
 *  - "View Details" link to /tasks/[id] for full task view
 *
 * Route: /my-tasks  (protected – requires valid JWT in localStorage)
 */
'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a task status string to lowercase hyphenated form.
 * Handles 'in_progress' (DB), 'In Progress' (display), 'in-progress' (UI).
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
 * Each card shows a real checklist with tick boxes so members can track
 * their progress without leaving the page.
 *
 * @returns {JSX.Element}
 */
export default function MyTasksPage() {
  /** Tasks belonging to the current user (filtered from full list) */
  const [tasks, setTasks] = useState([]);
  /**
   * Map of taskId → ChecklistItem[].
   * Populated after tasks are fetched; each entry loaded in parallel.
   */
  const [checklists, setChecklists] = useState({});
  /** Active filter tab: 'all' | 'pending' | 'in-progress' | 'completed' */
  const [filter, setFilter] = useState('all');
  /** True while the initial task fetch is in flight */
  const [loading, setLoading] = useState(true);
  /** Non-empty string when the API returns an error */
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * On mount: read the current user from localStorage, fetch all tasks,
   * filter to the user's own tasks, then fetch each task's checklist in
   * parallel so the progress bars are accurate from the start.
   *
   * API calls:
   *   GET /api/v1/tasks                          → Task[]
   *   GET /api/v1/tasks/:id/checklists (×N)      → ChecklistItem[]
   */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(API_PATHS.TASKS.LIST);
        const allTasks = Array.isArray(res?.data?.data) ? res.data.data : [];

        /* Filter to the current user's tasks */
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        const myTasks = currentUser
          ? allTasks.filter(t => t.assigned_to === currentUser.id || t.created_by === currentUser.id)
          : allTasks;

        setTasks(myTasks);

        /* Fetch all checklists in parallel – one request per task */
        if (myTasks.length > 0) {
          const results = await Promise.allSettled(
            myTasks.map(t => axiosInstance.get(API_PATHS.TASKS.CHECKLISTS(t.id)))
          );
          const checklistMap = {};
          myTasks.forEach((t, i) => {
            const result = results[i];
            checklistMap[t.id] = result.status === 'fulfilled' && Array.isArray(result.value?.data?.data)
              ? result.value.data.data
              : [];
          });
          setChecklists(checklistMap);
        }
      } catch (err) {
        setErrorMessage(getErrorMessage(err, 'Failed to load tasks.'));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
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
   * Optimistically updates local state on success.
   *
   * API: PATCH /api/v1/tasks/:id/status
   * Request body: { status: string }
   *
   * @param {number} taskId    – ID of the task to update
   * @param {string} newStatus – New status value (normalised hyphenated form)
   */
  const updateStatus = async (taskId, newStatus) => {
    try {
      await axiosInstance.patch(API_PATHS.TASKS.STATUS(taskId), { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert(getErrorMessage(err, 'Could not update status.'));
    }
  };

  /**
   * Toggle the completed state of a checklist item.
   * Sends the inverted value so the backend always receives the intended state.
   * Updates local checklists map immediately for a responsive UI.
   *
   * API: PATCH /api/v1/tasks/:taskId/checklists/:checklistId
   * Request body: { completed: boolean }
   *
   * @param {number} taskId – Parent task ID
   * @param {object} item   – Checklist item object ({ id, completed, ... })
   */
  const toggleChecklist = async (taskId, item) => {
    /* Optimistic update first so the UI feels instant */
    setChecklists(prev => ({
      ...prev,
      [taskId]: (prev[taskId] || []).map(c =>
        c.id === item.id ? { ...c, completed: !c.completed } : c
      ),
    }));
    try {
      await axiosInstance.patch(
        API_PATHS.TASKS.CHECKLIST_ITEM(taskId, item.id),
        { completed: !item.completed }
      );
    } catch (err) {
      /* Roll back on failure */
      setChecklists(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).map(c =>
          c.id === item.id ? { ...c, completed: item.completed } : c
        ),
      }));
      alert(getErrorMessage(err, 'Could not update checklist item.'));
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>

      {/* ── Filter Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 flex-wrap">
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
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
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
            const status    = normaliseStatus(task.status);
            const priority  = (task.priority || 'medium').toLowerCase();
            const items     = checklists[task.id] || [];
            const doneCount = items.filter(c => c.completed).length;
            const progress  = items.length > 0
              ? Math.round((doneCount / items.length) * 100)
              : null; /* null = no checklist, fall back to status-based bar */

            return (
              <div key={task.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">

                {/* ── Status & Priority badges ──────────────────── */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
                    {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityStyles[priority] || 'bg-gray-100 text-gray-600'}`}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                  </span>
                </div>

                {/* ── Title and truncated description ───────────── */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{task.description || 'No description provided.'}</p>
                </div>

                {/* ── Progress bar ──────────────────────────────── */}
                {/*
                  * When the task has checklist items, show real percentage.
                  * When there are no items, fall back to status-based estimate
                  * so the bar is never meaninglessly empty.
                  */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>
                      {progress !== null
                        ? `${progress}% (${doneCount}/${items.length})`
                        : status === 'completed' ? '100%' : status === 'in-progress' ? '50%' : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        progress === 100 || status === 'completed' ? 'bg-green-500'
                        : progress > 0 || status === 'in-progress' ? 'bg-indigo-500'
                        : 'bg-gray-300'
                      }`}
                      style={{
                        width: progress !== null
                          ? `${progress}%`
                          : status === 'completed' ? '100%' : status === 'in-progress' ? '50%' : '0%'
                      }}
                    />
                  </div>
                </div>

                {/* ── Checklist ─────────────────────────────────── */}
                {items.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Checklist</p>
                    <ul className="space-y-1.5">
                      {items.map(item => (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 cursor-pointer group"
                          onClick={() => toggleChecklist(task.id, item)}
                        >
                          {/* Custom checkbox */}
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            item.completed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'
                          }`}>
                            {item.completed && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {item.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── Footer: due date + status selector + view link ── */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2">
                  <div className="text-xs text-gray-400">
                    Due: <span className="font-medium text-gray-600">{formatDate(task.due_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Inline status dropdown */}
                    <select
                      value={status}
                      onChange={e => updateStatus(task.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-indigo-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    {/* Link to full task detail page */}
                    <Link
                      href={`/tasks/${task.id}`}
                      className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
