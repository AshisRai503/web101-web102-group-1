/**
 * layout.js – Root Application Layout
 *
 * The top-level layout required by Next.js App Router.
 * Wraps every page in the application with the HTML document shell
 * (<html>, <head>, <body>) and applies global styles.
 *
 * This is a Server Component (no 'use client' directive), so it runs once
 * on the server and is never re-rendered on the client — making it the
 * correct place for global CSS imports and document-level metadata.
 *
 * globals.css is imported here so Tailwind's base/components/utilities
 * layers are available to every page without per-page imports.
 */
import './globals.css';

/**
 * Next.js static metadata object.
 * Generates the <title> and <meta name="description"> tags for every page
 * that does not define its own `metadata` export.
 *
 * @type {import('next').Metadata}
 */
export const metadata = {
  title: 'Task Manager',
  description: 'A task management app built with Next.js',
};

/**
 * RootLayout component.
 * Renders the outermost HTML document shell shared by all routes.
 * Next.js App Router requires exactly one root layout at `app/layout.js`.
 *
 * @param {object}          props          – Component props.
 * @param {React.ReactNode} props.children – The active page, automatically
 *   injected by the Next.js router.
 * @returns {JSX.Element} Full HTML document with {children} inside <body>.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}