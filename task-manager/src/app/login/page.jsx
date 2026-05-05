'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  // If user already has a token, send them straight to the dashboard.
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  const onSubmit = async (data) => {
    setApiError('');
    setIsLoading(true);
    try {
      const res = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email: data.email,
        password: data.password,
      });

      const payload = res?.data?.data;
      const token = payload?.token;
      const user = payload?.user;

      if (!token) {
        throw new Error('Login response missing token');
      }

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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Task Manager</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                type="text"
                placeholder="Email or username"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                {...register('email', {
                  required: 'Email is required'
                })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Password"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                {...register('password', {
                  required: 'Password is required'
                })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="mb-4 text-right">
              <Link href="/reset-password" className="text-sm text-gray-500 hover:underline">
                Forgot password?
              </Link>
            </div>

            {apiError && (
              <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700 transition disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-500 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-indigo-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
