/**
 * page.js – Root Route Redirect
 *
 * Handles requests to the application root ("/").
 * Immediately performs a server-side redirect to /login so that visitors
 * always land on the login page first. Authenticated users are then
 * handled by the client-side auth guard inside DashboardLayout.
 *
 * This is a Server Component — Next.js `redirect()` is a server-side API
 * that issues a 307 HTTP redirect before any HTML is sent to the browser,
 * so no 'use client' directive or client-side JavaScript is needed.
 *
 * Route: /  (public – redirects immediately to /login)
 */
import { redirect } from 'next/navigation';

/**
 * Home component – entry point for the "/" route.
 * Calls Next.js `redirect()`, which throws internally to halt rendering
 * and issue the HTTP redirect. No JSX is ever returned.
 *
 * @returns {never} Never returns; control passes to the redirect handler.
 */
export default function Home() {
  redirect('/login');
}