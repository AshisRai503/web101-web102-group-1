'use client';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

const normaliseStatus = (s) => (s || '').toString().toLowerCase().replace(/[_\s]+/g, '-');
const formatDate = (value) => { if (!value) return '—'; const d = new Date(value); if (Number.isNaN(d.getTime())) return value; return d.toISOString().slice(0, 10); };

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

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(API_PATHS.TASKS.LIST);
        const allTasks = Array.isArray(res?.data?.data) ? res.data.data : [];
        const stored = localStorage.getItem('user');
        const currentUser = stored ? JSON.parse(stored) : null;
        const myTasks = currentUser
          ? allTasks.filter(t => t.assigned_to === currentUser.id || t.created_by === currentUser.id)
          : allTasks;
        setTasks(myTasks);
      } catch (err) {
        setErrorMessage(getErrorMessage(err, 'Failed to load tasks.'));
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(t => normaliseStatus(t.status) === filter);
  }, [tasks, filter]);

  const updateStatus = async (taskId, newStatus) => {
    try {
      await axiosInstance.patch(API_PATHS.TASKS.STATUS(taskId), { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert(getErrorMessage(err, 'Could not update status.'));
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'in-progress', 'completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-colors ${
              filter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-2 text-xs opacity-70">
              {s === 'all' ? tasks.length : tasks.filter(t => normaliseStatus(t.status) === s).length}
            </span>
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{errorMessage}</div>
      )}

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
          <p className="text-sm mt-1">You have no tasks assigned to you yet</p>
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
                    <div className={`h-1.5 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'in-progress' ? 'bg-purple-500' : 'bg-gray-300'}`}
                      style={{ width: status === 'completed' ? '100%' : status === 'in-progress' ? '50%' : '0%' }}></div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    Due: <span className="font-medium text-gray-600">{formatDate(task.due_date)}</span>
                  </div>
                  {/* Update Status */}
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
