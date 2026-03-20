import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, GraduationCap, ArrowLeft } from 'lucide-react';

const RoleSelectionPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to Home</span>
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/logo.png" alt="Fathom Logo" className="w-10 h-10 object-contain" />
        <span className="text-3xl font-bold text-white tracking-tight">Fathom</span>
      </div>

      <p className="text-gray-400 text-lg mb-16">Choose how you'd like to get started</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full">
        {/* Administration Card */}
        <button
          onClick={() => navigate('/login?role=admin')}
          className="group relative bg-white/5 border border-white/10 rounded-2xl p-10 text-left hover:border-white/30 hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-6 group-hover:bg-white/20 transition-colors duration-300">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Administration</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Manage your institution's mentors, view analytics, and oversee the entire evaluation process.
          </p>
          <div className="mt-6 text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
            Continue as Admin →
          </div>
        </button>

        {/* Faculty / Teacher Card */}
        <button
          onClick={() => navigate('/get-started/faculty')}
          className="group relative bg-white/5 border border-white/10 rounded-2xl p-10 text-left hover:border-white/30 hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-6 group-hover:bg-white/20 transition-colors duration-300">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Faculty / Teacher</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Access your teaching evaluations, track your progress, and get actionable feedback to improve.
          </p>
          <div className="mt-6 text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
            Continue as Faculty →
          </div>
        </button>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
