import DashboardLayout from '../../components/layout/DashboardLayout';

const members = [
  { id: 1, name: 'Ashis', email: 'ashis@timetoprogram.com', role: 'admin' },
  { id: 2, name: 'Ugyen', email: 'Ugyen@example.com', role: 'member' },
  { id: 3, name: 'Kinley', email: 'Kinley@example.com', role: 'member' },
  { id: 4, name: 'Bishal', email: 'Bishal@example.com', role: 'member' },
];

export default function TeamPage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team Members</h1>
      <div className="grid grid-cols-4 gap-6">
        {members.map(m => (
          <div key={m.id} className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3">
              {m.name.charAt(0)}
            </div>
            <p className="font-semibold text-gray-800">{m.name}</p>
            <p className="text-xs text-gray-400 mt-1">{m.email}</p>
            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase ${
              m.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
            }`}>{m.role}</span>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}