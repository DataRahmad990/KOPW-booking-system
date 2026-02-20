'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError('Email atau password salah');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/3 w-[200px] h-[200px] rounded-full bg-white/5" />

        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl font-bold mx-auto mb-8">
            OJK
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Sistem Peminjaman<br />Ruangan & Alat
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Kantor OJK Purwokerto — Kelola booking ruangan, peralatan, dan jadwal kegiatan dengan mudah.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white text-xl mx-auto mb-2">
                ◫
              </div>
              <p className="text-blue-100 text-xs font-semibold">Calendar View</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white text-xl mx-auto mb-2">
                ⊕
              </div>
              <p className="text-blue-100 text-xs font-semibold">Quick Booking</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white text-xl mx-auto mb-2">
                ⚙
              </div>
              <p className="text-blue-100 text-xs font-semibold">Admin Panel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12"
        style={{ background: 'var(--secondary)' }}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
              style={{ background: 'var(--primary)' }}
            >
              OJK
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--heading)' }}>
              Booking System
            </h2>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--heading)' }}>
                Selamat Datang
              </h2>
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                Masuk ke akun anda untuk mengakses sistem booking
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="email@kantorojk.go.id"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Masukkan password"
                  required
                />
              </div>

              {error && (
                <div
                  className="px-4 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--danger-light)', color: '#991b1b' }}
                >
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Memproses...' : 'Login'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-xs" style={{ color: 'var(--text)' }}>Demo Account</p>
              <div
                className="text-xs font-semibold px-3 py-2 rounded-lg"
                style={{ background: 'var(--secondary)', color: 'var(--heading)' }}
              >
                <div>User: kopw@kantorojk.go.id / kopw123</div>
                <div>Admin: admin@kantorojk.go.id / kantorojkkopw</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
