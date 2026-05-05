'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

export default function CreateTaskPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      due_date: '',
    },
  });

  const onSubmit = async (data) => {
    setApiError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const payload = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
      };
      if (data.due_date) payload.due_date = data.due_date;

      await axiosInstance.post(API_PATHS.TASKS.CREATE, payload);
      setSuccessMessage('Task created successfully. Redirecting...');
      reset();
      setTimeout(() => router.push('/tasks'), 600);
    } catch (err) {
      setApiError(getErrorMessage(err, 'Could not create task.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h1>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
              <input
                type="text"
                placeholder="Enter task title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm"
                {...register('due_date')}
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              placeholder="Task description..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm resize-none"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm"
                {...register('priority')}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm"
                {...register('status')}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {apiError && (
            <div className="mt-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
              {apiError}
            </div>
          )}
          {successMessage && (
            <div className="mt-4 px-3 py-2 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
