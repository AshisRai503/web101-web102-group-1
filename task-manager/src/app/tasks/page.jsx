'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useState } from 'react';

const sampleTasks = [
  { id: 1, title: 'Design Homepage', priority: 'high', status: 'in-progress', due_date: '2025-03-28' },
  { id: 2, title: 'Write API Docs', priority: 'medium', status: 'pending', due_date: '2025-03-30' },
  { id: 3, title: 'Fix Login Bug', priority: 'high', status: 'completed', due_date: '2025-03-25' },
  { id: 4, title: 'Update README', priority: 'low', status: 'pending', due_date: '2025-04-01' },
];

export default function TasksPage() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? sampleTasks : sampleTasks.filter(t => t.status === filter);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Tasks</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'in-progress', 'completed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm ${
              filter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {['Title', 'Priority', 'Status', 'Due Date', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(task => (
              <tr key={task.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-sm text-gray-800">{task.title}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    task.priority === 'high' ? 'bg-red-100 text-red-600' :
                    task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-green-100 text-green-600'
                  }`}>{task.priority}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    task.status === 'completed' ? 'bg-green-100 text-green-600' :
                    task.status === 'in-progress' ? 'bg-purple-100 text-purple-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>{task.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{task.due_date}</td>
                <td className="px-4 py-3">
                  <button className="px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-md mr-2 hover:bg-indigo-700">Edit</button>
                  <button className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-600 rounded-md hover:bg-red-200">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}