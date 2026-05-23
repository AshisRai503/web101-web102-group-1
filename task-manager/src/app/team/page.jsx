/**
 * team/page.jsx – Team Members Page
 *
 * Displays all registered users as profile cards with per-user task statistics.
 * Fetches users and tasks in parallel to compute stats client-side.
 *
 * Features:
 *  - Parallel fetch: GET /api/v1/users + GET /api/v1/tasks
 *  - Per-member stats: total, pending, in-progress, completed task counts
 *    (counts tasks where assigned_to OR created_by matches the member's id)
 *  - Avatar initial letter generated from the user's name
 *  - Role badge: solid indigo for admin, light indigo for member
 *  - CSV report download (one row per member with all stats)
 *  - Skeleton loading cards while data is in flight
 *  - Mounted flag prevents state updates on unmounted component
 *
 * Route: /team  (protected – requires valid JWT in localStorage)
 */
'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

/**
 * TeamPage component.
 * Renders team member cards with task statistics and a CSV download button.
 *
 * @returns {JSX.Element}
 */
export default function TeamPage() {
  /** Array of user objects returned by GET /api/v1/users */
  const [members, setMembers] = useState([]);
  /** Array of all task objects – used to compute per-member statistics */
  const [tasks, setTasks] = useState([]);
  /** True while the parallel data fetch is in flight */
  const [loading, setLoading] = useState(true);
  /** Non-empty string when either API call fails */
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Fetch users and tasks in parallel on mount.
   * Uses a `mounted` flag to avoid calling setState after the component
   * unmounts (e.g. if the user navigates away before the fetch completes).
   *
   * API calls:
   *   GET /api/v1/users  → { success: true, data: User[] }
   *   GET /api/v1/tasks  → { success: true, data: Task[] }
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        /* Fire both requests simultaneously; await both to settle */
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
    /* Cleanup: prevent state updates if component unmounts before fetch settles */
    return () => { mounted = false; };
  }, []);

  /**
   * Compute task statistics for a given user.
   * A task is attributed to the user if they are the assignee (assigned_to)
   * OR the creator (created_by) — mirrors the logic used in my-tasks.
   *
   * The status check for in_progress handles both the DB form ('in_progress')
   * and the normalised hyphenated form ('in-progress').
   *
   * @param {number} userId – The user's numeric database ID
   * @returns {{ total: number, pending: number, in_progress: number, completed: number }}
   */
  const getTaskStats = (userId) => {
    const userTasks = tasks.filter(t => t.assigned_to === userId || t.created_by === userId);
    return {
      total:       userTasks.length,
      pending:     userTasks.filter(t => t.status === 'pending').length,
      /* Accept both DB ('in_progress') and UI ('in-progress') status strings */
      in_progress: userTasks.filter(t => ['in_progress', 'in-progress'].includes(t.status)).length,
      completed:   userTasks.filter(t => t.status === 'completed').length,
    };
  };

  /**
   * Generate and trigger download of a CSV team report.
   * Each row contains a member's profile plus their computed task stats.
   * Uses the Blob + anchor pattern for a client-side download.
   */
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
    /* Release the object URL to free browser memory */
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
        {/* Only show the download button once members have loaded */}
        {members.length > 0 && (
          <button
            onClick={downloadReport}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            ↓ Download Report
          </button>
        )}
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* ── Member Card Grid ─────────────────────────────────────────── */}
      {loading ? (
        /* Skeleton placeholders: circle avatar + two text lines */
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
            /* Compute stats for this member using client-side task data */
            const stats = getTaskStats(m.id);
            return (
              <div key={m.id} className="bg-white rounded-2xl p-6 shadow-sm text-center hover:shadow-md transition-shadow">
                {/* Avatar: first letter of name on coloured circle (no image upload shown here) */}
                <div className="w-16 h-16 rounded-full bg-indigo-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3">
                  {(m.name || '?').charAt(0).toUpperCase()}
                </div>

                {/* Member identity */}
                <p className="font-semibold text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">{m.email}</p>

                {/* Role badge: solid for admin, muted for member */}
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  m.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
                }`}>{m.role || 'member'}</span>

                {/* Task Statistics breakdown */}
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
