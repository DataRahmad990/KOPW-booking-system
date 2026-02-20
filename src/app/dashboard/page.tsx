'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking } from '@/lib/types';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('bookingDate', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setBookings(bookingsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const todayBookings = bookings.filter(
    (b) => b.bookingDate === format(new Date(), 'yyyy-MM-dd')
  );
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const approvedBookings = bookings.filter((b) => b.status === 'approved');

  const stats = [
    {
      label: 'Total Booking',
      value: bookings.length,
      icon: '☰',
      iconBg: 'var(--primary-light)',
      iconColor: 'var(--primary)',
    },
    {
      label: 'Booking Hari Ini',
      value: todayBookings.length,
      icon: '◫',
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
    },
    {
      label: 'Menunggu Approval',
      value: pendingBookings.length,
      icon: '⏳',
      iconBg: 'var(--warning-light)',
      iconColor: '#d97706',
    },
    {
      label: 'Approved',
      value: approvedBookings.length,
      icon: '✓',
      iconBg: 'var(--success-light)',
      iconColor: '#16a34a',
    },
  ];

  return (
    <DashboardLayout title="Dashboard" subtitle="Overview peminjaman ruangan & alat">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div
              className="stat-icon"
              style={{ background: stat.iconBg, color: stat.iconColor }}
            >
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {stat.label}
              </p>
              <p className="text-3xl font-bold" style={{ color: 'var(--heading)' }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button onClick={() => router.push('/calendar')} className="btn-primary">
          <span>◫</span> Calendar View
        </button>
        <button onClick={() => router.push('/booking/new')} className="btn-success">
          <span>⊕</span> Booking Baru
        </button>
        <button onClick={() => router.push('/booking')} className="btn-outline">
          <span>☰</span> Semua Booking
        </button>
      </div>

      {/* Recent Bookings */}
      <div className="table-wrapper">
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--heading)' }}>
            Booking Terbaru
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{ color: 'var(--text)' }}>Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">◫</div>
            <p className="font-semibold" style={{ color: 'var(--heading)' }}>Belum ada booking</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>
              Klik "Booking Baru" untuk membuat booking pertama
            </p>
          </div>
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Ruangan/Alat</th>
                <th>Peminjam</th>
                <th>Kegiatan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 10).map((booking) => (
                <tr key={booking.id}>
                  <td>{format(new Date(booking.bookingDate), 'dd MMM yyyy')}</td>
                  <td>
                    <span className="font-semibold">
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </td>
                  <td>{booking.roomResource}</td>
                  <td>
                    <div className="font-semibold">{booking.borrowerName}</div>
                    <div className="text-xs" style={{ color: 'var(--text)' }}>
                      {booking.division}
                    </div>
                  </td>
                  <td>{booking.activityType}</td>
                  <td>
                    <span
                      className={`badge ${
                        booking.status === 'approved'
                          ? 'badge-success'
                          : booking.status === 'rejected'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {booking.status === 'approved'
                        ? 'Disetujui'
                        : booking.status === 'rejected'
                        ? 'Ditolak'
                        : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
