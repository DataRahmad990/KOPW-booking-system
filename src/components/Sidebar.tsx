'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '⊞' },
  { label: 'Calendar', path: '/calendar', icon: '◫' },
  { label: 'Booking Baru', path: '/booking/new', icon: '⊕' },
  { label: 'Semua Booking', path: '/booking', icon: '☰' },
];

const adminItems = [
  { label: 'Admin Panel', path: '/admin', icon: '⚙' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-[60] lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-white"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {collapsed ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile */}
      {collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => setCollapsed(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-[50] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: '260px',
          background: 'var(--sidebar-bg)',
        }}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'var(--primary)' }}
            >
              OJK
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Booking System</h2>
              <p className="text-xs" style={{ color: 'var(--sidebar-text)' }}>
                Kantor OJK Purwokerto
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-3" style={{ color: 'var(--sidebar-text)' }}>
            Menu
          </p>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                router.push(item.path);
                setCollapsed(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive(item.path)
                  ? 'text-white'
                  : 'hover:bg-white/5'
              }`}
              style={{
                background: isActive(item.path) ? 'var(--sidebar-active)' : 'transparent',
                color: isActive(item.path) ? 'var(--white)' : 'var(--sidebar-text)',
              }}
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {user?.role === 'admin' && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-3 mt-6" style={{ color: 'var(--sidebar-text)' }}>
                Admin
              </p>
              {adminItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setCollapsed(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive(item.path)
                      ? 'text-white'
                      : 'hover:bg-white/5'
                  }`}
                  style={{
                    background: isActive(item.path) ? 'var(--sidebar-active)' : 'transparent',
                    color: isActive(item.path) ? 'var(--white)' : 'var(--sidebar-text)',
                  }}
                >
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* User Info + Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--primary)' }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--sidebar-text)' }}>
                {user?.division}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-red-500/10"
            style={{ color: '#f87171' }}
          >
            <span className="text-lg w-6 text-center">⏻</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
