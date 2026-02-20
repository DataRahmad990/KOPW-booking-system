'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking } from '@/lib/types';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (user.role !== 'admin') {
      alert('Akses ditolak. Hanya admin yang bisa mengakses halaman ini.');
      router.push('/dashboard');
      return;
    }

    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setBookings(bookingsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, router]);

  const handleApprove = async (bookingId: string) => {
    if (!confirm('Approve booking ini?')) return;

    setProcessing(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'approved',
      });
      alert('Booking berhasil di-approve!');
    } catch (error) {
      console.error('Error approving booking:', error);
      alert('Gagal approve booking');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    if (!confirm('Reject booking ini?')) return;

    setProcessing(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'rejected',
      });
      alert('Booking berhasil di-reject!');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Gagal reject booking');
    } finally {
      setProcessing(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const approvedBookings = bookings.filter((b) => b.status === 'approved');
  const rejectedBookings = bookings.filter((b) => b.status === 'rejected');

  const stats = [
    {
      label: 'Menunggu Approval',
      value: pendingBookings.length,
      icon: '⏳',
      iconBg: 'var(--warning-light)',
      iconColor: '#d97706',
    },
    {
      label: 'Disetujui',
      value: approvedBookings.length,
      icon: '✓',
      iconBg: 'var(--success-light)',
      iconColor: '#16a34a',
    },
    {
      label: 'Ditolak',
      value: rejectedBookings.length,
      icon: '✕',
      iconBg: 'var(--danger-light)',
      iconColor: '#dc2626',
    },
  ];

  return (
    <DashboardLayout title="Admin Panel" subtitle="Kelola approval booking">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div className="stat-icon" style={{ background: stat.iconBg, color: stat.iconColor }}>
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

      {/* Pending Bookings */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--heading)' }}>
            Booking Menunggu Approval
          </h2>
          <span className="badge badge-warning">{pendingBookings.length}</span>
        </div>

        {loading ? (
          <div className="card p-8 text-center" style={{ color: 'var(--text)' }}>
            Loading...
          </div>
        ) : pendingBookings.length === 0 ? (
          <div className="card p-12 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
              style={{ background: 'var(--success-light)', color: 'var(--success)' }}
            >
              ✓
            </div>
            <p className="font-semibold" style={{ color: 'var(--heading)' }}>
              Tidak ada booking yang menunggu approval
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="card" style={{ padding: '24px' }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--heading)' }}>
                      {booking.roomResource}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text)' }}>
                      {booking.activityType}
                    </p>
                  </div>
                  <span className="badge badge-warning">Pending</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
                      Tanggal
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--heading)' }}>
                      {format(new Date(booking.bookingDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
                      Waktu
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--heading)' }}>
                      {booking.startTime} - {booking.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
                      Peminjam
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--heading)' }}>
                      {booking.borrowerName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text)' }}>
                      {booking.division}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
                      Peserta
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--heading)' }}>
                      {booking.participantCount} orang
                    </p>
                  </div>
                </div>

                {booking.equipment.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>
                      Perlengkapan
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {booking.equipment.map((eq) => (
                        <span key={eq} className="badge badge-primary">
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {booking.notes && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
                      Catatan
                    </p>
                    <p className="text-sm" style={{ color: 'var(--heading)' }}>
                      {booking.notes}
                    </p>
                  </div>
                )}

                <div
                  className="flex gap-3 pt-4"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => handleApprove(booking.id!)}
                    disabled={processing === booking.id}
                    className="btn-success flex-1"
                  >
                    {processing === booking.id ? 'Memproses...' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(booking.id!)}
                    disabled={processing === booking.id}
                    className="btn-danger flex-1"
                  >
                    {processing === booking.id ? 'Memproses...' : '✕ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Bookings Table */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--heading)' }}>
          Semua Booking
        </h2>
        <div className="table-wrapper">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Ruangan/Alat</th>
                <th>Peminjam</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
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
        </div>
      </div>
    </DashboardLayout>
  );
}
