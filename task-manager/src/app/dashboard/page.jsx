/**
 * dashboard/page.jsx – Main Dashboard Page
 *
 * Landing page for authenticated users. Provides a high-level overview of
 * all tasks visible to the current user, including:
 *  - Personalised greeting (Good Morning/Afternoon/Evening) with today's date.
 *  - Stat cards: Total, Pending, In Progress, Completed task counts.
 *  - Doughnut chart (task status distribution) and Bar chart (priority levels).
 *  - Mini interactive calendar widget.
 *  - Recent Tasks table (5 most recently created tasks).
 *
 * Data flow:
 *  - User info read from localStorage (set at login).
 *  - Tasks fetched from GET /api/v1/tasks on mount.
 *  - All counts and chart datasets derived via useMemo.
 *
 * Route: /dashboard  (protected – requires authentication via DashboardLayout)
 */

'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { useEffect, useMemo, useState } from 'react';
import axiosInstance   from '../../lib/axios';
import { API_PATHS }   from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

// Register only the Chart.js components needed to keep the client bundle lean.
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Normalises a task status string to kebab-case for consistent UI comparisons.
 * e.g. 'in_progress' → 'in-progress', 'Completed' → 'completed'
 * @param {string} s – Raw status from the API.
 * @returns {string}
 */
const normaliseStatus   = (s) => (s || '').toString().toLowerCase().replace(/[_\s]+/g, '-');

/**
 * Normalises a priority string to lowercase.
 * @param {string} p – Raw priority from the API.
 * @returns {string}
 */
const normalisePriority = (p) => (p || '').toString().toLowerCase();

// ─────────────────────────────────────────────
// CalendarWidget – inline mini calendar
// ─────────────────────────────────────────────

/**
 * Self-contained mini calendar. Supports month navigation and highlights
 * today's date. Purely presentational – does not call the backend.
 *
 * @returns {JSX.Element} Calendar grid for the currently displayed month.
 */
