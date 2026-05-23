'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useState } from 'react';

export default function CalendarPage() {
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();
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
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="text-gray-400 hover:text-gray-600 text-xl">‹</button>
          <h2 className="text-lg font-semibold">{monthNames[month]} {year}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="text-gray-400 hover:text-gray-600 text-xl">›</button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs font-semibold text-gray-400 pb-3">{d}</div>
          ))}
          {days.map((d, i) => {
            const isToday = d === todayDate && month === todayMonth && year === todayYear;
            return (
            <div key={i} className={`py-3 text-sm rounded-lg cursor-pointer ${
              isToday ? 'bg-indigo-600 text-white font-bold' :
              d ? 'hover:bg-indigo-50 text-gray-700' : ''
            }`}>
              {d || ''}
            </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}