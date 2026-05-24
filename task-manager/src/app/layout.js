import './globals.css';

export const metadata = {
  title: 'Task Manager',
  description: 'A task management app built with Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}