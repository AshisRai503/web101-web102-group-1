'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MdDashboard, MdTask, MdAddBox,
  MdGroup, MdCalendarMonth, MdLogout
} from 'react-icons/md';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <MdDashboard className="text-xl mr-3" /> },
  { label: 'Manage Tasks', href: '/tasks', icon: <MdTask className="text-xl mr-3" /> },
  { label: 'Create Task', href: '/create-task', icon: <MdAddBox className="text-xl mr-3" /> },
  { label: 'Team Members', href: '/team', icon: <MdGroup className="text-xl mr-3" /> },
  { label: 'Calendar', href: '/calendar', icon: <MdCalendarMonth className="text-xl mr-3" /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-60 min-h-screen bg-white border-r border-gray-200 fixed top-0 left-0 flex flex-col p-4">
      {/* Brand */}
      <div className="text-lg font-bold text-gray-800 mb-6 px-2">Task Manager</div>

      {/* Profile */}
      <div className="text-center mb-6 pb-4 border-b border-gray-200">
        <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
          A
        </div>
        <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase font-bold">Admin</span>
        <p className="font-semibold text-sm mt-1 text-gray-800">Ashis</p>
        <p className="text-xs text-gray-400">Ashis@timetoprogram.com</p>
      </div>

      {/* Nav */}
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center p-3 rounded-md text-sm hover:bg-indigo-50 hover:text-indigo-600 ${
                  pathname === item.href
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
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

      {/* Logout */}
      <button className="flex items-center p-3 rounded-md text-sm text-red-500 hover:bg-red-50 mt-4">
        <MdLogout className="text-xl mr-3" />
        Logout
      </button>
    </div>
  );
}