/**
 * calendar/page.jsx – Calendar Page
 *
 * A standalone full-page calendar widget that lets users browse months.
 * Pure client-side; no API calls – dates are computed from the system clock.
 *
 * Features:
 *  - Month navigation via ‹ / › arrow buttons (back and forward one month)
 *  - Highlights today's date with an indigo filled circle
 *  - Null-padded day grid so the first day of the month falls on the correct weekday
 *  - State is a Date object set to the 1st of the displayed month
 *
 * Route: /calendar  (protected – requires valid JWT in localStorage)
 */
'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useState } from 'react';

/**
 * CalendarPage component.
 * Renders an interactive monthly calendar with today highlighted.
 *
 * @returns {JSX.Element}
 */
export default function CalendarPage() {
  /** System clock snapshot taken once when the component first mounts */
  const now = new Date();

  /**
   * The month currently displayed.
   * Stored as a Date set to the 1st day of the month so that month arithmetic
   * (new Date(year, month ± 1, 1)) works cleanly without day-overflow issues.
   */
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  /* Snapshot of today's individual components for highlighting */
  const todayDate  = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear  = now.getFullYear();

  /* Decompose the currently displayed month for rendering */
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  /** Human-readable month labels indexed 0–11 */
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  /**
   * Day-of-week index of the first day of the displayed month (0 = Sunday).
   * Used to prepend null placeholders so the grid aligns correctly.
   */
  const firstDay = new Date(year, month, 1).getDay();

  /**
   * Total number of days in the displayed month.
   * `new Date(year, month + 1, 0)` gives the last day of `month`.
   */
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /**
   * Build the flat array of cells for the 7-column grid.
   * null entries are leading empty cells before the 1st of the month.
   * Numbers 1–daysInMonth are the actual date cells.
   *
   * @type {(number|null)[]}
   */
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);      /* empty leading cells */
  for (let d = 1; d <= daysInMonth; d++) days.push(d);     /* date cells          */

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        {/* ── Month Navigation Header ────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          {/* Go back one month – new Date(year, month-1, 1) handles year roll-back automatically */}
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >‹</button>
          <h2 className="text-lg font-semibold">{monthNames[month]} {year}</h2>
          {/* Go forward one month */}
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >›</button>
        </div>

        {/* ── Day Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {/* Weekday column headers */}
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs font-semibold text-gray-400 pb-3">{d}</div>
          ))}

          {/* Day cells: null entries render as blank, numbers render as date cells */}
          {days.map((d, i) => {
            /* Check if this cell represents today's actual date */
            const isToday = d === todayDate && month === todayMonth && year === todayYear;
            return (
              <div key={i} className={`py-3 text-sm rounded-lg cursor-pointer ${
                isToday
                  ? 'bg-indigo-600 text-white font-bold'      /* today highlight */
                  : d
                    ? 'hover:bg-indigo-50 text-gray-700'      /* normal date cell */
                    : ''                                       /* empty leading cell */
              }`}>
                {d || ''}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
