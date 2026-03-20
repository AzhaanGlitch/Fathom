// src/pages/Dashboard/AccessCodeGenerator.jsx
import React, { useState } from 'react';
import { Shield, Key, Copy, Check, RefreshCw, Type } from 'lucide-react';

const GlassCard = ({ children, className = "" }) => (
    <div className={`bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 ${className}`}>
        {children}
    </div>
);

const AccessCodeGenerator = () => {
    const [inputText, setInputText] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateSHA256 = async (text) => {
        if (!text) return '';
        const msgUint8 = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    };

    const handleGenerate = async () => {
        if (!inputText.trim()) return;
        
        setIsGenerating(true);
        // Add a slight delay for a "processing" feel
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const hash = await generateSHA256(inputText);
        setAccessCode(hash);
        setIsGenerating(false);
        setCopied(false);
    };

    const handleCopy = () => {
        if (!accessCode) return;
        navigator.clipboard.writeText(accessCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-500" />
                    Access Code Generator
                </h1>
                <p className="text-gray-400">Generate secure SHA-256 access codes for institution teachers and faculty members.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <GlassCard className="relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                    
                    <div className="relative z-10 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                <Type className="w-4 h-4" />
                                Input Reference Text
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Enter text (e.g. name, ID, or secret phrase)..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 italic">
                                This text will be converted into a unique 64-character SHA-256 hash.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleGenerate}
                                disabled={!inputText.trim() || isGenerating}
                                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
                                    !inputText.trim() || isGenerating
                                        ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                        : 'bg-white text-black hover:bg-gray-200 active:scale-95'
                                }`}
                            >
                                {isGenerating ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Key className="w-5 h-5" />
                                )}
                                {isGenerating ? 'Generating...' : 'Generate Access Code'}
                            </button>
                        </div>
                    </div>
                </GlassCard>

                {accessCode && (
                    <GlassCard className="border-blue-500/30 bg-blue-500/5 shadow-2xl shadow-blue-500/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Generated SHA-256 Hash
                                </label>
                                <div className="bg-black/60 border border-white/10 rounded-xl p-6 font-mono text-xl break-all text-white/90 selection:bg-blue-500/30">
                                    {accessCode}
                                </div>
                            </div>
                            
                            <button
                                onClick={handleCopy}
                                className={`w-full md:w-auto flex items-center justify-center gap-3 px-8 py-6 rounded-xl transition-all ${
                                    copied 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                }`}
                            >
                                {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                                <span className="font-bold text-lg">{copied ? 'Copied!' : 'Copy Hash'}</span>
                            </button>
                        </div>
                        
                        <div className="mt-6 flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                            <div className="p-1 bg-yellow-500/20 rounded-md mt-0.5">
                                <Shield className="w-4 h-4 text-yellow-500" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-yellow-500">Security Note</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Provide this 64-character hash to the institution teacher. They should use this exact code to log in to their respective portal. Make sure to store this securely after generation.
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                )}
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        What is SHA-256?
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Secure Hash Algorithm 256-bit is a cryptographic hash function that produces a unique 256-bit (64-character) signature for a piece of text. It's one-way, meaning it's virtually impossible to invert.
                    </p>
                </div>
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        How to use?
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Enter a unique identifier for the faculty member (like their email or staff ID). The generated code will serve as their unique portal access key.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccessCodeGenerator;
