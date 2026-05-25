/**
 * NotificationBell.jsx – Task Deadline Notification Bell
 *
 * A client component rendered in the Sidebar header that polls for tasks
 * due within the next 24 hours and surfaces them as an in-app notification
 * dropdown.
 *
 * Features:
 *  - Fetches all tasks via GET /api/v1/tasks on mount (skipped when no token).
 *  - Filters to incomplete tasks whose due_date falls within the next 24 hours.
 *  - Re-fetches every 5 minutes so the badge count stays current.
 *  - Red badge on the bell icon shows the count, capped at "9+".
 *  - Click-outside detection closes the dropdown automatically.
 *  - Dropdown aligns to the left edge of the bell (left-0) to stay inside
 *    the sidebar without overflowing off-screen.
 *  - Each notification shows the task title, a human-readable time until due,
 *    and the priority level.
 *
 * Used by: components/layout/Sidebar.jsx
 */
'use client';
import { useEffect, useState, useRef } from 'react';
import axiosInstance from '../lib/axios';
import { API_PATHS } from '../lib/apiPaths';

/**
 * NotificationBell component.
 * Renders a bell icon button with a live badge count and a dropdown list of
 * tasks due within the next 24 hours.
 *
 * @returns {JSX.Element}
 */
export default function NotificationBell() {
  /** Array of incomplete task objects with due_date within the next 24 hours */
  const [notifications, setNotifications] = useState([]);
  /** Controls whether the notification dropdown is currently visible */
  const [isOpen, setIsOpen] = useState(false);
  /** Ref on the wrapper div used by the click-outside handler */
  const dropdownRef = useRef(null);

  /**
   * On mount: fetch notifications immediately, then schedule a re-fetch
   * every 5 minutes (5 * 60 * 1000 ms).
   * The fetch is skipped when no token is present (user not logged in).
   * The interval is cleared on unmount via the cleanup function.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetchNotifications();
    /* Poll every 5 minutes so the count stays roughly current */
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  /**
   * Click-outside handler – closes the dropdown when the user clicks anywhere
   * outside the bell + dropdown wrapper element.
   * Registered on mount and removed on unmount to avoid memory leaks.
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Fetch all tasks and filter to those due within the next 24 hours.
   * Skips gracefully when no token exists to avoid an unauthenticated 401.
   * Errors are logged to the console but not surfaced in the UI.
   *
   * API: GET /api/v1/tasks
   * Response: { success: true, data: Task[] }
   */
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axiosInstance.get(API_PATHS.TASKS.LIST);
      const tasks = Array.isArray(res?.data?.data) ? res.data.data : [];

      const now = new Date();
      /* Upper bound: exactly 24 hours from now */
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      /* Keep only incomplete tasks whose due date falls in [now, +24 h] */
      const upcoming = tasks.filter(task => {
        if (!task.due_date) return false;            // no due date → skip
        if (task.status === 'completed') return false; // done tasks need no alert
        const dueDate = new Date(task.due_date);
        return dueDate >= now && dueDate <= in24Hours;
      });

      setNotifications(upcoming);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  /**
   * Format a due date string into a human-readable countdown.
   * Uses rounded hours so the text stays concise.
   *
   * @param {string} dateStr – ISO date string from task.due_date
   * @returns {string} e.g. 'Due now!', 'Due in 1 hour', 'Due in 3 hours'
   */
  const formatDue = (dateStr) => {
    const due = new Date(dateStr);
    const now = new Date();
    /* Difference rounded to the nearest whole hour */
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));
    if (diffHours <= 0)  return 'Due now!';
    if (diffHours < 1)   return 'Due in less than 1 hour';
    if (diffHours === 1) return 'Due in 1 hour';
    return `Due in ${diffHours} hours`;
  };

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors'
      >
        <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
            d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
        </svg>
        {notifications.length > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center'>
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className='absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <h3 className='text-sm font-semibold text-gray-900'>Notifications</h3>
            <span className='text-xs text-gray-400'>{notifications.length} upcoming</span>
          </div>
          <div className='max-h-64 overflow-y-auto'>
            {notifications.length === 0 ? (
              <div className='p-4 text-center text-sm text-gray-400'>
                No upcoming deadlines in the next 24 hours
              </div>
            ) : (
              notifications.map(task => (
                <div key={task.id} className='p-4 border-b border-gray-50 hover:bg-gray-50'>
                  <div className='flex items-start gap-3'>
                    <div className='w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0'></div>
                    <div>
                      <p className='text-sm font-medium text-gray-800'>{task.title}</p>
                      <p className='text-xs text-red-500 mt-0.5 font-medium'>{formatDue(task.due_date)}</p>
                      <p className='text-xs text-gray-400 mt-0.5 capitalize'>{task.priority} priority</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className='p-3 border-t border-gray-100'>
            <p className='text-xs text-gray-400 text-center'>Tasks due within the next 24 hours</p>
          </div>
        </div>
      )}
    </div>
  );
}
