/**
 * tasks/page.jsx – Admin Task Management Page
 *
 * Provides a full CRUD interface for managing all tasks in the system.
 * Intended for admin users; accessible from the Sidebar "Manage Tasks" link.
 *
 * Features:
 *  - Fetches all tasks from GET /api/v1/tasks on mount
 *  - Filter tabs: All / Pending / In Progress / Completed (with live counts)
 *  - Task card grid with status/priority badges, progress bar, due date
 *  - Inline Edit button opens EditTaskModal overlay (PUT /api/v1/tasks/:id)
 *  - Delete button with confirmation dialog (DELETE /api/v1/tasks/:id)
 *  - CSV report download (all tasks, all fields)
 *  - "Create Task" shortcut navigates to /create-task
 *
 * Route: /tasks  (protected – requires valid JWT in localStorage)
 */
'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a task status string to lowercase hyphenated form.
 * Handles DB values ('in_progress'), display values ('In Progress'),
 * and already-normalised values ('in-progress').
 *
 * @param {string} s – Raw status value from the API or form
 * @returns {string} e.g. 'in-progress', 'pending', 'completed'
 */
const normaliseStatus = (s) => (s || '').toString().toLowerCase().replace(/[_\s]+/g, '-');

/**
 * Format an ISO date string or Date object into YYYY-MM-DD for display.
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

/**
 * Convert a date value to YYYY-MM-DD string suitable for an <input type="date">.
 * Returns '' when the value is falsy or invalid.
 *
 * @param {string|Date|null} value – Raw date value
 * @returns {string} Date string for controlled input or empty string
 */
const dateForInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// Static style maps – map status/priority strings to Tailwind class combos
// ---------------------------------------------------------------------------

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
// TasksPage – main page component
// ---------------------------------------------------------------------------

/**
 * TasksPage component.
 * Admin task management view. Fetches all tasks, provides filter/edit/delete.
 *
 * @returns {JSX.Element}
 */
