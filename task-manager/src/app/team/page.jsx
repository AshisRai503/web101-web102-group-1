'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const [usersRes, tasksRes] = await Promise.all([
          axiosInstance.get(API_PATHS.USERS.LIST),
          axiosInstance.get(API_PATHS.TASKS.LIST),
        ]);
        if (mounted) {
          setMembers(Array.isArray(usersRes?.data?.data) ? usersRes.data.data : []);
          setTasks(Array.isArray(tasksRes?.data?.data) ? tasksRes.data.data : []);
        }
      } catch (err) {
        if (mounted) setErrorMessage(getErrorMessage(err, 'Failed to load team members.'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getTaskStats = (userId) => {
    const userTasks = tasks.filter(t => t.assigned_to === userId || t.created_by === userId);
    return {
      total: userTasks.length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      in_progress: userTasks.filter(t => ['in_progress', 'in-progress'].includes(t.status)).length,
      completed: userTasks.filter(t => t.status === 'completed').length,
    };
  };

  const downloadReport = () => {
    const rows = [['Name', 'Email', 'Role', 'Total Tasks', 'Pending', 'In Progress', 'Completed']];
    members.forEach(m => {
      const stats = getTaskStats(m.id);
      rows.push([m.name, m.email, m.role, stats.total, stats.pending, stats.in_progress, stats.completed]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
        {members.length > 0 && (
          <button
            onClick={downloadReport}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            ↓ Download Report
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
              <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          ))}
        </div>
      ) : members.length === 0 && !errorMessage ? (
        <p className="text-sm text-gray-400">No team members found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {members.map((m) => {
            const stats = getTaskStats(m.id);
            return (
              <div key={m.id} className="bg-white rounded-2xl p-6 shadow-sm text-center hover:shadow-md transition-shadow">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-indigo-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3">
                  {(m.name || '?').charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">{m.email}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  m.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
                }`}>{m.role || 'member'}</span>

                {/* Task Stats */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Total Tasks</span>
                    <span className="font-bold text-gray-800">{stats.total}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-orange-500">Pending</span>
                    <span className="font-medium">{stats.pending}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-purple-500">In Progress</span>
                    <span className="font-medium">{stats.in_progress}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-500">Completed</span>
                    <span className="font-medium">{stats.completed}</span>
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
