// frontend/src/pages/Dashboard/AccessCodeGenerator.jsx
// Auto-saves to database immediately after hash is generated — no manual Save button.

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield, Key, Copy, Check, RefreshCw, Type,
    Loader, Trash2, XCircle, CheckCircle, AlertTriangle,
    Users, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { accessCodeApi } from '../../api/client';

// ── helpers ────────────────────────────────────────────────────────────────────

const GlassCard = ({ children, className = '' }) => (
    <div className={`bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 ${className}`}>
        {children}
    </div>
);

const Badge = ({ active }) =>
    active ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Revoked
        </span>
    );

const Toast = ({ type, message, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    const styles = {
        success: 'bg-green-500/20 border-green-500/40 text-green-300',
        error: 'bg-red-500/20 border-red-500/40 text-red-300',
        info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    };
    const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertTriangle;

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${styles[type]}`}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
                <XCircle className="w-4 h-4" />
            </button>
        </div>
    );
};

const SaveStatus = ({ status }) => {
    if (status === 'saving')
        return <span className="flex items-center gap-1.5 text-xs text-blue-400"><Loader className="w-3.5 h-3.5 animate-spin" /> Saving to database…</span>;
    if (status === 'saved')
        return <span className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5" /> Saved to database</span>;
    if (status === 'error')
        return <span className="flex items-center gap-1.5 text-xs text-red-400"><XCircle className="w-3.5 h-3.5" /> Failed to save</span>;
    return null;
};

// ── main component ─────────────────────────────────────────────────────────────

const AccessCodeGenerator = () => {
    const [institutionName, setInstitutionName] = useState('');
    const [description, setDescription] = useState('');
    const [inputText, setInputText] = useState('');

    const [generatedHash, setGeneratedHash] = useState('');
    const [copied, setCopied] = useState(false);

    const [isGenerating, setIsGenerating] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [saveError, setSaveError] = useState('');

    const [codes, setCodes] = useState([]);
    const [loadingCodes, setLoadingCodes] = useState(true);
    const [showTable, setShowTable] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [revokingId, setRevokingId] = useState(null);

    const [toast, setToast] = useState(null);
    const notify = useCallback((type, message) => setToast({ type, message }), []);

    const fetchCodes = useCallback(async () => {
        try {
            setLoadingCodes(true);
            const res = await accessCodeApi.getAll();
            setCodes(res.data || []);
        } catch {
            setCodes([]);
        } finally {
            setLoadingCodes(false);
        }
    }, []);

    useEffect(() => { fetchCodes(); }, [fetchCodes]);

    // Generate hash then immediately save to DB
    const handleGenerate = async () => {
        if (!inputText.trim() || !institutionName.trim()) return;

        setIsGenerating(true);
        setSaveStatus(null);
        setSaveError('');
        setGeneratedHash('');
        setCopied(false);

        // Hash locally — seed never leaves the browser
        const msgUint8 = new TextEncoder().encode(inputText.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hash = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        setGeneratedHash(hash);
        setIsGenerating(false);

        // Auto-save
        setSaveStatus('saving');
        try {
            await accessCodeApi.create({
                institution_name: institutionName.trim(),
                code_hash: hash,
                description: description.trim() || undefined,
            });
            setSaveStatus('saved');
            notify('success', `Access code saved for "${institutionName.trim()}"`);
            setInstitutionName('');
            setDescription('');
            setInputText('');
            await fetchCodes();
        } catch (err) {
            setSaveStatus('error');
            const msg = err?.response?.data?.detail || err?.message || 'Unknown error';
            setSaveError(msg);
            notify('error', `Failed to save: ${msg}`);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        notify('info', 'Hash copied to clipboard');
    };

    const handleRevoke = async (id) => {
        try {
            setRevokingId(id);
            await accessCodeApi.deactivate(id);
            notify('success', 'Access code revoked');
            await fetchCodes();
        } catch {
            notify('error', 'Failed to revoke access code');
        } finally {
            setRevokingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Permanently delete this access code? This cannot be undone.')) return;
        try {
            setDeletingId(id);
            await accessCodeApi.delete(id);
            notify('success', 'Access code deleted');
            await fetchCodes();
        } catch {
            notify('error', 'Failed to delete access code');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const canGenerate = inputText.trim() && institutionName.trim() && !isGenerating && saveStatus !== 'saving';
    const activeCodes = codes.filter(c => c.is_active).length;
    const boundCodes = codes.filter(c => c.bound_to_uid).length;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-500" />
                    Access Code Manager
                </h1>
                <p className="text-gray-400">
                    Generate SHA-256 access codes for institution faculty. Each code is automatically
                    saved to the database the moment it is generated.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Codes', value: codes.length, color: 'text-white' },
                    { label: 'Active', value: activeCodes, color: 'text-green-400' },
                    { label: 'Assigned to users', value: boundCodes, color: 'text-blue-400' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
                        <span className={`text-3xl font-bold ${color}`}>{loadingCodes ? '—' : value}</span>
                    </div>
                ))}
            </div>

            {/* Generator */}
            <GlassCard className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Key className="w-5 h-5 text-blue-400" />
                    Generate New Access Code
                </h2>

                <div className="relative z-10 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Institution / Faculty Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={institutionName}
                            onChange={e => setInstitutionName(e.target.value)}
                            placeholder="e.g. VIT University — Dr. Sharma"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Description <span className="text-gray-600">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. Dept. of Computer Science, Semester 1"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            Secret Seed Text <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={inputText}
                            onChange={e => { setInputText(e.target.value); setSaveStatus(null); setSaveError(''); setGeneratedHash(''); }}
                            placeholder="e.g. faculty ID, email, or passphrase"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                        <p className="text-xs text-gray-600 mt-1.5 italic">
                            Hashed locally — this text is never sent to the server.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className={`flex items-center gap-2 px-7 py-3 rounded-xl font-bold transition-all shadow-lg ${!canGenerate
                                    ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                    : 'bg-white text-black hover:bg-gray-200 active:scale-95'
                                }`}
                        >
                            {isGenerating || saveStatus === 'saving'
                                ? <Loader className="w-4 h-4 animate-spin" />
                                : <Key className="w-4 h-4" />}
                            {isGenerating ? 'Generating…' : saveStatus === 'saving' ? 'Saving…' : 'Generate & Save'}
                        </button>

                        <SaveStatus status={saveStatus} />
                    </div>

                    {saveStatus === 'error' && saveError && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-400">Could not save to database</p>
                                <p className="text-xs text-gray-400 mt-0.5">{saveError}</p>
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* Hash result */}
            {generatedHash && (
                <GlassCard className={`shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${saveStatus === 'saved' ? 'border-green-500/30 bg-green-500/5'
                        : saveStatus === 'error' ? 'border-red-500/30 bg-red-500/5'
                            : 'border-blue-500/30 bg-blue-500/5'
                    }`}>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="flex-1 w-full min-w-0">
                            <label className="block text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Generated SHA-256 Hash — share this with the faculty member
                            </label>
                            <div className="bg-black/60 border border-white/10 rounded-xl p-5 font-mono text-sm break-all text-white/90 leading-relaxed">
                                {generatedHash}
                            </div>
                        </div>
                        <button
                            onClick={() => handleCopy(generatedHash)}
                            className={`w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-3 px-7 py-4 rounded-xl transition-all font-semibold ${copied
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                }`}
                        >
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    {saveStatus === 'saved' && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            Code is live in the database. The faculty member can now use it to log in.
                        </div>
                    )}
                </GlassCard>
            )}

            {/* Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowTable(v => !v)}
                    className="w-full flex items-center justify-between px-7 py-5 hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <span className="font-bold text-white text-lg">Saved Access Codes</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-xs font-medium">{codes.length}</span>
                    </div>
                    {showTable ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {showTable && (
                    loadingCodes ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                            <Loader className="w-6 h-6 animate-spin" /><span>Loading…</span>
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
                            <Shield className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No access codes yet. Generate one above.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-t border-white/10">
                                        {['Institution / Name', 'Description', 'Status', 'Assigned', 'Created', ''].map(h => (
                                            <th key={h} className="text-left px-6 py-3 text-gray-500 font-semibold uppercase tracking-wider text-xs last:text-right">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {codes.map(code => (
                                        <tr key={code.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white">{code.institution_name}</td>
                                            <td className="px-6 py-4 text-gray-400 max-w-[180px] truncate">
                                                {code.description || <span className="text-gray-700 italic">—</span>}
                                            </td>
                                            <td className="px-6 py-4"><Badge active={code.is_active} /></td>
                                            <td className="px-6 py-4">
                                                {code.bound_to_uid
                                                    ? <span className="inline-flex items-center gap-1.5 text-xs text-blue-400"><CheckCircle className="w-3.5 h-3.5" />Assigned</span>
                                                    : <span className="text-xs text-gray-600 italic">Unassigned</span>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatDate(code.created_at)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {code.is_active && (
                                                        <button onClick={() => handleRevoke(code.id)} disabled={revokingId === code.id}
                                                            title="Revoke" className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-500 transition-colors disabled:opacity-40">
                                                            {revokingId === code.id ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(code.id)} disabled={deletingId === code.id}
                                                        title="Delete permanently" className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors disabled:opacity-40">
                                                        {deletingId === code.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />How access codes work
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Enter a seed phrase and institution name, then click <strong className="text-white">Generate & Save</strong>.
                        The seed is hashed client-side and the SHA-256 hash is immediately saved to the database.
                        Share the hash with the faculty member — they enter it on the login page and it binds permanently to their account.
                    </p>
                </div>
                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Security model
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        The seed text never leaves the browser — only the hash is stored. Once a faculty member
                        logs in with a code it binds to their Firebase UID so no other account can use it.
                        Revoke blocks future logins; Delete removes the record entirely.
                    </p>
                </div>
            </div>

            {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
        </div>
    );
};

export default AccessCodeGenerator;