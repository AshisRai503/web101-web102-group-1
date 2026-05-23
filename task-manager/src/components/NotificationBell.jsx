// task-manager/src/components/NotificationBell.jsx

// Notification bell component — shows tasks due within 24 hours

'use client';

import { useEffect, useState, useRef } from 'react';
import axiosInstance from '../lib/axios';
import { API_PATHS } from '../lib/apiPaths';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    // Check every 5 minutes for new notifications
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.TASKS.LIST);
      const tasks = Array.isArray(res?.data?.data) ? res.data.data : [];

      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Filter tasks due within 24 hours that are not completed
      const upcoming = tasks.filter(task => {
        if (!task.due_date) return false;
        if (task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= now && dueDate <= in24Hours;
      });

      setNotifications(upcoming);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const formatDue = (dateStr) => {
    const due = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));

    if (diffHours <= 0) return 'Due now!';
    if (diffHours < 1) return 'Due in less than 1 hour';
    if (diffHours === 1) return 'Due in 1 hour';
    return `Due in ${diffHours} hours`;
  };

  return (
    <div className='relative' ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors'
      >
        {/* Bell SVG Icon */}
        <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
            d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
        </svg>
        {/* Badge - shows count of notifications */}
        {notifications.length > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center'>
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
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
            <p className='text-xs text-gray-400 text-center'>
              Tasks due within the next 24 hours
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
