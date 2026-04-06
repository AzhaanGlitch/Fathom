import React from 'react';
import {
  Video, Award, CheckCircle, Activity,
  Calendar, Clock, User
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Cell
} from 'recharts';

export const MentorReportTemplate = ({ mentor, sessions, stats, activeUsersData, recentSessions }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-emerald-500 bg-emerald-50 border-emerald-200';
      case 'failed': return 'text-red-500 bg-red-50 border-red-200';
      case 'analyzing':
      case 'transcribing': return 'text-amber-500 bg-amber-50 border-amber-200';
      default: return 'text-blue-500 bg-blue-50 border-blue-200';
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-gray-100 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-500">{title}</span>
      </div>
      <div className="flex items-end gap-3 mt-2">
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-10 bg-white min-h-screen text-gray-900 font-sans">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Faculty Performance Report</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="font-semibold text-gray-900">{mentor?.name || 'Unknown Faculty'}</span>
            <span className="mx-2 text-gray-300">•</span>
            {mentor?.email}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
          <div className="mt-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
            Institution Copy
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Sessions" value={stats.totalSessions} icon={Video} colorClass="text-purple-600" />
        <StatCard title="Avg. Score" value={stats.averageScore.toFixed(1)} icon={Award} colorClass="text-amber-600" />
        <StatCard
          title="Completion Rate"
          value={`${stats.totalSessions ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}%`}
          icon={CheckCircle} colorClass="text-emerald-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-2 border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Session Activity</h3>
              <p className="text-sm text-gray-500">Breakdown of session statuses</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeUsersData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="category" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {activeUsersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gauge (Simplified for PDF) */}
        <div className="border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center relative">
          <h3 className="absolute top-6 left-6 text-lg font-semibold text-gray-900">Overall Score</h3>
          <div className="mt-10 flex flex-col items-center justify-center">
             <div className="w-32 h-32 rounded-full border-8 border-blue-100 flex items-center justify-center">
               <div className="text-center">
                 <span className="text-4xl font-bold text-blue-600">{stats.averageScore.toFixed(1)}</span>
                 <span className="block text-xs uppercase tracking-wider font-medium text-gray-500 mt-1">/ 10</span>
               </div>
             </div>
          </div>
          <div className="w-full mt-8 px-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Performance</span>
              <span className="font-semibold text-blue-600">{Math.min(stats.averageScore * 10, 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(stats.averageScore * 10, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="mt-6 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
        </div>
        <div className="p-0">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Session Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {session.title || 'Untitled Session'}
                      <div className="text-xs text-gray-500 font-normal mt-0.5">{session.topic || 'No topic'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {session.duration ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No sessions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
