/**
 * Sidebar.jsx – Application Navigation Sidebar
 *
 * Fixed left-side navigation panel rendered on every authenticated page via
 * DashboardLayout. It is a client component because it reads from localStorage
 * and uses Next.js router hooks.
 *
 * Features:
 *  - Reads the logged-in user's name, email, and role from localStorage.
 *  - Renders role-specific navigation items:
 *      Admin  → Dashboard, Manage Tasks, Create Task, Team Members, Calendar
 *      Member → Dashboard, My Tasks, Calendar
 *  - Highlights the active link by comparing the current pathname to each href.
 *  - Logout button clears auth state from localStorage and navigates to /login.
 *
 * No API calls are made from this component – all data comes from localStorage.
 */

'use client';

import Link                  from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MdDashboard, MdTask, MdAddBox,
  MdGroup, MdCalendarMonth, MdLogout, MdAssignment,
} from 'react-icons/md';
import NotificationBell from '../NotificationBell';

/**
 * Sidebar component – fixed left navigation panel.
 *
 * @returns {JSX.Element} The sidebar element.
 */
export default function Sidebar() {
  const pathname = usePathname(); // Current URL path for active-link highlighting
  const router   = useRouter();
  const [user, setUser] = useState(null); // Parsed user object from localStorage

  /**
   * On mount, parse and load the user object stored in localStorage at login.
   * Wrapped in try/catch because JSON.parse throws on malformed values.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  /**
   * Clears all auth data from localStorage and navigates to /login.
   * Called when the user clicks the Logout button.
   */
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    router.push('/login');
  };

  // Derived display values with safe fallbacks for when user hasn't loaded yet.
  const displayName  = user?.name  || 'User';
  const displayEmail = user?.email || '';
  const displayRole  = user?.role  || 'member';
  const initial      = displayName.charAt(0).toUpperCase(); // First letter for avatar placeholder
  const isAdmin      = displayRole === 'admin';

  // ─── Navigation item definitions ───────────────────────────────────────────

  /** Links visible only to admin users (full task management + team view). */
  const adminNavItems = [
    { label: 'Dashboard',    href: '/dashboard',  icon: <MdDashboard      className="text-xl mr-3" /> },
    { label: 'Manage Tasks', href: '/tasks',       icon: <MdTask           className="text-xl mr-3" /> },
    { label: 'Create Task',  href: '/create-task', icon: <MdAddBox         className="text-xl mr-3" /> },
    { label: 'Team Members', href: '/team',        icon: <MdGroup          className="text-xl mr-3" /> },
    { label: 'Calendar',     href: '/calendar',    icon: <MdCalendarMonth  className="text-xl mr-3" /> },
  ];

  /** Links visible to regular (member) users – personal tasks and calendar only. */
  const memberNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <MdDashboard     className="text-xl mr-3" /> },
    { label: 'My Tasks',  href: '/my-tasks',  icon: <MdAssignment    className="text-xl mr-3" /> },
    { label: 'Calendar',  href: '/calendar',  icon: <MdCalendarMonth className="text-xl mr-3" /> },
  ];

  // Select nav items based on role.
  const navItems = isAdmin ? adminNavItems : memberNavItems;

  return (
    <div className="w-60 min-h-screen bg-white border-r border-gray-200 fixed top-0 left-0 flex flex-col p-4">

      {/* Brand + Notification Bell */}
      <div className='flex items-center justify-between mb-6 px-2'>
        <div className='text-lg font-bold text-gray-800'>Task Manager</div>
        <NotificationBell />
      </div>

      {/* ── User profile card ─────────────────────────────────────────────── */}
      <div className="text-center mb-6 pb-4 border-b border-gray-200">
        {/* Avatar placeholder – coloured circle with the user's first initial */}
        <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
          {initial}
        </div>
        {/* Role badge – solid indigo for admins, lighter tint for members */}
        <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${
          isAdmin ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
        }`}>
          {displayRole}
        </span>
        <p className="font-semibold text-sm mt-1 text-gray-800">{displayName}</p>
        {displayEmail && <p className="text-xs text-gray-400 truncate">{displayEmail}</p>}
      </div>

      {/* ── Navigation links ──────────────────────────────────────────────── */}
      {/* The active link is highlighted when pathname matches item.href.    */}
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center p-3 rounded-md text-sm hover:bg-indigo-50 hover:text-indigo-600 ${
                  pathname === item.href
                    ? 'bg-indigo-50 text-indigo-600 font-semibold' // Active
                    : 'text-gray-600'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Logout button ─────────────────────────────────────────────────── */}
      <button
        onClick={handleLogout}
        className="flex items-center p-3 rounded-md text-sm text-red-500 hover:bg-red-50 mt-4"
      >
        <MdLogout className="text-xl mr-3" />
        Logout
      </button>
    </div>
  );
}
