'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import axiosInstance from '../../../lib/axios';
import { API_PATHS } from '../../../lib/apiPaths';
import getErrorMessage from '../../../lib/getErrorMessage';

const normaliseStatus = (s) => (s || '').toString().toLowerCase().replace(/[_\s]+/g, '-');
const formatDate = (value) => { if (!value) return '—'; const d = new Date(value); if (Number.isNaN(d.getTime())) return value; return d.toISOString().slice(0, 10); };

const priorityStyles = { high: 'bg-red-100 text-red-600', medium: 'bg-amber-100 text-amber-600', low: 'bg-green-100 text-green-600' };
const statusStyles = { completed: 'bg-green-100 text-green-600', 'in-progress': 'bg-purple-100 text-purple-600', pending: 'bg-orange-100 text-orange-600' };

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [taskRes, checkRes, attachRes] = await Promise.all([
          axiosInstance.get(API_PATHS.TASKS.BY_ID(id)),
          axiosInstance.get(API_PATHS.TASKS.CHECKLISTS(id)),
          axiosInstance.get(API_PATHS.TASKS.ATTACHMENTS(id)),
        ]);
        setTask(taskRes?.data?.data);
        setChecklists(Array.isArray(checkRes?.data?.data) ? checkRes.data.data : []);
        setAttachments(Array.isArray(attachRes?.data?.data) ? attachRes.data.data : []);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load task.'));
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAll();
  }, [id]);

  const toggleChecklist = async (item) => {
    try {
      await axiosInstance.patch(API_PATHS.TASKS.CHECKLIST_ITEM(id, item.id), { completed: !item.completed });
      setChecklists(prev => prev.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c));
    } catch (err) { alert(getErrorMessage(err, 'Could not update checklist.')); }
  };

  const updateStatus = async (newStatus) => {
    try {
      await axiosInstance.patch(API_PATHS.TASKS.STATUS(id), { status: newStatus });
      setTask(prev => ({ ...prev, status: newStatus }));
    } catch (err) { alert(getErrorMessage(err, 'Could not update status.')); }
  };

  const completedCount = checklists.filter(c => c.completed).length;
  const progress = checklists.length > 0 ? Math.round((completedCount / checklists.length) * 100) : 0;

  if (loading) return <DashboardLayout><div className="text-sm text-gray-400 mt-10 text-center">Loading task...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="text-sm text-red-500 mt-10 text-center">{error}</div></DashboardLayout>;
  if (!task) return null;

  const status = normaliseStatus(task.status);
  const priority = (task.priority || 'medium').toLowerCase();

  return (
    <DashboardLayout>
      <button onClick={() => router.back()} className="mb-6 text-sm text-indigo-600 hover:underline flex items-center gap-1">
        ← Back
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex gap-2 mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
                {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityStyles[priority] || 'bg-gray-100 text-gray-600'}`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
            <p className="text-sm text-gray-500 leading-relaxed">{task.description || 'No description provided.'}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Due Date</span><p className="font-medium text-gray-800 mt-1">{formatDate(task.due_date)}</p></div>
              <div><span className="text-gray-400">Created</span><p className="font-medium text-gray-800 mt-1">{formatDate(task.created_at)}</p></div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
              <select value={status} onChange={e => updateStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500">
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Checklist</h2>
              <span className="text-xs text-gray-400">{completedCount}/{checklists.length} completed</span>
            </div>
            {checklists.length > 0 && (
              <div className="mb-4">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{progress}% complete</p>
              </div>
            )}
            {checklists.length === 0 ? <p className="text-xs text-gray-400">No checklist items.</p> : (
              <ul className="space-y-2">
                {checklists.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => toggleChecklist(item)}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${item.completed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                      {item.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Attachments ({attachments.length})</h2>
            {attachments.length === 0 ? <p className="text-xs text-gray-400">No attachments.</p> : (
              <ul className="space-y-2">
                {attachments.map(att => (
                  <li key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">📎</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{att.file_name}</p>
                      <p className="text-xs text-gray-400">{formatDate(att.uploaded_at)}</p>
                    </div>
                    <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${att.file_url}`}
                      target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">Download</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Task Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Priority</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityStyles[priority]}`}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyles[status]}`}>{status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Due Date</span><span className="font-medium">{formatDate(task.due_date)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Checklists</span><span className="font-medium">{completedCount}/{checklists.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Attachments</span><span className="font-medium">{attachments.length}</span></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
