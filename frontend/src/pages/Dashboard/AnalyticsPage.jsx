// frontend/src/pages/Dashboard/AnalyticsPage.jsx
// KEY CHANGES:
//  - Non-admin users see only their own sessions / evaluations
//  - Admin users still see the full platform view

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Video, Award, Activity, Target, User, FileDown
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { mentorApi, sessionApi, evaluationApi } from '../../api/client';
import { generateFacultyReport, generateInstitutionalReport } from '../../lib/reportGenerator';

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState({
    totalMentors: 0,
    totalSessions: 0,
    averageScore: 0,
    completionRate: 0,
    trendData: [],
    mentorPerformance: [],
    scoreDistribution: [],
    sessionsByStatus: [],
  });
  const [myMentor, setMyMentor] = useState(null);

  const userRole = localStorage.getItem('userRole') || 'institution-faculty';
  const isAdmin = userRole === 'admin';
  const storedMentorId = localStorage.getItem('mentorId');

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      if (isAdmin) {
        // ── Admin: full platform ──────────────────────────────────────────
        const [mentorsRes, sessionsRes, evaluationsRes] = await Promise.all([
          mentorApi.getAll(),
          sessionApi.getAll(),
          evaluationApi.getAll(),
        ]);
        // Exclude solo-faculty from admin view
        const validMentors = mentorsRes.data.filter(m => m.role !== 'solo-faculty');
        const validMentorIds = new Set(validMentors.map(m => m.id || m._id));
        const validSessions = sessionsRes.data.filter(s => validMentorIds.has(s.mentor_id));
        
        // For evaluations, map back to valid sessions
        const validSessionIds = new Set(validSessions.map(s => s.id || s._id));
        const validEvaluations = evaluationsRes.data.filter(e => validSessionIds.has(e.session_id));

        buildAnalytics(validMentors, validSessions, validEvaluations);
      } else {
        // ── Faculty: own data only ────────────────────────────────────────
        if (!storedMentorId) { setLoading(false); return; }
        const [mentorRes, sessionsRes, evaluationsRes] = await Promise.all([
          mentorApi.getById(storedMentorId),
          sessionApi.getAll({ mentor_id: storedMentorId }),
          evaluationApi.getAll({ mentor_id: storedMentorId }).catch(() => ({ data: [] })),
        ]);
        const mentor = mentorRes.data;
        setMyMentor(mentor);
        // Wrap single mentor in array so buildAnalytics can handle it uniformly
        buildAnalytics([mentor], sessionsRes.data, evaluationsRes.data, true);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildAnalytics = (mentors, sessions, evaluations, isFaculty = false) => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const avgScore = evaluations.length
      ? evaluations.reduce((sum, e) => sum + e.overall_score, 0) / evaluations.length
      : (mentors[0]?.average_score || 0);
    const completionRate = sessions.length ? (completedSessions.length / sessions.length) * 100 : 0;

    const trendData = generateTrendData(parseInt(timeRange) || 30);

    const mentorPerformance = mentors
      .map(m => ({ name: m.name.split(' ')[0], score: m.average_score || 0, sessions: m.total_sessions || 0 }))
      .slice(0, 10);

    const scoreDistribution = [
      { range: '9-10', count: evaluations.filter(e => e.overall_score >= 9).length },
      { range: '7-8.9', count: evaluations.filter(e => e.overall_score >= 7 && e.overall_score < 9).length },
      { range: '5-6.9', count: evaluations.filter(e => e.overall_score >= 5 && e.overall_score < 7).length },
      { range: '0-4.9', count: evaluations.filter(e => e.overall_score < 5).length },
    ];

    const sessionsByStatus = [
      { name: 'Completed', value: sessions.filter(s => s.status === 'completed').length, color: '#10b981' },
      { name: 'Analyzing', value: sessions.filter(s => s.status === 'analyzing').length, color: '#8b5cf6' },
      { name: 'Transcribing', value: sessions.filter(s => s.status === 'transcribing').length, color: '#3b82f6' },
      { name: 'Uploaded', value: sessions.filter(s => s.status === 'uploaded').length, color: '#6b7280' },
      { name: 'Failed', value: sessions.filter(s => s.status === 'failed').length, color: '#ef4444' },
    ];

    setAnalyticsData({
      totalMentors: mentors.length,
      totalSessions: sessions.length,
      averageScore: avgScore,
      completionRate,
      trendData,
      mentorPerformance,
      scoreDistribution,
      sessionsByStatus,
    });
  };

  const generateTrendData = (days) => {
    const data = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: Math.floor(Math.random() * 10) + 5,
        score: (Math.random() * 2 + 7).toFixed(1),
      });
    }
    return data;
  };

  const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-sm rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      purple: 'from-purple-500 to-purple-600',
      green: 'from-green-500 to-green-600',
      orange: 'from-orange-500 to-orange-600',
    };
    return (
      <GlassCard className="relative overflow-hidden group hover:bg-gray-200 dark:bg-white/10 hover:border-gray-300 dark:border-white/20 transition-all">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
              {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
              <Icon className="w-6 h-6 text-gray-900 dark:text-white" />
            </div>
          </div>
          {trend && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">{trend}</span>
            </div>
          )}
        </div>
      </GlassCard>
    );
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'rgba(0,0,0,0.9)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      color: '#fff',
      backdropFilter: 'blur(10px)',
    },
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      if (isAdmin) {
        await generateInstitutionalReport({
          stats: {
            totalMentors: analyticsData.totalMentors,
            totalSessions: analyticsData.totalSessions,
            averageScore: analyticsData.averageScore,
            completionRate: analyticsData.completionRate,
          },
          mentorPerformance: analyticsData.mentorPerformance,
          scoreDistribution: analyticsData.scoreDistribution,
          sessionsByStatus: analyticsData.sessionsByStatus,
          trendData: analyticsData.trendData,
        });
      } else {
        await generateFacultyReport({
          mentor: myMentor,
          stats: {
            totalSessions: analyticsData.totalSessions,
            averageScore: analyticsData.averageScore,
            completedSessions: Math.round((analyticsData.completionRate / 100) * analyticsData.totalSessions),
          },
          sessionBreakdown: analyticsData.sessionsByStatus?.map(s => ({ category: s.name, value: s.value, color: s.color })),
        });
      }
    } catch (err) {
      console.error('Failed to download report', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10" id="analytics-report-content">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
            {isAdmin ? 'Platform Analytics' : 'My Analytics'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isAdmin
              ? 'Comprehensive performance insights across all mentors'
              : `Performance insights for ${myMentor?.name || 'your profile'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className={`px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl font-medium transition-colors text-sm flex items-center gap-2 w-fit backdrop-blur-sm ${downloadingReport ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FileDown className="w-4 h-4" />
            {downloadingReport ? 'Generating...' : 'Download Report'}
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Faculty profile banner */}
      {!isAdmin && myMentor && (
        <GlassCard className="flex items-center gap-4 py-4 border-blue-500/20 bg-blue-500/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-900 dark:text-white" />
          </div>
          <div>
            <p className="text-xs text-blue-400 font-medium uppercase tracking-wider mb-0.5">Viewing analytics for</p>
            <p className="text-gray-900 dark:text-white font-semibold">{myMentor.name}</p>
          </div>
        </GlassCard>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin && (
          <StatCard title="Total Mentors" value={analyticsData.totalMentors} subtitle="Active users" icon={Users} trend="+12% this month" color="blue" />
        )}
        <StatCard title={isAdmin ? 'Total Sessions' : 'My Sessions'} value={analyticsData.totalSessions} subtitle="All time" icon={Video} trend="+8% this month" color="purple" />
        <StatCard title="Average Score" value={analyticsData.averageScore.toFixed(1)} subtitle="Out of 10" icon={Award} trend="+0.5 improvement" color="green" />
        <StatCard title="Completion Rate" value={`${analyticsData.completionRate.toFixed(0)}%`} subtitle="Sessions completed" icon={Target} trend="+5% this month" color="orange" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="hover:bg-gray-200 dark:bg-white/10 hover:border-gray-300 dark:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Performance Trend</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sessions over time</p>
            </div>
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.trendData}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSessions)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="hover:bg-gray-200 dark:bg-white/10 hover:border-gray-300 dark:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Sessions by Status</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current distribution</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.sessionsByStatus.filter(s => s.value > 0)}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={5} dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {analyticsData.sessionsByStatus.filter(s => s.value > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin && (
          <GlassCard className="hover:bg-gray-200 dark:bg-white/10 hover:border-gray-300 dark:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Top Performing Mentors</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">By average score</p>
              </div>
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.mentorPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="score" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        )}

        <GlassCard className={`hover:bg-gray-200 dark:bg-white/10 hover:border-gray-300 dark:border-white/20 transition-all ${!isAdmin ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Score Distribution</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Evaluation score ranges</p>
            </div>
            <Award className="w-6 h-6 text-orange-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-500/10 border border-green-500/20 backdrop-blur-sm rounded-2xl p-6 hover:bg-green-500/20 hover:border-green-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg"><TrendingUp className="w-6 h-6 text-green-400" /></div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Insight</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            {analyticsData.averageScore >= 7
              ? 'Great work! Average scores are above 7. Keep maintaining quality teaching.'
              : 'There\'s room to improve. Focus on clarity and structure to boost your score.'}
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm rounded-2xl p-6 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Video className="w-6 h-6 text-blue-400" /></div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isAdmin ? 'Most Active' : 'Your Activity'}</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            {isAdmin
              ? `${analyticsData.mentorPerformance[0]?.name || 'N/A'} has the highest performance score this period.`
              : `You have ${analyticsData.totalSessions} session${analyticsData.totalSessions !== 1 ? 's' : ''} recorded. ${analyticsData.completionRate.toFixed(0)}% are fully evaluated.`}
          </p>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm rounded-2xl p-6 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg"><Target className="w-6 h-6 text-purple-400" /></div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Goal Progress</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            {analyticsData.completionRate.toFixed(0)}% completion rate. Target: 85%
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;