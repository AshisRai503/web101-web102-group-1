/**
 * create-task/page.jsx – Create New Task Page
 *
 * Multi-section form that creates a task in three sequential API steps:
 *  1. POST /api/v1/tasks              → creates the core task record
 *  2. POST /api/v1/tasks/:id/checklists (per item, in parallel)
 *  3. POST /api/v1/tasks/:id/attachments (per file, multipart, in parallel)
 *
 * Features:
 *  - React Hook Form for title/description/priority/status/due_date validation
 *  - Member assignment – fetches all users, renders toggle pills (multi-select);
 *    all selected IDs sent as assigned_members[] to backend task_assignments table
 *  - Checklist builder – add items via input + Enter key or Add button
 *  - File attachment picker – multiple files, removable list
 *  - Success banner + 800ms redirect to /tasks on completion
 *
 * Route: /create-task  (protected – requires valid JWT in localStorage)
 */
'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

/**
 * CreateTaskPage component.
 * Renders the full task creation form with member assignment, checklist,
 * and file attachment support.
 *
 * @returns {JSX.Element}
 */
export default function CreateTaskPage() {
  const router = useRouter();

  /** True while any of the three API steps are in flight */
  const [isLoading, setIsLoading] = useState(false);
  /** Non-empty string when the API returns an error to display */
  const [apiError, setApiError] = useState('');
  /** Non-empty string shown in a green banner on successful creation */
  const [successMessage, setSuccessMessage] = useState('');
  /** List of all users fetched from GET /api/v1/users */
  const [users, setUsers] = useState([]);
  /** Array of user IDs currently toggled as assignees (UI supports multi-select, API uses first) */
  const [selectedMembers, setSelectedMembers] = useState([]);
  /** Checklist items pending creation: [{ id, title, completed }] */
  const [checklistItems, setChecklistItems] = useState([]);
  /** Current value of the checklist text input */
  const [checklistInput, setChecklistInput] = useState('');
  /** Array of File objects chosen via the file picker */
  const [attachments, setAttachments] = useState([]);

  /* react-hook-form setup with sensible defaults */
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: { title: '', description: '', priority: 'medium', status: 'pending', due_date: '' },
  });

  /**
   * Fetch all team members for the assignment section.
   * Runs once on mount; errors are logged but not surfaced to the user
   * (member assignment is optional).
   *
   * API: GET /api/v1/users
   * Response: { success: true, data: User[] }
   */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.USERS.LIST);
        setUsers(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, []);

  /**
   * Toggle a user's assignment status.
   * If the user is already selected, deselect; otherwise add to the list.
   * All selected IDs are sent as `assigned_members` to the backend, which
   * inserts one row per member into the task_assignments join table.
   *
   * @param {number} userId – ID of the user to toggle
   */
  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  /**
   * Append a new item to the pending checklist.
   * Trims whitespace and ignores empty input.
   * Uses Date.now() as a temporary local key (not the DB id).
   */
  const addChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setChecklistItems(prev => [
      ...prev,
      { id: Date.now(), title: checklistInput.trim(), completed: false },
    ]);
    setChecklistInput('');
  };

  /**
   * Remove a pending checklist item by its local id.
   *
   * @param {number} id – Local timestamp id of the item to remove
   */
  const removeChecklistItem = (id) => {
    setChecklistItems(prev => prev.filter(item => item.id !== id));
  };

  /**
   * Append files from the file picker to the pending attachments list.
   * Supports multiple file selection; each new batch is appended, not replaced.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e – File input change event
   */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  /**
   * Remove a pending attachment by its index in the array.
   *
   * @param {number} index – Zero-based index of the file to remove
   */
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Form submit handler – performs the three-step creation flow.
   *
   * Step 1: POST /api/v1/tasks
   *   Body: { title, description, priority, status, assigned_to, due_date? }
   *   Response: { success: true, data: { id, ... } }
   *
   * Step 2 (parallel): POST /api/v1/tasks/:id/checklists  (one per item)
   *   Body: { title }
   *
   * Step 3 (parallel): POST /api/v1/tasks/:id/attachments  (one per file)
   *   Body: FormData with key 'file'
   *   Header: Content-Type: multipart/form-data
   *
   * On success: resets all form state, shows banner, redirects after 800ms.
   *
   * @param {object} data – Validated form values from react-hook-form
   */
  const onSubmit = async (data) => {
    setApiError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      /* ── Step 1: Create the core task ─────────────────────────────── */
      const payload = {
        title:            data.title,
        description:      data.description,
        priority:         data.priority,
        status:           data.status,
        /* Legacy single-assignee field – kept for backward compatibility */
        assigned_to:      selectedMembers.length > 0 ? selectedMembers[0] : null,
        /* All selected members written to task_assignments on the backend */
        assigned_members: selectedMembers,
      };
      /* Only include due_date if the user filled it in */
      if (data.due_date) payload.due_date = data.due_date;

      const res = await axiosInstance.post(API_PATHS.TASKS.CREATE, payload);
      const taskId = res?.data?.data?.id;

      /* ── Step 2: Create checklist items in parallel ────────────────── */
      if (taskId && checklistItems.length > 0) {
        await Promise.all(checklistItems.map(item =>
          axiosInstance.post(API_PATHS.TASKS.CHECKLISTS(taskId), { title: item.title })
        ));
      }

      /* ── Step 3: Upload attachments in parallel ─────────────────────── */
      if (taskId && attachments.length > 0) {
        await Promise.all(attachments.map(file => {
          const formData = new FormData();
          formData.append('file', file); /* key must match upload.single('file') in backend */
          return axiosInstance.post(API_PATHS.TASKS.ATTACHMENTS(taskId), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }));
      }

      /* ── Success: reset state and redirect ──────────────────────────── */
      setSuccessMessage('Task created successfully! Redirecting...');
      reset();
      setSelectedMembers([]);
      setChecklistItems([]);
      setAttachments([]);
      setTimeout(() => router.push('/tasks'), 800);
    } catch (err) {
      setApiError(getErrorMessage(err, 'Could not create task.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h1>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ── Row 1: Title & Due Date ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
              <input type="text" placeholder="Enter task title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500"
                {...register('due_date')} />
            </div>
          </div>

          {/* ── Description ──────────────────────────────────────────── */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea placeholder="Task description..." rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none resize-none"
              {...register('description')} />
          </div>

          {/* ── Row 2: Priority & Status ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" {...register('status')}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* ── Assign Members ───────────────────────────────────────── */}
          {/* Toggle pill buttons; selected members highlighted in indigo */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Members</label>
            {users.length === 0 ? (
              <p className="text-xs text-gray-400">No members found</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {users.map(user => (
                  <button key={user.id} type="button"
                    onClick={() => toggleMember(user.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedMembers.includes(user.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}>
                    {user.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Checklist Builder ────────────────────────────────────── */}
          {/* Items are created via separate API calls after the task is created */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">To-Do Checklist</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={checklistInput}
                onChange={e => setChecklistInput(e.target.value)}
                /* Allow adding items with the Enter key without submitting the form */
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                placeholder="Add checklist item..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" />
              <button type="button" onClick={addChecklistItem}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                Add
              </button>
            </div>
            {checklistItems.length > 0 && (
              <ul className="space-y-1">
                {checklistItems.map(item => (
                  <li key={item.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                    <span className="text-sm flex-1">{item.title}</span>
                    <button type="button" onClick={() => removeChecklistItem(item.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── File Attachments ─────────────────────────────────────── */}
          {/* Files are uploaded as multipart/form-data after the task is created */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">File Attachments</label>
            <input type="file" multiple onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((file, index) => (
                  <li key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(index)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Feedback Banners ─────────────────────────────────────── */}
          {apiError && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{apiError}</div>
          )}
          {successMessage && (
            <div className="mb-4 px-3 py-2 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">{successMessage}</div>
          )}

          {/* ── Submit ───────────────────────────────────────────────── */}
          <button type="submit" disabled={isLoading}
            className="px-8 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition disabled:opacity-60">
            {isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
