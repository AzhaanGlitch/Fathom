

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { slide as Menu } from 'react-burger-menu';
import {
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Video,
  Users,
  Settings as SettingsIcon,
  BarChart3,
  Shield,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import FathomFooter from '../components/ui/fathom-footer';
import { MenuToggleIcon } from '../components/ui/menu-toggle-icon';
import { mentorApi } from '../api/client';
import '../styles/burger-menu.css';

// ─────────────────────────────────────────────────────────────────────────────
// One-time onboarding modal for existing users who have no mentorId yet
// ─────────────────────────────────────────────────────────────────────────────
const OnboardingModal = ({ user, userRole, onComplete }) => {
  const [facultyName, setFacultyName] = useState(
    user?.displayName || user?.email?.split('@')[0] || ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!facultyName.trim()) {
      setError('Please enter your faculty name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await mentorApi.create({
        name: facultyName.trim(),
        email: user.email,
        expertise: [],
        bio: '',
        owner_uid: user.uid,
        role: userRole,
      });
      const mentorId = res.data.id || res.data._id;
      localStorage.setItem('mentorId', mentorId);
      localStorage.setItem('facultyName', facultyName.trim());
      onComplete(mentorId);
    } catch (err) {
      console.error('Failed to create mentor profile:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-white/10 rounded-2xl max-w-md w-full p-8 shadow-2xl">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6">
          <UserIcon className="w-7 h-7 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Set up your faculty profile</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          We noticed your account doesn't have a faculty profile yet. Please enter
          your name — this will be used to organise all your sessions and evaluations.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Faculty Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={facultyName}
              onChange={(e) => { setFacultyName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Dr. Priya Sharma"
              autoFocus
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            This name cannot be changed later. It will appear on all your session
            evaluations and reports.
          </p>

          <button
            onClick={handleSave}
            disabled={saving || !facultyName.trim()}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Setting up your profile…
              </>
            ) : (
              'Continue to Dashboard'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main layout
// ─────────────────────────────────────────────────────────────────────────────
const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState('institution-faculty');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Onboarding state
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') || 'institution-faculty';
    setUserRole(storedRole);

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Check if non-admin user is missing their mentorId
        const isAdmin = storedRole === 'admin';
        const storedMentorId = localStorage.getItem('mentorId');

        if (!isAdmin && !storedMentorId) {
          // Try to find an existing mentor record for this UID first
          try {
            const res = await mentorApi.getByOwner(currentUser.uid);
            if (res?.data?.id || res?.data?._id) {
              const id = res.data.id || res.data._id;
              localStorage.setItem('mentorId', id);
              // No onboarding needed — found existing record
            } else {
              setNeedsOnboarding(true);
            }
          } catch (_) {
            // No record found — show onboarding
            setNeedsOnboarding(true);
          }
        }
      } else {
        navigate('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleOnboardingComplete = (mentorId) => {
    setNeedsOnboarding(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
    localStorage.removeItem('userRole');
    localStorage.removeItem('mentorId');
    localStorage.removeItem('facultyName');
    localStorage.removeItem('institutionName');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  const handleStateChange = (state) => setMenuOpen(state.isOpen);
  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen(!menuOpen);
  const handleNavigation = (path) => { navigate(path); closeMenu(); };

  const allMenuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['institution-faculty', 'solo-faculty'] },
    { label: 'Sessions', href: '/dashboard/sessions', icon: Video, roles: ['institution-faculty', 'solo-faculty'] },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin'] },
    { label: 'Mentors', href: '/dashboard/mentors', icon: Users, roles: ['admin'] },
    { label: 'Access Code', href: '/dashboard/access-code', icon: Shield, roles: ['admin'] },
    { label: 'Settings', href: '/dashboard/settings', icon: SettingsIcon, roles: ['admin', 'institution-faculty', 'solo-faculty'] },
    { label: 'Profile', href: '/dashboard/profile', icon: UserIcon, roles: ['admin', 'institution-faculty', 'solo-faculty'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative flex">

      {/* Onboarding modal — blocks UI until profile is set up */}
      {needsOnboarding && user && (
        <OnboardingModal
          user={user}
          userRole={userRole}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-16 bg-[#111111] border-r border-white/5 flex-col items-center py-6 z-[1100]">
        <div className="mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Fathom" className="w-8 h-8 object-contain" />
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <div
                key={item.href}
                className="relative flex items-center"
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <button
                  onClick={() => navigate(item.href)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${active
                      ? 'bg-white text-black'
                      : 'text-gray-500 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
                {hoveredItem === item.href && (
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-full whitespace-nowrap shadow-lg z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="relative flex items-center"
          onMouseEnter={() => setHoveredItem('logout')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
          </button>
          {hoveredItem === 'logout' && (
            <div className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-full whitespace-nowrap shadow-lg z-50 pointer-events-none">
              Logout
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile hamburger ────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-6 left-6 z-[1100]">
        <MenuToggleIcon open={menuOpen} onClick={toggleMenu} className="w-8 h-8 text-white" />
      </div>

      <div className="lg:hidden">
        <Menu
          isOpen={menuOpen}
          onStateChange={handleStateChange}
          width={'280px'}
          customBurgerIcon={false}
          customCrossIcon={false}
        >
          <div className="px-4 pb-6 mb-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white">Fathom</h2>
          </div>

          <div className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={`menu-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <Icon />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>

          {user && (
            <div className="menu-user-profile">
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="user-dropdown">
                    <div
                      onClick={() => { handleNavigation('/dashboard/profile'); setShowUserMenu(false); }}
                      className="user-dropdown-item"
                    >
                      <UserIcon />
                      <span>View Profile</span>
                    </div>
                    <div
                      onClick={() => { handleLogout(); setShowUserMenu(false); }}
                      className="user-dropdown-item logout"
                    >
                      <LogOut />
                      <span>Logout</span>
                    </div>
                  </div>
                </>
              )}

              <div onClick={() => setShowUserMenu(!showUserMenu)} className="user-profile-button">
                <div className="user-avatar"><UserIcon /></div>
                <div className="user-info">
                  <p className="user-name">{user.displayName || user.email?.split('@')[0]}</p>
                  <p className="user-email">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </Menu>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col w-full lg:ml-16">
        <main className="p-6 pt-16 lg:pt-8 flex-1 relative z-30 overflow-auto">
          <Outlet />
        </main>
        <div className="relative z-10">
          <FathomFooter />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;