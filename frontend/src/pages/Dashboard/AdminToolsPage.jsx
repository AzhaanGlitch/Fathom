// frontend/src/pages/Dashboard/AdminToolsPage.jsx
// One-shot admin page to clean up duplicate mentor records in the DB.
// Add route: <Route path="admin-tools" element={<AdminToolsPage />} />
// Add sidebar link in DashboardLayout for role="admin"

import React, { useState, useEffect, useCallback } from 'react';
import {
    Wrench, AlertTriangle, CheckCircle, Loader, Trash2,
    Users, RefreshCw, ShieldAlert, ChevronDown, ChevronUp,
} from 'lucide-react';
import apiClient, { mentorApi } from '../../api/client';

const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-md rounded-2xl p-6 ${className}`}>
        {children}
    </div>
);

const StatusBadge = ({ type, message }) => {
    const styles = {
        success: 'bg-green-500/15 border-green-500/30 text-green-400',
        error: 'bg-red-500/15   border-red-500/30   text-red-400',
        info: 'bg-blue-500/15  border-blue-500/30  text-blue-400',
        warn: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
    };
    const Icon = type === 'success' ? CheckCircle : type === 'error' ? ShieldAlert : AlertTriangle;
    return (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${styles[type]}`}>
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{message}</span>
        </div>
    );
};

