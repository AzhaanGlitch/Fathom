import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, GraduationCap, ArrowLeft } from 'lucide-react';
import FathomFooter from '../components/ui/fathom-footer';
import { useTheme } from '../contexts/ThemeContext.jsx';

const RoleSelectionPage = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  return (
    <div className={`flex flex-col w-full transition-colors duration-300 ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative py-20">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className={`absolute top-8 left-8 flex items-center gap-2 transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Fathom Logo" className="w-10 h-10 object-contain" />
          <span className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Fathom</span>
        </div>

        <p className={`text-lg mb-16 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Choose how you'd like to get started</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full">
          {/* Administration Card */}
          <button
            onClick={() => navigate('/login?role=admin')}
            className={`group relative rounded-2xl p-10 text-left transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/[0.08]' : 'bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-lg'}`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors duration-300 ${darkMode ? 'bg-white/10 group-hover:bg-white/20 text-white' : 'bg-blue-100 group-hover:bg-blue-200 text-blue-600'}`}>
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Administration</h2>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your institution's mentors, view analytics, and oversee the entire evaluation process.
            </p>
            <div className={`mt-6 text-sm transition-colors ${darkMode ? 'text-gray-500 group-hover:text-gray-300' : 'text-blue-600 font-medium group-hover:text-blue-800'}`}>
              Continue as Admin →
            </div>
          </button>

          {/* Faculty / Teacher Card */}
          <button
            onClick={() => navigate('/get-started/faculty')}
            className={`group relative rounded-2xl p-10 text-left transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/[0.08]' : 'bg-white border border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 hover:shadow-lg'}`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors duration-300 ${darkMode ? 'bg-white/10 group-hover:bg-white/20 text-white' : 'bg-purple-100 group-hover:bg-purple-200 text-purple-600'}`}>
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Faculty / Teacher</h2>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Access your teaching evaluations, track your progress, and get actionable feedback to improve.
            </p>
            <div className={`mt-6 text-sm transition-colors ${darkMode ? 'text-gray-500 group-hover:text-gray-300' : 'text-purple-600 font-medium group-hover:text-purple-800'}`}>
              Continue as Faculty →
            </div>
          </button>
        </div>
      </div>
      
      {/* Footer Addition */}
      <div className={`w-full z-20 relative transition-colors duration-300 ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
        <FathomFooter />
      </div>

    </div>
  );
};

export default RoleSelectionPage;
