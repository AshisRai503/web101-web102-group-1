'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MdDashboard, MdTask, MdAddBox,
  MdGroup, MdCalendarMonth, MdLogout, MdAssignment
} from 'react-icons/md';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch { setUser(null); }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    router.push('/login');
  };

  const displayName = user?.name || 'User';
  const displayEmail = user?.email || '';
  const displayRole = user?.role || 'member';
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = displayRole === 'admin';

  const adminNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <MdDashboard className="text-xl mr-3" /> },
    { label: 'Manage Tasks', href: '/tasks', icon: <MdTask className="text-xl mr-3" /> },
    { label: 'Create Task', href: '/create-task', icon: <MdAddBox className="text-xl mr-3" /> },
    { label: 'Team Members', href: '/team', icon: <MdGroup className="text-xl mr-3" /> },
    { label: 'Calendar', href: '/calendar', icon: <MdCalendarMonth className="text-xl mr-3" /> },
  ];

  const memberNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <MdDashboard className="text-xl mr-3" /> },
    { label: 'My Tasks', href: '/my-tasks', icon: <MdAssignment className="text-xl mr-3" /> },
    { label: 'Calendar', href: '/calendar', icon: <MdCalendarMonth className="text-xl mr-3" /> },
  ];

  const navItems = isAdmin ? adminNavItems : memberNavItems;

  return (
    <div className="w-60 min-h-screen bg-white border-r border-gray-200 fixed top-0 left-0 flex flex-col p-4">
      {/* Brand */}
      <div className="text-lg font-bold text-gray-800 mb-6 px-2">Task Manager</div>

      {/* Profile */}
      <div className="text-center mb-6 pb-4 border-b border-gray-200">
        <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
          {initial}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${
          isAdmin ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
        }`}>{displayRole}</span>
        <p className="font-semibold text-sm mt-1 text-gray-800">{displayName}</p>
        {displayEmail && <p className="text-xs text-gray-400 truncate">{displayEmail}</p>}
      </div>

      {/* Nav */}
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}
                className={`flex items-center p-3 rounded-md text-sm hover:bg-indigo-50 hover:text-indigo-600 ${
                  pathname === item.href ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-600'
                }`}>
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <button onClick={handleLogout}
        className="flex items-center p-3 rounded-md text-sm text-red-500 hover:bg-red-50 mt-4">
        <MdLogout className="text-xl mr-3" />
        Logout
      </button>
    </div>
  );
}
