'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-3 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <div className="lg:ml-[260px] min-h-screen flex flex-col">
        <TopBar title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
