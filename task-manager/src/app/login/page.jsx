/**
 * login/page.jsx – Login Page
 *
 * Public authentication page where existing users sign in.
 *
 * Features:
 *  - Redirects to /dashboard if a token already exists in localStorage.
 *  - React Hook Form for client-side field validation.
 *  - Calls POST /api/v1/auth/login via axiosInstance.
 *  - On success: stores the JWT and user object in localStorage, then
 *    navigates to /dashboard.
 *  - On failure: shows a user-friendly error message via getErrorMessage().
 *  - Submit button is disabled while the request is in flight.
 *
 * Route: /login  (public – no auth required)
 */

'use client';

import { useState, useEffect }     from 'react';
import { useForm }                  from 'react-hook-form';
import Link                         from 'next/link';
import { useRouter }                from 'next/navigation';
import axiosInstance                from '../../lib/axios';
import { API_PATHS }                from '../../lib/apiPaths';
import getErrorMessage              from '../../lib/getErrorMessage';

/**
 * LoginPage component.
 *
 * @returns {JSX.Element} Full-screen centered login form.
 */
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError,  setApiError]  = useState('');

  // React Hook Form manages validation state, errors, and form values.
  const { register, handleSubmit, formState: { errors } } = useForm();

  /**
   * Skip the login form if the user already has a valid token in localStorage.
   * Runs once on mount.
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  /**
   * Handles form submission.
   *
   * @param {{ email: string, password: string }} data – Validated form values.
   *
   * Steps:
   *  1. POST credentials to /api/v1/auth/login.
   *  2. Extract JWT and user from the response envelope.
   *  3. Persist both to localStorage.
   *  4. Navigate to /dashboard.
   */
  const onSubmit = async (data) => {
    setApiError('');
    setIsLoading(true);
    try {
      const res     = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email:    data.email,
        password: data.password,
      });
      // Backend envelope: { success, message, data: { token, user } }
      const payload = res?.data?.data;
      const token   = payload?.token;
      const user    = payload?.user;

      if (!token) throw new Error('Login response missing token');

      // Persist token so the axios interceptor attaches it to future requests,
      // and user so the Sidebar can read name/role without an extra API call.
      localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', JSON.stringify(user));

      router.push('/dashboard');
    } catch (err) {
      setApiError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-gray-100 px-4">
      <div className="w-full max-w-md">

        {/* Page header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Task Manager</h1>
          <p className="text-gray-500 mt-2">Sign in to your account test </p>
        </div>

        {/* Login form card */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Email field */}
            <div className="mb-4">
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email" type="text" placeholder="Email or username"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password field */}
            <div className="mb-4">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password" type="password" placeholder="Password"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="mb-4 text-right">
              <Link href="/reset-password" className="text-sm text-gray-500 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* API error banner */}
            {apiError && (
              <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
                {apiError}
              </div>
            )}

            {/* Submit – disabled while request is in flight */}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700 transition disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>

        {/* Sign-up link */}
        <div className="mt-4 text-center">
          <p className="text-gray-500 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-indigo-600 font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