export default function TasksPage() {
  /** Full list of tasks returned by the API */
  const [tasks, setTasks] = useState([]);
  /** Currently active filter tab: 'all' | 'pending' | 'in-progress' | 'completed' */
  const [filter, setFilter] = useState('all');
  /** True while the initial task fetch is in flight */
  const [loading, setLoading] = useState(true);
  /** Non-empty string when an API error should be shown */
  const [errorMessage, setErrorMessage] = useState('');
  /** Task object currently open in the edit modal, or null */
  const [editingTask, setEditingTask] = useState(null);
  /** ID of the task currently being deleted (used to disable its button) */
  const [deletingId, setDeletingId] = useState(null);

  /**
   * Fetch all tasks from the API and populate state.
   * Called on mount and can be called again to refresh the list.
   *
   * API: GET /api/v1/tasks
   * Response: { success: true, data: Task[] }
   */
  const fetchTasks = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await axiosInstance.get(API_PATHS.TASKS.LIST);
      setTasks(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Failed to load tasks.'));
    } finally {
      setLoading(false);
    }
  };

  /* Fetch tasks once when the component mounts */
  useEffect(() => { fetchTasks(); }, []);

  /**
   * Derived task list filtered by the active tab.
   * Recomputed only when `tasks` or `filter` changes.
   */
  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((t) => normaliseStatus(t.status) === filter);
  }, [tasks, filter]);

  /**
   * Delete a task after user confirmation.
   * Optimistically removes the task from state on success.
   *
   * API: DELETE /api/v1/tasks/:id
   *
   * @param {object} task – Task object to delete (needs .id and .title)
   */
  const handleDelete = async (task) => {
    /* Guard: abort if the user cancels the native confirm dialog */
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${task.title}"?`)) return;
    setDeletingId(task.id);
    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE(task.id));
      /* Remove deleted task from local state without a full refetch */
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Could not delete task.'));
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Generate and trigger download of a CSV report containing all tasks.
   * Uses the Blob + anchor trick for a client-side download with no server round-trip.
   * Quotes every field to handle commas inside title/description safely.
   */
  const downloadReport = () => {
    /* Build rows: header + one row per task */
    const rows = [["Title", "Description", "Status", "Priority", "Due Date", "Created At"]];
    tasks.forEach(t => {
      rows.push([
        t.title,
        t.description || "",
        normaliseStatus(t.status),
        t.priority || "",
        formatDate(t.due_date),
        formatDate(t.created_at),
      ]);
    });
    /* Serialise to CSV string, quote each value */
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    /* Create an in-memory Blob and fire a synthetic anchor click */
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks_report.csv";
    a.click();
    /* Release the object URL to free browser memory */
    URL.revokeObjectURL(url);
  };

  /**
   * Handle a successful save from the EditTaskModal.
   * Replaces the stale task in state with the freshly updated one.
   *
   * @param {object} updatedTask – Updated task returned by the PUT endpoint
   */
  const handleEditSaved = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setEditingTask(null);
  };

  return (
    <DashboardLayout>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Tasks</h1>
          <div className="flex gap-2">
            {/* CSV download button */}
            <button onClick={downloadReport} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">↓ Download Report</button>
          </div>
        </div>
        {/* Navigate to create-task page */}
        <button
          onClick={() => window.location.href = '/create-task'}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          + Create Task
        </button>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────────── */}
      {/* Each pill shows live count of tasks in that status bucket */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'in-progress', 'completed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-colors ${
              filter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            {/* Live count badge */}
            <span className="ml-2 text-xs opacity-70">
              {s === 'all' ? tasks.length : tasks.filter(t => normaliseStatus(t.status) === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* ── Task Cards Grid ──────────────────────────────────────────────── */}
      {loading ? (
        /* Skeleton placeholders while data loads */
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
          <p className="text-sm mt-1">Create a new task to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task) => {
            const status = normaliseStatus(task.status);
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

                {/* Task title and truncated description */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{task.description || 'No description provided.'}</p>
                </div>

                {/* Visual progress bar – status mapped to 0 / 50 / 100 % */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{status === 'completed' ? '100%' : status === 'in-progress' ? '50%' : '0%'}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'in-progress' ? 'bg-purple-500' : 'bg-gray-300'}`}
                      style={{ width: status === 'completed' ? '100%' : status === 'in-progress' ? '50%' : '0%' }}
                    ></div>
                  </div>
                </div>

                {/* Card footer: due date + action buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    <span>Due: </span>
                    <span className="font-medium text-gray-600">{formatDate(task.due_date)}</span>
                  </div>
                  <div className="flex gap-2">
                    {/* Open edit modal */}
                    <button
                      onClick={() => setEditingTask(task)}
                      className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Edit
                    </button>
                    {/* Delete with optimistic UI; button disabled during in-flight request */}
                    <button
                      onClick={() => handleDelete(task)}
                      disabled={deletingId === task.id}
                      className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-600 rounded-md hover:bg-red-200 disabled:opacity-60"
                    >
                      {deletingId === task.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Modal (rendered at document root level via fixed positioning) */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={handleEditSaved}
        />
      )}
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// EditTaskModal – inline edit overlay
// ---------------------------------------------------------------------------

/**
 * EditTaskModal component.
 * A modal dialog that lets admins edit task fields inline.
 * Submits a PUT request with only the changed fields.
 *
 * API: PUT /api/v1/tasks/:id
 * Request body: { title, description, priority, status, due_date? }
 * Response:     { success: true, data: Task }
 *
 * @param {object}   props
 * @param {object}   props.task     – Task object to edit (used as defaultValues)
 * @param {Function} props.onClose  – Callback to dismiss the modal without saving
 * @param {Function} props.onSaved  – Callback invoked with the updated task on success
 * @returns {JSX.Element}
 */
function EditTaskModal({ task, onClose, onSaved }) {
  /** True while the PUT request is in flight */
  const [isSaving, setIsSaving] = useState(false);
  /** Non-empty string when the API returns an error */
  const [apiError, setApiError] = useState('');

  /* Pre-populate form fields from the task being edited */
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title:       task.title || '',
      description: task.description || '',
      priority:    (task.priority || 'medium').toLowerCase(),
      /* Normalise status to hyphenated form for the <select> */
      status:      normaliseStatus(task.status) || 'pending',
      due_date:    dateForInput(task.due_date),
    },
  });

  /**
   * Submit handler – sends validated form data to the API.
   * Only includes due_date in the payload when the field is non-empty
   * to avoid overwriting an existing date with null.
   *
   * @param {object} data – Validated form values from react-hook-form
   */
  const onSubmit = async (data) => {
    setApiError('');
    setIsSaving(true);
    try {
      const payload = {
        title:       data.title,
        description: data.description,
        priority:    data.priority,
        status:      data.status,
      };
      /* Only send due_date when the user has set one */
      if (data.due_date) payload.due_date = data.due_date;

      const res = await axiosInstance.put(API_PATHS.TASKS.UPDATE(task.id), payload);
      /* Merge API response with local payload as fallback */
      onSaved(res?.data?.data || { ...task, ...payload });
    } catch (err) {
      setApiError(getErrorMessage(err, 'Could not update task.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    /* Full-screen backdrop with semi-transparent overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        {/* Modal header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Title – required */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              {...register('title', { required: 'Title is required' })} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Description – optional */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none resize-none"
              {...register('description')} />
          </div>

          {/* Priority & Status selects side by side */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" {...register('status')}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Due date – optional */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none"
              {...register('due_date')} />
          </div>

          {/* API error banner */}
          {apiError && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{apiError}</div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
            <button type="submit" disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
