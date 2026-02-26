'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking } from '@/lib/types';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';

export default function AllBookingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

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
  }, [user, router]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel booking ini? Tindakan tidak bisa dibatalkan.')) return;

    setDeleting(bookingId);
    try {
      // Get booking data before deleting
      const bookingToCancel = bookings.find(b => b.id === bookingId);

      await deleteDoc(doc(db, 'bookings', bookingId));

      // Redirect to cancel success page with booking details
      if (bookingToCancel) {
        const params = new URLSearchParams({
          id: bookingId,
          name: bookingToCancel.borrowerName,
          room: bookingToCancel.roomResource,
          date: bookingToCancel.bookingDate,
        });
        router.push(`/cancel-success?${params.toString()}`);
      }
    } catch (error: any) {
      console.error('Error canceling booking:', error);
      alert(`Gagal membatalkan booking: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const canCancelBooking = (booking: Booking) => {
    return (
      (booking.createdBy === user?.uid && booking.status === 'pending') ||
      user?.role === 'admin'
    );
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchFilter = filter === 'all' || booking.status === filter;
    const matchSearch =
      search === '' ||
      booking.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
      booking.roomResource.toLowerCase().includes(search.toLowerCase()) ||
      booking.activityType.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  if (!user) return null;

  return (
    <DashboardLayout title="Semua Booking" subtitle="Daftar semua peminjaman">
      {/* Filter & Search */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                  filter === f.key ? 'text-white' : ''
                }`}
                style={{
                  background:
                    filter === f.key
                      ? f.key === 'pending'
                        ? 'var(--warning)'
                        : f.key === 'approved'
                        ? 'var(--success)'
                        : f.key === 'rejected'
                        ? 'var(--danger)'
                        : 'var(--primary)'
                      : 'var(--secondary)',
                  color: filter === f.key ? 'white' : 'var(--heading)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, ruangan, kegiatan..."
              className="form-input"
              style={{ height: '44px' }}
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {filteredBookings.length} booking ditemukan
        </p>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="p-8 text-center" style={{ color: 'var(--text)' }}>Loading...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">☰</div>
            <p className="font-semibold" style={{ color: 'var(--heading)' }}>
              Tidak ada booking yang sesuai filter
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
                <th>Peserta</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
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
                  <td>{booking.participantCount} orang</td>
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
                  <td>
                    {canCancelBooking(booking) && (
                      <button
                        onClick={() => handleCancelBooking(booking.id!)}
                        disabled={deleting === booking.id}
                        className="btn-danger btn-sm"
                        style={{ height: '34px', padding: '4px 16px', fontSize: '12px' }}
                      >
                        {deleting === booking.id ? 'Canceling...' : 'Cancel'}
                      </button>
                    )}
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
