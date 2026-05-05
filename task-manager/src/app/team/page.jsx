'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axiosInstance from '../../lib/axios';
import { API_PATHS } from '../../lib/apiPaths';
import getErrorMessage from '../../lib/getErrorMessage';

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const res = await axiosInstance.get(API_PATHS.USERS.LIST);
        if (mounted) setMembers(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (err) {
        if (mounted) {
          // GET /users requires admin — surface the backend message so members
          // see the "admins only" hint instead of an empty grid.
          setErrorMessage(getErrorMessage(err, 'Failed to load team members.'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team Members</h1>

      {errorMessage && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading team...</p>
      ) : members.length === 0 && !errorMessage ? (
        <p className="text-sm text-gray-400">No team members found.</p>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3">
                {(m.name || '?').charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold text-gray-800">{m.name}</p>
              <p className="text-xs text-gray-400 mt-1 truncate">{m.email}</p>
              <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                m.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
              }`}>{m.role || 'member'}</span>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
