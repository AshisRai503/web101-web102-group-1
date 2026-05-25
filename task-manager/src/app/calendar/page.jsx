/**
 * calendar/page.jsx – Calendar Page
 *
 * A full-page monthly calendar that overlays real task data on each date cell.
 * Tasks are fetched once on mount from GET /api/v1/tasks and bucketed by their
 * due_date into a map keyed by YYYY-MM-DD.
 *
 * Features:
 *  - Month navigation via ‹ / › arrow buttons (back and forward one month)
 *  - Today's date highlighted with an indigo filled circle
 *  - Each date cell shows up to 2 task-name pills colour-coded by priority:
 *      Red = High · Yellow/Amber = Medium · Green = Low
 *  - When a date has more than 2 tasks, a "+X more" link is shown below
 *  - Clicking any date that has tasks opens a modal listing ALL tasks due that
 *    day, each with a title, priority badge, and status badge
 *  - Clicking the backdrop or the × button closes the modal
 *  - A priority legend sits below the grid for quick reference
 *
 * API used:
 *  GET /api/v1/tasks  → { success: true, data: Task[] }
 *  Each task's due_date is sliced to YYYY-MM-DD so timezone drift cannot
 *  cause a task to appear on the wrong calendar cell.
 *
 * Route: /calendar  (protected – requires valid JWT in localStorage)
 */
'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Full month names indexed 0–11 */
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/**
 * Tailwind classes for priority-coloured task pills (background + text).
 * Keyed by lowercase priority string from the API.
 */
const PRIORITY_PILL = {
  high:   'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low:    'bg-green-100 text-green-700 border border-green-200',
};

/**
 * Tailwind classes for status badges shown in the day-detail modal.
 * Keyed by normalised hyphenated status string.
 */
