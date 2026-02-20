'use client';

import { useAuth } from '@/contexts/AuthContext';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-8 h-16"
      style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--heading)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs" style={{ color: 'var(--text)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>
            {user?.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--text)' }}>
            {user?.division}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: 'var(--primary)' }}
        >
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}