const AdminToolsPage = () => {
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deduping, setDeduping] = useState(false);
    const [dedupResult, setDedupResult] = useState(null);
    const [dedupError, setDedupError] = useState('');
    const [showMentorList, setShowMentorList] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchMentors = useCallback(async () => {
        try {
            setLoading(true);
            const res = await mentorApi.getAll();
            setMentors(res.data || []);
        } catch {
            setMentors([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMentors(); }, [fetchMentors]);

    // Group mentors by owner_uid to surface duplicates
    const grouped = React.useMemo(() => {
        const map = {};
        for (const m of mentors) {
            const key = m.owner_uid || '__no_uid__';
            if (!map[key]) map[key] = [];
            map[key].push(m);
        }
        return map;
    }, [mentors]);

    const duplicateGroups = Object.entries(grouped).filter(([, list]) => list.length > 1);
    const totalDuplicates = duplicateGroups.reduce((s, [, list]) => s + list.length - 1, 0);

    const handleDedup = async () => {
        if (!window.confirm(
            `This will merge ${totalDuplicates} duplicate mentor record${totalDuplicates !== 1 ? 's' : ''} and re-link their sessions to the canonical record. Continue?`
        )) return;

        setDeduping(true);
        setDedupResult(null);
        setDedupError('');
        try {
            const res = await apiClient.post('/api/mentors/dedup');
            setDedupResult(res.data);
            await fetchMentors();
        } catch (err) {
            setDedupError(err?.response?.data?.detail || err.message || 'Deduplication failed');
        } finally {
            setDeduping(false);
        }
    };

    const handleDeleteMentor = async (id) => {
        if (!window.confirm('Permanently delete this mentor record? Their sessions will be unlinked.')) return;
        try {
            setDeletingId(id);
            await mentorApi.delete(id);
            await fetchMentors();
        } catch (err) {
            alert('Delete failed: ' + (err?.response?.data?.detail || err.message));
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (iso) =>
        iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2 flex items-center gap-3">
                    <Wrench className="w-8 h-8 text-orange-400" />
                    Admin Tools
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Database maintenance utilities. Use these to fix data integrity issues.
                </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5">
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Total Mentors</span>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{loading ? '—' : mentors.length}</span>
                </div>
                <div className={`border rounded-xl p-5 ${duplicateGroups.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Duplicate Groups</span>
                    <span className={`text-3xl font-bold ${duplicateGroups.length > 0 ? 'text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {loading ? '—' : duplicateGroups.length}
                    </span>
                </div>
                <div className={`border rounded-xl p-5 ${totalDuplicates > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Records to Remove</span>
                    <span className={`text-3xl font-bold ${totalDuplicates > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {loading ? '—' : totalDuplicates}
                    </span>
                </div>
            </div>

            {/* Dedup tool */}
            <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                                <Users className="w-5 h-5 text-orange-400" />
                                Deduplicate Mentor Records
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
                                Finds all mentor records that share the same <code className="text-orange-300 bg-gray-100 dark:bg-white/5 px-1 rounded text-xs">owner_uid</code> and
                                merges them into one. The record with the most sessions is kept; all others are deleted and their sessions are re-linked to the winner.
                            </p>
                        </div>
                        <button
                            onClick={fetchMentors}
                            disabled={loading}
                            className="p-2 hover:bg-gray-200 dark:bg-white/10 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {totalDuplicates === 0 && !loading && (
                        <StatusBadge type="success" message="No duplicates found — your database is clean." />
                    )}

                    {totalDuplicates > 0 && (
                        <StatusBadge
                            type="warn"
                            message={`Found ${duplicateGroups.length} owner UID${duplicateGroups.length !== 1 ? 's' : ''} with duplicate records (${totalDuplicates} extra record${totalDuplicates !== 1 ? 's' : ''} will be removed).`}
                        />
                    )}

                    {dedupResult && (
                        <div className="mt-3">
                            <StatusBadge
                                type="success"
                                message={`Done! Merged ${dedupResult.groups_merged} group${dedupResult.groups_merged !== 1 ? 's' : ''}, deleted ${dedupResult.duplicates_deleted} duplicate${dedupResult.duplicates_deleted !== 1 ? 's' : ''}.`}
                            />
                        </div>
                    )}

                    {dedupError && (
                        <div className="mt-3">
                            <StatusBadge type="error" message={dedupError} />
                        </div>
                    )}

                    <button
                        onClick={handleDedup}
                        disabled={deduping || totalDuplicates === 0 || loading}
                        className={`mt-5 flex items-center gap-2 px-7 py-3 rounded-xl font-bold transition-all ${totalDuplicates === 0 || loading
                                ? 'bg-gray-100 dark:bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                : 'bg-orange-500 hover:bg-orange-400 text-gray-900 dark:text-white shadow-lg active:scale-95'
                            }`}
                    >
                        {deduping ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {deduping ? 'Merging…' : `Merge ${totalDuplicates} Duplicate${totalDuplicates !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </GlassCard>

            {/* Duplicate detail list */}
            {duplicateGroups.length > 0 && (
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowMentorList(v => !v)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-100 dark:bg-white/5 transition-colors"
                    >
                        <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            Duplicate Details ({duplicateGroups.length} groups)
                        </span>
                        {showMentorList ? <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                    </button>

                    {showMentorList && (
                        <div className="divide-y divide-white/5">
                            {duplicateGroups.map(([ownerUid, list]) => (
                                <div key={ownerUid} className="px-6 py-4">
                                    <p className="text-xs text-gray-500 font-mono mb-3">
                                        owner_uid: <span className="text-gray-700 dark:text-gray-300">{ownerUid}</span>
                                        <span className="ml-3 text-red-400 font-sans font-semibold">{list.length} records</span>
                                    </p>
                                    <div className="space-y-2">
                                        {list
                                            .sort((a, b) => (b.total_sessions || 0) - (a.total_sessions || 0))
                                            .map((m, idx) => (
                                                <div
                                                    key={m.id}
                                                    className={`flex items-center justify-between px-4 py-3 rounded-xl border ${idx === 0
                                                            ? 'border-green-500/30 bg-green-500/5'
                                                            : 'border-red-500/20 bg-red-500/5'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {idx === 0 ? 'KEEP' : 'REMOVE'}
                                                        </span>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</p>
                                                            <p className="text-xs text-gray-500">{m.email} · {m.total_sessions || 0} sessions · created {formatDate(m.created_at)}</p>
                                                        </div>
                                                    </div>
                                                    {idx !== 0 && (
                                                        <button
                                                            onClick={() => handleDeleteMentor(m.id)}
                                                            disabled={deletingId === m.id}
                                                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors disabled:opacity-40"
                                                            title="Delete this record manually"
                                                        >
                                                            {deletingId === m.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* All mentors table */}
            <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowMentorList(v => !v)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-100 dark:bg-white/5 transition-colors"
                >
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        All Mentor Records ({mentors.length})
                    </span>
                    {showMentorList ? <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                </button>

                {showMentorList && (
                    loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-400 gap-3">
                            <Loader className="w-5 h-5 animate-spin" /><span>Loading…</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-t border-gray-200 dark:border-white/10">
                                        {['Name', 'Email', 'owner_uid', 'Sessions', 'Avg Score', 'Created', ''].map(h => (
                                            <th key={h} className="text-left px-5 py-3 text-gray-500 font-semibold uppercase tracking-wider text-xs">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {mentors.map(m => {
                                        const isDupe = (grouped[m.owner_uid] || []).length > 1;
                                        return (
                                            <tr key={m.id} className={`group hover:bg-gray-100 dark:bg-white/5 transition-colors ${isDupe ? 'bg-red-500/5' : ''}`}>
                                                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{m.name}</td>
                                                <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{m.email}</td>
                                                <td className="px-5 py-3 text-gray-500 font-mono text-xs truncate max-w-[120px]">{m.owner_uid || '—'}</td>
                                                <td className="px-5 py-3 text-gray-900 dark:text-white">{m.total_sessions || 0}</td>
                                                <td className="px-5 py-3 text-gray-900 dark:text-white">{m.average_score ? m.average_score.toFixed(1) : '—'}</td>
                                                <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(m.created_at)}</td>
                                                <td className="px-5 py-3">
                                                    <button
                                                        onClick={() => handleDeleteMentor(m.id)}
                                                        disabled={deletingId === m.id}
                                                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                                                    >
                                                        {deletingId === m.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Info box */}
            <div className="p-5 bg-gray-100 dark:bg-white/5 border border-white/5 rounded-2xl text-xs text-gray-500 leading-relaxed space-y-1">
                <p><strong className="text-gray-700 dark:text-gray-300">Why do duplicates happen?</strong> Each call to <code className="text-orange-300">POST /api/mentors</code> previously always inserted a new record. After the fix, the backend checks for an existing <code className="text-orange-300">owner_uid</code> first and returns the existing record instead of creating a new one.</p>
                <p><strong className="text-gray-700 dark:text-gray-300">What does Merge do?</strong> For each group of duplicates it keeps the record with the most sessions (the "real" one), re-points all <code className="text-orange-300">sessions.mentor_id</code> foreign keys to the winner, then deletes the empty duplicates.</p>
            </div>
        </div>
    );
};

export default AdminToolsPage;