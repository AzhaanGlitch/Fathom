// frontend/src/layouts/DashboardLayout.jsx

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
  BarChart3
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import FathomFooter from '../components/ui/fathom-footer';
import { MenuToggleIcon } from '../components/ui/menu-toggle-icon';
import '../styles/burger-menu.css';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState('institution-faculty');
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    // Read role from localStorage
    const storedRole = localStorage.getItem('userRole') || 'institution-faculty';
    setUserRole(storedRole);

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Bypass auth for frontend development - use mock user
        setUser({
          displayName: 'Dev User',
          email: 'dev@fathom.app',
          uid: 'dev-mock-uid'
        });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const handleStateChange = (state) => {
    setMenuOpen(state.isOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    closeMenu();
  };

  // All available menu items — Analytics before Mentors so admin sees Analytics first
  const allMenuItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['institution-faculty', 'solo-faculty'],
    },
    {
      label: 'Sessions',
      href: '/dashboard/sessions',
      icon: Video,
      roles: ['institution-faculty', 'solo-faculty'],
    },
    {
      label: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      roles: ['admin'],
    },
    {
      label: 'Mentors',
      href: '/dashboard/mentors',
      icon: Users,
      roles: ['admin'],
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: SettingsIcon,
      roles: ['admin', 'institution-faculty', 'solo-faculty'],
    },
    {
      label: 'Profile',
      href: '/dashboard/profile',
      icon: UserIcon,
      roles: ['admin', 'institution-faculty', 'solo-faculty'],
    },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative flex">

      {/* ============ DESKTOP SIDEBAR (lg and up) ============ */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-16 bg-[#111111] border-r border-white/5 flex-col items-center py-6 z-[1100]">
        {/* Logo */}
        <div
          className="mb-8 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <img src="/logo.png" alt="Fathom" className="w-8 h-8 object-contain" />
        </div>

        {/* Nav Icons */}
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
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    active
                      ? 'bg-white text-black'
                      : 'text-gray-500 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>

                {/* Tooltip capsule */}
                {hoveredItem === item.href && (
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-full whitespace-nowrap shadow-lg z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Logout at bottom */}
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

      {/* ============ MOBILE HAMBURGER (below lg) ============ */}
      <div className="lg:hidden fixed top-6 left-6 z-[1100]">
        <MenuToggleIcon
          open={menuOpen}
          onClick={toggleMenu}
          className="w-8 h-8 text-white"
        />
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
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="user-dropdown">
                    <div
                      onClick={() => {
                        handleNavigation('/dashboard/profile');
                        setShowUserMenu(false);
                      }}
                      className="user-dropdown-item"
                    >
                      <UserIcon />
                      <span>View Profile</span>
                    </div>
                    <div
                      onClick={() => {
                        handleLogout();
                        setShowUserMenu(false);
                      }}
                      className="user-dropdown-item logout"
                    >
                      <LogOut />
                      <span>Logout</span>
                    </div>
                  </div>
                </>
              )}

              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="user-profile-button"
              >
                <div className="user-avatar">
                  <UserIcon />
                </div>
                <div className="user-info">
                  <p className="user-name">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="user-email">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </Menu>
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <div className="flex flex-1 flex-col w-full lg:ml-16">
        <main className="p-6 flex-1 relative z-30 overflow-auto">
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