function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today      = new Date().getDate();
  const todayMonth = new Date().getMonth();
  const todayYear  = new Date().getFullYear();
  const year       = currentDate.getFullYear();
  const month      = currentDate.getMonth();

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  // Weekday (0=Sun) on which the 1st of the displayed month falls.
  // Leading null cells align the grid with the correct weekday column.
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // Day 0 of next month = last day

  const days = [];
  for (let i = 0; i < firstDay; i++)     days.push(null); // Offset padding
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div>
      {/* Month navigation */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-gray-600">‹</button>
        <span className="font-semibold text-sm">{monthNames[month]} {year}</span>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-gray-600">›</button>
      </div>
      {/* 7-column grid: Sun–Sat */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-xs text-gray-400 font-semibold pb-2">{d}</div>
        ))}
        {days.map((d, i) => {
          const isToday = d === today && month === todayMonth && year === todayYear;
          return (
            <div key={i} className={`py-2 text-sm rounded-md ${
              isToday ? 'bg-indigo-600 text-white font-bold' :
              d ? 'text-gray-700 hover:bg-gray-100 cursor-pointer' : ''
            }`}>{d || ''}</div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DashboardPage
// ─────────────────────────────────────────────

/**
 * Main dashboard page component.
 * Fetches task data, derives statistics, and renders the full dashboard UI.
 *
 * @returns {JSX.Element} Dashboard wrapped in DashboardLayout.
 */
export default function DashboardPage() {
  const [tasks,        setTasks]        = useState([]);
  const [user,         setUser]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  /** Read the logged-in user from localStorage on mount. */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('user');
        if (raw) setUser(JSON.parse(raw));
      } catch { /* noop */ }
    }
  }, []);

  /**
   * Fetch all tasks visible to the current user on mount.
   * The `mounted` flag prevents state updates after the component unmounts,
   * which avoids React's "Can't perform a state update on an unmounted
   * component" warning on slow networks.
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const res  = await axiosInstance.get(API_PATHS.TASKS.LIST);
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        if (mounted) setTasks(list);
      } catch (err) {
        if (mounted) setErrorMessage(getErrorMessage(err, 'Failed to load tasks.'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /**
   * Derive stat counts, chart data, and upcoming tasks from the tasks array.
   * Wrapped in useMemo so the computation only re-runs when tasks changes.
   */
  const { total, pending, inProgress, completed, priorityCounts } = useMemo(() => {
    let pendingCount = 0, inProgressCount = 0, completedCount = 0;
    const priority   = { low: 0, medium: 0, high: 0 };

    tasks.forEach((t) => {
      const s = normaliseStatus(t.status);
      if (s === 'completed')   completedCount++;
      else if (s === 'in-progress') inProgressCount++;
      else pendingCount++;

      const p = normalisePriority(t.priority);
      if (p === 'high')        priority.high++;
      else if (p === 'medium') priority.medium++;
      else if (p === 'low')    priority.low++;
    });

    return {
      total:          tasks.length,
      pending:        pendingCount,
      inProgress:     inProgressCount,
      completed:      completedCount,
      priorityCounts: priority,
    };
  }, [tasks]);

  // Stat cards rendered in the header section.
  const statCards = [
    { label: 'Total Tasks',     value: total,      color: 'border-l-indigo-500' },
    { label: 'Pending Tasks',   value: pending,    color: 'border-l-amber-500'  },
    { label: 'In Progress',     value: inProgress, color: 'border-l-purple-500' },
    { label: 'Completed Tasks', value: completed,  color: 'border-l-green-500'  },
  ];

  // Doughnut chart – task status distribution.
  const donutData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [{ data: [pending, inProgress, completed],
      backgroundColor: ['#8b5cf6', '#6366f1', '#10b981'], borderWidth: 3, borderColor: '#fff' }],
  };

  // Bar chart – task priority distribution.
  const barData = {
    labels: ['Low', 'Medium', 'High'],
    datasets: [{ label: 'Tasks',
      data: [priorityCounts.low, priorityCounts.medium, priorityCounts.high],
      backgroundColor: ['#a5b4fc', '#6366f1', '#4f46e5'], borderRadius: 6 }],
  };

  // Time-of-day greeting.
  const now    = new Date();
  const hour   = now.getHours();
  const greeting     = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr      = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const greetingName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <DashboardLayout>
      {/* ── Header card: greeting + stat counters ─────────────────────────── */}
      <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{greeting}! {greetingName}</h1>
        <p className="text-gray-500 mt-1">{dateStr}</p>
        <div className="flex gap-8 mt-6 flex-wrap">
          {statCards.map((s) => (
            <div key={s.label} className={`flex items-center gap-2 border-l-4 pl-3 ${s.color}`}>
              <div>
                <span className="text-2xl font-bold text-gray-900">{s.value} </span>
                <span className="text-sm text-gray-500">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
        {errorMessage && <p className="mt-4 text-sm text-red-500">{errorMessage}</p>}
        {loading      && <p className="mt-4 text-sm text-gray-400">Loading tasks...</p>}
      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Task Distribution</h3>
          <div className="w-48 mx-auto">
            <Doughnut data={donutData} options={{ plugins: { legend: { position: 'bottom' } }, cutout: '65%' }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Task Priority Levels</h3>
          <Bar data={barData} options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
        </div>
      </div>

      {/* ── Mini calendar ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Calendar</h3>
        <CalendarWidget />
      </div>

      {/* ── Recent Tasks table (5 most recent) ────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm mt-6">
        <h3 className="text-sm font-semibold mb-4">Recent Tasks</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2">Task Name</th><th className="pb-2">Status</th>
              <th className="pb-2">Priority</th><th className="pb-2">Created Date</th>
            </tr>
          </thead>
          <tbody>
            {tasks.slice(0, 5).map((task) => (
              <tr key={task.id} className="border-b last:border-0">
                <td className="py-2">{task.title}</td>
                <td className="py-2">
                  {/* Colour-coded status badge */}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    normaliseStatus(task.status) === 'completed'   ? 'bg-green-100 text-green-700'  :
                    normaliseStatus(task.status) === 'in-progress' ? 'bg-purple-100 text-purple-700' :
                                                                     'bg-orange-100 text-orange-700'
                  }`}>
                    {normaliseStatus(task.status) === 'in-progress'
                      ? 'In Progress'
                      : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                </td>
                <td className="py-2">{task.priority}</td>
                <td className="py-2">{new Date(task.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
