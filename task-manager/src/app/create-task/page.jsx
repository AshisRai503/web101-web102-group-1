'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

export default function CreateTaskPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistInput, setChecklistInput] = useState('');
  const [attachments, setAttachments] = useState([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: { title: '', description: '', priority: 'medium', status: 'pending', due_date: '' },
  });

  // Fetch users for assign members
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.USERS.LIST);
        setUsers(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (err) { console.error('Failed to fetch users', err); }
    };
    fetchUsers();
  }, []);

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const addChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setChecklistItems(prev => [...prev, { id: Date.now(), title: checklistInput.trim(), completed: false }]);
    setChecklistInput('');
  };

  const removeChecklistItem = (id) => {
    setChecklistItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

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
        assigned_to: selectedMembers.length > 0 ? selectedMembers[0] : null,
      };
      if (data.due_date) payload.due_date = data.due_date;

      const res = await axiosInstance.post(API_PATHS.TASKS.CREATE, payload);
      const taskId = res?.data?.data?.id;

      // Create checklist items
      if (taskId && checklistItems.length > 0) {
        await Promise.all(checklistItems.map(item =>
          axiosInstance.post(API_PATHS.TASKS.CHECKLISTS(taskId), { title: item.title })
        ));
      }

      // Upload attachments
      if (taskId && attachments.length > 0) {
        await Promise.all(attachments.map(file => {
          const formData = new FormData();
          formData.append('file', file);
          return axiosInstance.post(API_PATHS.TASKS.ATTACHMENTS(taskId), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }));
      }

      setSuccessMessage('Task created successfully! Redirecting...');
      reset();
      setSelectedMembers([]);
      setChecklistItems([]);
      setAttachments([]);
      setTimeout(() => router.push('/tasks'), 800);
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

          {/* Title & Due Date */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
              <input type="text" placeholder="Enter task title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500"
                {...register('due_date')} />
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea placeholder="Task description..." rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none resize-none"
              {...register('description')} />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" {...register('status')}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Assign Members */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Members</label>
            {users.length === 0 ? (
              <p className="text-xs text-gray-400">No members found</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {users.map(user => (
                  <button key={user.id} type="button"
                    onClick={() => toggleMember(user.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedMembers.includes(user.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}>
                    {user.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* To-Do Checklist */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">To-Do Checklist</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={checklistInput}
                onChange={e => setChecklistInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                placeholder="Add checklist item..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none" />
              <button type="button" onClick={addChecklistItem}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                Add
              </button>
            </div>
            {checklistItems.length > 0 && (
              <ul className="space-y-1">
                {checklistItems.map(item => (
                  <li key={item.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                    <span className="text-sm flex-1">{item.title}</span>
                    <button type="button" onClick={() => removeChecklistItem(item.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* File Attachments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">File Attachments</label>
            <input type="file" multiple onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((file, index) => (
                  <li key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(index)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {apiError && <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{apiError}</div>}
          {successMessage && <div className="mb-4 px-3 py-2 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">{successMessage}</div>}

          <button type="submit" disabled={isLoading}
            className="px-8 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition disabled:opacity-60">
            {isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
