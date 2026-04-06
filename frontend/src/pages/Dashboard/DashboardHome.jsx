// frontend/src/pages/Dashboard/DashboardHome.jsx
// KEY CHANGES:
//  - Non-admin users see stats only for their own mentor/sessions
//  - Admin users see aggregate stats (unchanged)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Video, Award, CheckCircle, Activity,
  ArrowUpRight, Clock, Calendar, MoreVertical, User, FileDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { mentorApi, sessionApi, evaluationApi } from '../../api/client';
import { auth } from '../../lib/firebase';
import { downloadElementAsPDF } from '../../lib/reportGenerator';

const DashboardHome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalMentors: 0,
    totalSessions: 0,
    averageScore: 0,
    completedSessions: 0,
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [myMentor, setMyMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const [activeUsersData, setActiveUsersData] = useState([
    { category: 'Sessions', value: 0, color: '#8b5cf6' },
    { category: 'Completed', value: 0, color: '#10b981' },
    { category: 'Processing', value: 0, color: '#f59e0b' },
    { category: 'Pending', value: 0, color: '#6b7280' },
  ]);

  const userRole = localStorage.getItem('userRole') || 'institution-faculty';
  const isAdmin = userRole === 'admin';
  const storedMentorId = localStorage.getItem('mentorId');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    fetchDashboardData();
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (isAdmin) {
        // ── Admin: aggregate view ──────────────────────────────────────────
        const [mentorsRes, sessionsRes] = await Promise.all([
          mentorApi.getAll(),
          sessionApi.getAll(),
        ]);
        
        // Exclude solo-faculty from admin view
        const mentors = mentorsRes.data.filter(m => m.role !== 'solo-faculty');
        const validMentorIds = new Set(mentors.map(m => m.id || m._id));
        const sessions = sessionsRes.data.filter(s => validMentorIds.has(s.mentor_id));
        
        const completedSessions = sessions.filter(s => s.status === 'completed');
        const analyzingSessions = sessions.filter(s => ['analyzing', 'transcribing'].includes(s.status));
        const mentorsWithScores = mentors.filter(m => m.average_score);
        const avgScore = mentorsWithScores.length > 0
          ? mentorsWithScores.reduce((sum, m) => sum + m.average_score, 0) / mentorsWithScores.length
          : 0;

        setStats({ totalMentors: mentors.length, totalSessions: sessions.length, averageScore: avgScore, completedSessions: completedSessions.length });
        setActiveUsersData([
          { category: 'Mentors', value: mentors.length, color: '#3b82f6' },
          { category: 'Sessions', value: sessions.length, color: '#8b5cf6' },
          { category: 'Completed', value: completedSessions.length, color: '#10b981' },
          { category: 'Processing', value: analyzingSessions.length, color: '#f59e0b' },
        ]);
        const sorted = [...sessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRecentSessions(sorted.slice(0, 5));

      } else {
        // ── Faculty: own mentor only ───────────────────────────────────────
        if (!storedMentorId) { setLoading(false); return; }

        const [mentorRes, sessionsRes] = await Promise.all([
          mentorApi.getById(storedMentorId),
          sessionApi.getAll({ mentor_id: storedMentorId }),
        ]);

        const mentor = mentorRes.data;
        const sessions = sessionsRes.data;
        setMyMentor(mentor);

        const completedSessions = sessions.filter(s => s.status === 'completed');
        const analyzingSessions = sessions.filter(s => ['analyzing', 'transcribing'].includes(s.status));
        const pendingSessions = sessions.filter(s => s.status === 'uploaded');

        // Try to get evaluations for average score
        let avgScore = mentor.average_score || 0;
        try {
          const evalsRes = await evaluationApi.getAll({ mentor_id: storedMentorId });
          const evals = evalsRes.data;
          if (evals.length > 0) {
            avgScore = evals.reduce((sum, e) => sum + e.overall_score, 0) / evals.length;
          }
        } catch (_) { /* use mentor average_score fallback */ }

        setStats({ totalMentors: 1, totalSessions: sessions.length, averageScore: avgScore, completedSessions: completedSessions.length });
        setActiveUsersData([
          { category: 'Sessions', value: sessions.length, color: '#8b5cf6' },
          { category: 'Completed', value: completedSessions.length, color: '#10b981' },
          { category: 'Processing', value: analyzingSessions.length, color: '#f59e0b' },
          { category: 'Pending', value: pendingSessions.length, color: '#6b7280' },
        ]);
        const sorted = [...sessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRecentSessions(sorted.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'analyzing':
      case 'transcribing': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      const element = document.getElementById('dashboard-report-content');
      const filename = isAdmin ? 'institutional_dashboard_report.pdf' : `${myMentor?.name?.replace(/\s+/g, '_') || 'faculty'}_dashboard_report.pdf`;
      await downloadElementAsPDF(element, filename);
    } catch (err) {
      console.error('Failed to download report', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, colorClass }) => (
    <GlassCard className="relative overflow-hidden group hover:bg-gray-200 dark:bg-white/10 transition-colors">
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-white/5 ${colorClass}`}>
            <Icon className="w-5 h-5 text-gray-900 dark:text-white" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
        </div>
        <div className="flex items-end gap-3">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
          <div className={`flex items-center text-xs font-medium mb-1 ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : null}
            <span>{trendValue}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10" id="dashboard-report-content">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back,{' '}
            <span className="text-gray-900 dark:text-white font-medium">
              {isAdmin ? (user?.displayName || 'Admin') : (myMentor?.name || user?.displayName || 'User')}
            </span>.
            {!isAdmin && myMentor && (
              <span className="ml-2 text-blue-400 text-sm">Viewing your faculty profile</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className={`px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 w-fit ${downloadingReport ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FileDown className="w-4 h-4" />
            {downloadingReport ? 'Generating...' : 'Download Report'}
          </button>
          <button
            onClick={() => navigate('/dashboard/sessions')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-gray-900 dark:text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2 w-fit"
          >
            <Video className="w-4 h-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Non-admin: faculty profile chip */}
      {!isAdmin && myMentor && (
        <GlassCard className="flex items-center gap-4 py-4 border-blue-500/20 bg-blue-500/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-900 dark:text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-400 font-medium uppercase tracking-wider mb-0.5">Your Faculty Profile</p>
            <p className="text-gray-900 dark:text-white font-semibold truncate">{myMentor.name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500">All stats below are scoped to your profile</p>
          </div>
        </GlassCard>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && (
          <StatCard title="Total Mentors" value={stats.totalMentors} icon={Users} trend="up" trendValue="+12%" colorClass="text-blue-500" />
        )}
        <StatCard title={isAdmin ? 'Total Sessions' : 'My Sessions'} value={stats.totalSessions} icon={Video} trend="up" trendValue="+5%" colorClass="text-purple-500" />
        <StatCard title="Avg. Score" value={stats.averageScore.toFixed(1)} icon={Award} trend="up" trendValue="+0.4" colorClass="text-amber-500" />
        <StatCard
          title="Completion Rate"
          value={`${stats.totalSessions ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}%`}
          icon={CheckCircle} trend="up" trendValue="+2%" colorClass="text-emerald-500"
        />
        {!isAdmin && (
          <StatCard title="Completed" value={stats.completedSessions} icon={CheckCircle} trend="up" trendValue="" colorClass="text-green-500" />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{isAdmin ? 'Platform Activity' : 'My Session Activity'}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overview of current metrics</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeUsersData.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.category}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeUsersData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {activeUsersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Gauge */}
        <GlassCard className="flex flex-col items-center justify-center relative">
          <h3 className="absolute top-6 left-6 text-lg font-semibold text-gray-900 dark:text-white">
            {isAdmin ? 'Satisfaction' : 'My Score'}
          </h3>
          <div className="relative w-48 h-48 mt-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="70" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
              <circle
                cx="96" cy="96" r="70"
                stroke="url(#satisfaction-gradient)"
                strokeWidth="12" fill="none"
                strokeDasharray={`${2 * Math.PI * 70 * Math.min(stats.averageScore / 10, 1)} ${2 * Math.PI * 70}`}
                strokeLinecap="round"
                className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              />
              <defs>
                <linearGradient id="satisfaction-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter">{stats.averageScore.toFixed(1)}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-medium mt-1">/ 10</span>
            </div>
          </div>
          <div className="w-full mt-8 px-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
              <span>{isAdmin ? 'All mentors avg' : 'Your avg score'}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(stats.averageScore * 10, 100)}%` }} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Recent Sessions */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sessions</h3>
          <button onClick={() => navigate('/dashboard/sessions')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-medium">
              <tr>
                <th className="px-6 py-4">Session Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-100 dark:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
                        className="p-2 hover:bg-gray-200 dark:bg-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No recent sessions found.{' '}
                    <button onClick={() => navigate('/dashboard/sessions')} className="text-blue-400 hover:underline">
                      Upload your first session
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default DashboardHome;