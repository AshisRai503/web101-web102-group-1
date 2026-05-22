'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

const normaliseStatus = (s) => (s || '').toString().toLowerCase().replace(/[_\s]+/g, '-');
const formatDate = (value) => { if (!value) return '—'; const d = new Date(value); if (Number.isNaN(d.getTime())) return value; return d.toISOString().slice(0, 10); };
const dateForInput = (value) => { if (!value) return ''; const d = new Date(value); if (Number.isNaN(d.getTime())) return ''; return d.toISOString().slice(0, 10); };

const priorityStyles = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low: 'bg-green-100 text-green-600',
};
const statusStyles = {
  completed: 'bg-green-100 text-green-600',
  'in-progress': 'bg-purple-100 text-purple-600',
  pending: 'bg-orange-100 text-orange-600',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  useEffect(() => { fetchTasks(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((t) => normaliseStatus(t.status) === filter);
  }, [tasks, filter]);

  const handleDelete = async (task) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${task.title}"?`)) return;
    setDeletingId(task.id);
    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE(task.id));
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Could not delete task.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSaved = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setEditingTask(null);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Tasks</h1>
        <button
          onClick={() => window.location.href = '/create-task'}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          + Create Task
        </button>
      </div>

      {/* Filter Tabs */}
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
            <span className="ml-2 text-xs opacity-70">
              {s === 'all' ? tasks.length : tasks.filter(t => normaliseStatus(t.status) === s).length}
            </span>
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Task Cards Grid */}
      {loading ? (
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
                {/* Tags */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
                    {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityStyles[priority] || 'bg-gray-100 text-gray-600'}`}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{task.description || 'No description provided.'}</p>
                </div>

                {/* Progress Bar */}
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

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    <span>Due: </span>
                    <span className="font-medium text-gray-600">{formatDate(task.due_date)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Edit
                    </button>
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

function EditTaskModal({ task, onClose, onSaved }) {
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: task.title || '',
      description: task.description || '',
      priority: (task.priority || 'medium').toLowerCase(),
      status: normaliseStatus(task.status) || 'pending',
      due_date: dateForInput(task.due_date),
    },
  });

  const onSubmit = async (data) => {
    setApiError('');
    setIsSaving(true);
    try {
      const payload = { title: data.title, description: data.description, priority: data.priority, status: data.status };
      if (data.due_date) payload.due_date = data.due_date;
      const res = await axiosInstance.put(API_PATHS.TASKS.UPDATE(task.id), payload);
      onSaved(res?.data?.data || { ...task, ...payload });
    } catch (err) {
      setApiError(getErrorMessage(err, 'Could not update task.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              {...register('title', { required: 'Title is required' })} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none resize-none" {...register('description')} />
          </div>
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" {...register('due_date')} />
          </div>
          {apiError && <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{apiError}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
