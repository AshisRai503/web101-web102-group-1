/**
 * DashboardLayout.jsx – Authenticated Dashboard Layout
 *
 * A client-side layout wrapper used by every protected dashboard page.
 * Provides two key behaviours:
 *
 *  1. Auth Guard
 *     On mount, checks localStorage for a JWT. If absent, redirects to /login
 *     using router.replace() so the login page is not added to browser history.
 *     While the check is in flight, a lightweight loading placeholder is shown
 *     to prevent a flash of protected content.
 *
 *  2. Layout Shell
 *     Once auth is confirmed, renders a fixed <Sidebar> on the left plus a
 *     scrollable <main> area that receives the page-specific {children}.
 *
 * Usage (in every dashboard page):
 *   <DashboardLayout>
 *     <h1>Page content here</h1>
 *   </DashboardLayout>
 *
 * Note: this is a client-side guard only. Server-side protection would require
 * Next.js middleware (middleware.js) or a similar server mechanism.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import Sidebar                 from './Sidebar';

/**
 * DashboardLayout component.
 *
 * @param {object}         props          – Component props.
 * @param {React.ReactNode} props.children – Page content to render inside the layout.
 * @returns {JSX.Element} Loading placeholder while auth is checked, or the
 *   full sidebar + main content shell once auth is confirmed.
 */
export default function DashboardLayout({ children }) {
  const router = useRouter();

  /**
   * Tracks whether the auth check has completed.
   * Stays false until a valid token is found, keeping the page hidden and
   * preventing protected content from flashing to unauthenticated visitors.
   */
  const [authChecked, setAuthChecked] = useState(false);

  /**
   * Auth guard effect – runs once on mount.
   *
   * Reads the JWT from localStorage:
   *  - No token → redirect to /login (user is not authenticated).
   *  - Token found → set authChecked to true and render the layout.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return; // No-op during SSR
    const token = localStorage.getItem('token');
    if (!token) {
      // replace() keeps the login page out of history so Back doesn't return
      // the user to a page they can't access.
      router.replace('/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  // Show a lightweight placeholder while the auth check completes.
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  // Authenticated: render the full layout.
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Fixed left sidebar – always visible on dashboard pages */}
      <Sidebar />
      {/* Main content area – offset by the sidebar width (ml-60) */}
      <main className="ml-60 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
