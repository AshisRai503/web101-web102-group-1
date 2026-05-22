'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  

  const password = watch('password');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  const onSubmit = async (data) => {
    setApiError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {

       await axiosInstance.post(API_PATHS.AUTH.SIGNUP, {
        name: data.name,
        email: data.email,
        password: data.password,
        inviteToken: inviteToken,
      });

      setSuccessMessage('Account created! Redirecting to login...');
      setTimeout(() => router.push('/login'), 800);
    } catch (err) {
      setApiError(getErrorMessage(err, 'Could not create account. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join Task Manager today
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">

            {/* Name */}
            <div className="mb-4">
              <label htmlFor="name" className="sr-only">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Full Name"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' }
                })}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="Email address"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          {/* Admin Invite Token */}
          <div className='mb-4'>
            <label className='block text-sm font-medium text-grey-700 mb-1'>
              Admin Invite Token (optional)
            </label>

            <input
            type="text"
            placeholder='Enter 6-digit code'
            maxLength='6'
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md'
            />

            <p className='text-xs text-gray-400 mt-1'>
                Only enter this if you have an admin invite code
            </p>

          </div>

          {/* Terms */}
          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              {...register('terms', {
                required: 'You must agree to the terms and conditions'
              })}
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">Privacy Policy</a>
            </label>
          </div>
          {errors.terms && <p className="text-red-500 text-xs">{errors.terms.message}</p>}

          {apiError && (
            <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
              {apiError}
            </div>
          )}
          {successMessage && (
            <div className="px-3 py-2 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
