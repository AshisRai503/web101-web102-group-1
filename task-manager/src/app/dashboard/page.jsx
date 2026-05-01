'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { useState } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const stats = [
  { label: 'Total Tasks', value: 18, color: 'border-l-indigo-500' },
  { label: 'Pending Tasks', value: 11, color: 'border-l-amber-500' },
  { label: 'In Progress', value: 5, color: 'border-l-purple-500' },
  { label: 'Completed Tasks', value: 2, color: 'border-l-green-500' },
];

const donutData = {
  labels: ['Pending', 'In Progress', 'Completed'],
  datasets: [{
    data: [11, 5, 2],
    backgroundColor: ['#8b5cf6', '#6366f1', '#10b981'],
    borderWidth: 3,
    borderColor: '#fff',
  }],
};

const barData = {
  labels: ['Low', 'Medium', 'High'],
  datasets: [{
    label: 'Tasks',
    data: [4, 8, 6],
    backgroundColor: ['#a5b4fc', '#6366f1', '#4f46e5'],
    borderRadius: 6,
  }],
};

const upcomingTasks = [
  { title: 'Team Meeting', date: 'Mar 25, 10:00 AM', color: 'bg-indigo-500' },
  { title: 'Project Review', date: 'Mar 26, 2:00 PM', color: 'bg-amber-500' },
  { title: 'Submit Report', date: 'Mar 28, 5:00 PM', color: 'bg-green-500' },
];

function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 2, 1));
  const today = 25;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-gray-600">‹</button>
        <span className="font-semibold text-sm">{monthNames[month]} {year}</span>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-gray-600">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-xs text-gray-400 font-semibold pb-2">{d}</div>
        ))}
        {days.map((d, i) => (
          <div key={i} className={`py-2 text-sm rounded-md ${
            d === today ? 'bg-indigo-600 text-white font-bold' :
            d ? 'text-gray-700 hover:bg-gray-100 cursor-pointer' : ''
          }`}>
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <DashboardLayout>
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{greeting}! Ashis</h1>
        <p className="text-gray-500 mt-1">{dateStr}</p>
        <div className="flex gap-8 mt-6">
          {stats.map(s => (
            <div key={s.label} className={`flex items-center gap-2 border-l-4 pl-3 ${s.color}`}>
              <div>
                <span className="text-2xl font-bold text-gray-900">{s.value} </span>
                <span className="text-sm text-gray-500">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Task Distribution</h3>
          <div className="w-48 mx-auto">
            <Doughnut data={donutData} options={{ plugins: { legend: { position: 'bottom' } }, cutout: '65%' }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Task Priority Levels</h3>
          <Bar data={barData} options={{
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 10 } },
          }} />
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Calendar</h3>
        <CalendarWidget />
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Upcoming Tasks</h3>
        {upcomingTasks.map(t => (
          <div key={t.title} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
            <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
            <div>
              <p className="font-medium text-sm text-gray-800">{t.title}</p>
              <p className="text-xs text-gray-400">{t.date}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}