const STATUS_BADGE = {
  completed:    'bg-green-100 text-green-700',
  'in-progress':'bg-purple-100 text-purple-700',
  pending:      'bg-orange-100 text-orange-700',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a status string to lowercase hyphenated form.
 * e.g. 'in_progress' → 'in-progress', 'Completed' → 'completed'
 *
 * @param {string} s – Raw status value from the API
 * @returns {string}
 */
const normaliseStatus = (s) => (s || '').toString().toLowerCase().replace(/[_\s]+/g, '-');

/**
 * Build a zero-padded YYYY-MM-DD key for a given year, month (0-indexed), day.
 * Used both to build the tasksByDate map and to look up tasks for each cell.
 *
 * @param {number} y – Full year, e.g. 2026
 * @param {number} m – Month index 0–11
 * @param {number} d – Day of month 1–31
 * @returns {string} e.g. '2026-05-25'
 */
const toKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// ─────────────────────────────────────────────────────────────────────────────
// CalendarPage component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CalendarPage component.
 * Renders an interactive monthly calendar with task pills on each date cell.
 *
 * @returns {JSX.Element}
 */
export default function CalendarPage() {
  /** System clock snapshot taken once when the component first mounts */
  const now = new Date();

  /**
   * The month currently displayed, stored as the 1st of that month so that
   * month arithmetic (new Date(year, month ± 1, 1)) never overflows.
   */
  const [currentDate, setCurrentDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );

  /** All tasks fetched from the API; filtered/bucketed via useMemo */
  const [tasks, setTasks] = useState([]);

  /**
   * When non-null, a day-detail modal is displayed.
   * Shape: { day: number, month: number, year: number, tasks: Task[] }
   * Storing month + year inside selectedDay means the modal header stays
   * correct even if the user navigates to a different month while it's open.
   */
  const [selectedDay, setSelectedDay] = useState(null);

  /* Snapshot of today's components for highlighting */
  const todayDate  = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear  = now.getFullYear();

  /* Decompose the currently displayed month */
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ── Data fetching ──────────────────────────────────────────────────────────

  /**
   * Fetch all tasks once on mount so task pills can be displayed immediately.
   * Skips gracefully when no token is present (user not logged in).
   * Errors are logged to the console but not surfaced in the UI – the calendar
   * degrades gracefully to an empty dot-free grid.
   *
   * API: GET /api/v1/tasks
   * Response: { success: true, data: Task[] }
   */
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axiosInstance.get(API_PATHS.TASKS.LIST);
        setTasks(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error('Failed to fetch tasks for calendar:', err);
      }
    };
    fetchTasks();
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  /**
   * Map of YYYY-MM-DD → Task[].
   * Built by slicing the first 10 characters of each task's due_date string,
   * which avoids timezone-related date shifts (comparing UTC midnight against
   * local-time date numbers can shift a task onto the wrong calendar cell).
   * Recomputed only when the tasks array changes.
   */
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (!task.due_date) return; // Skip tasks without a due date
      /* Slice to YYYY-MM-DD regardless of whether the timestamp has a time component */
      const key = task.due_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  /**
   * Build the flat array of cell values for the 7-column grid.
   * null entries are leading empty placeholders before the 1st of the month;
   * numbers 1–daysInMonth are actual date values.
   *
   * @type {(number|null)[]}
   */
  const days = useMemo(() => {
    const firstDay    = new Date(year, month, 1).getDay();     // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDay;    i++) arr.push(null); // empty leading cells
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);   // date cells
    return arr;
  }, [year, month]);

  // ── Interaction ────────────────────────────────────────────────────────────

  /**
   * Handle a click on a date cell.
   * Opens the day-detail modal only when that date has at least one task.
   * Empty cells and null (padding) cells are ignored.
   *
   * @param {number|null} d – The day-of-month value for the clicked cell
   */
  const handleDayClick = (d) => {
    if (!d) return;
    const key      = toKey(year, month, d);
    const dayTasks = tasksByDate[key] || [];
    if (dayTasks.length === 0) return; // Nothing to show
    setSelectedDay({ day: d, month, year, tasks: dayTasks });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>

      <div className="bg-white rounded-2xl p-8 shadow-sm">

        {/* ── Month Navigation Header ──────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          {/* Go back one month – JS Date handles year roll-back automatically */}
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xl"
          >‹</button>
          <h2 className="text-lg font-semibold text-gray-900">{MONTH_NAMES[month]} {year}</h2>
          {/* Go forward one month */}
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xl"
          >›</button>
        </div>

        {/* ── Calendar Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 gap-1">

          {/* Weekday column headers */}
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs font-semibold text-gray-400 pb-3 text-center">
              {d}
            </div>
          ))}

          {/* Date cells */}
          {days.map((d, i) => {
            const isToday  = d === todayDate && month === todayMonth && year === todayYear;
            const key      = d ? toKey(year, month, d) : null;
            const dayTasks = key ? (tasksByDate[key] || []) : [];
            const hasTasks = dayTasks.length > 0;
            /* Show at most 2 task pills; surface a "+X more" count for the rest */
            const visibleTasks = dayTasks.slice(0, 2);
            const overflow     = dayTasks.length - 2;

            return (
              <div
                key={i}
                onClick={() => handleDayClick(d)}
                className={`min-h-24 p-1.5 rounded-lg border transition-all ${
                  !d
                    ? 'border-transparent'                                           /* empty padding cell */
                    : isToday
                      ? 'border-indigo-300 bg-indigo-50'                            /* today */
                      : hasTasks
                        ? 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer' /* has tasks */
                        : 'border-gray-100 hover:bg-gray-50'                        /* normal empty day */
                }`}
              >
                {d && (
                  <>
                    {/* Date number – circle when it is today */}
                    <div className="flex justify-center mb-1">
                      <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700'
                      }`}>
                        {d}
                      </span>
                    </div>

                    {/* Task name pills – colour coded by priority */}
                    <div className="space-y-0.5">
                      {visibleTasks.map(task => {
                        const p = (task.priority || 'medium').toLowerCase();
                        return (
                          <div
                            key={task.id}
                            title={task.title} /* native tooltip for truncated names */
                            className={`text-xs px-1.5 py-0.5 rounded font-medium truncate leading-tight ${
                              PRIORITY_PILL[p] || 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {task.title}
                          </div>
                        );
                      })}

                      {/* "+X more" indicator when there are more than 2 tasks */}
                      {overflow > 0 && (
                        <div className="text-xs text-indigo-600 font-semibold pl-1">
                          +{overflow} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Priority Legend ──────────────────────────────────────────── */}
        <div className="flex items-center gap-5 mt-6 pt-4 border-t border-gray-100 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Priority</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-red-300 inline-block flex-shrink-0"></span>High
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-amber-300 inline-block flex-shrink-0"></span>Medium
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-green-300 inline-block flex-shrink-0"></span>Low
          </span>
        </div>
      </div>

      {/* ── Day-Detail Modal ─────────────────────────────────────────────── */}
      {/*
       * Rendered outside the calendar card so it floats above the full page.
       * Clicking the semi-transparent backdrop dismisses the modal.
       * e.stopPropagation() on the inner panel prevents backdrop clicks from
       * firing when the user clicks inside the modal content.
       */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header: date title + close button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {MONTH_NAMES[selectedDay.month]} {selectedDay.day}, {selectedDay.year}
                <span className="ml-2 text-sm text-gray-400 font-normal">
                  {selectedDay.tasks.length} task{selectedDay.tasks.length !== 1 ? 's' : ''}
                </span>
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>

            {/* Task list – scrollable when there are many tasks */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {selectedDay.tasks.map(task => {
                const p = (task.priority || 'medium').toLowerCase();
                const s = normaliseStatus(task.status);
                return (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors"
                  >
                    {/* Task title */}
                    <p className="text-sm font-medium text-gray-800 mb-2 leading-snug">
                      {task.title}
                    </p>

                    {/* Priority + Status badges */}
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        PRIORITY_PILL[p] || 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {p.charAt(0).toUpperCase() + p.slice(1)} Priority
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        STATUS_BADGE[s] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
