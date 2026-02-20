'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Division, RoomResource, Equipment, Booking } from '@/lib/types';
import { timeToMinutes } from '@/lib/timeUtils';
import DashboardLayout from '@/components/DashboardLayout';

export default function NewBookingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    borrowerName: '',
    division: '' as Division,
    bookingDate: '',
    startTime: '',
    endTime: '',
    activityType: '',
    participantCount: 1,
    roomResource: '' as RoomResource,
    equipment: [] as Equipment[],
    notes: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      borrowerName: user.name,
      division: user.division,
    }));
  }, [user, router]);

  const divisions: Division[] = [
    'FPEPK (LIKD)',
    'FPEPK (MCSK)',
    'FPLJK 1',
    'FPLJK 2',
    'FPLJK 3',
    'LMST',
  ];

  const rooms: RoomResource[] = [
    'R. Integritas',
    'R. Profesionalisme',
    'R. Sinergi',
    'R. Inklusif',
    'R. Visioner',
    'Aula INPRESIV',
    'R. Visinergi',
    'Akun Zoom',
    'Hanya Alat',
  ];

  const equipmentOptions: Equipment[] = [
    'Alat ZOOM Logitech',
    'Monitor CISCO',
    'Proyektor',
    'Sound System',
    'Printer Portable',
    'LCD Video Wall Ruang Inpresiv',
    'Hanya Ruangan Tanpa Alat Tambahan',
    'Mic Confrence Portable',
  ];

  const checkConflict = async (): Promise<boolean> => {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('bookingDate', '==', formData.bookingDate),
      where('roomResource', '==', formData.roomResource),
      where('status', 'in', ['pending', 'approved'])
    );

    const snapshot = await getDocs(q);
    const conflicts = snapshot.docs.filter((doc) => {
      const booking = doc.data() as Booking;
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);
      const newStart = timeToMinutes(formData.startTime);
      const newEnd = timeToMinutes(formData.endTime);

      const BUFFER = 15;
      const bookingStartWithBuffer = bookingStart - BUFFER;
      const bookingEndWithBuffer = bookingEnd + BUFFER;

      return (
        (newStart >= bookingStartWithBuffer && newStart < bookingEndWithBuffer) ||
        (newEnd > bookingStartWithBuffer && newEnd <= bookingEndWithBuffer) ||
        (newStart <= bookingStartWithBuffer && newEnd >= bookingEndWithBuffer)
      );
    });

    return conflicts.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.startTime >= formData.endTime) {
        setError('Waktu selesai harus lebih besar dari waktu mulai');
        setLoading(false);
        return;
      }

      const hasConflict = await checkConflict();
      if (hasConflict) {
        setError(
          `${formData.roomResource} sudah dibooking pada tanggal dan jam tersebut. Silakan pilih waktu lain.`
        );
        setLoading(false);
        return;
      }

      const bookingData: Omit<Booking, 'id'> = {
        ...formData,
        borrowerEmail: user!.email,
        status: 'pending',
        createdAt: new Date(),
        createdBy: user!.uid,
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Terjadi kesalahan saat membuat booking');
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentChange = (equipment: Equipment) => {
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter((e) => e !== equipment)
        : [...prev.equipment, equipment],
    }));
  };

  if (!user) return null;

  if (success) {
    return (
      <DashboardLayout title="Booking Baru" subtitle="Booking berhasil dibuat">
        <div className="flex items-center justify-center py-20">
          <div className="card text-center" style={{ padding: '3rem', maxWidth: '400px' }}>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ background: 'var(--success-light)', color: 'var(--success)' }}
            >
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--heading)' }}>
              Booking Berhasil!
            </h2>
            <p className="text-sm" style={{ color: 'var(--text)' }}>
              Menunggu approval dari admin...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Booking Baru" subtitle="Isi form untuk booking ruangan atau alat kantor">
      <div className="max-w-3xl">
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section: Informasi Peminjam */}
            <div>
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--heading)' }}>
                Informasi Peminjam
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Nama Peminjam</label>
                  <input
                    type="text"
                    value={formData.borrowerName}
                    onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Sub Bagian</label>
                  <select
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value as Division })}
                    className="form-select"
                    required
                  >
                    <option value="">Pilih Sub Bagian</option>
                    {divisions.map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr style={{ borderColor: 'var(--border)' }} />

            {/* Section: Jadwal */}
            <div>
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--heading)' }}>
                Jadwal Pelaksanaan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="form-label">Tanggal</label>
                  <input
                    type="date"
                    value={formData.bookingDate}
                    onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Waktu Mulai</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Waktu Selesai</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr style={{ borderColor: 'var(--border)' }} />

            {/* Section: Detail Kegiatan */}
            <div>
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--heading)' }}>
                Detail Kegiatan
              </h3>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">Jenis Kegiatan</label>
                    <input
                      type="text"
                      value={formData.activityType}
                      onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Rapat Koordinasi, Workshop, dll"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Jumlah Peserta</label>
                    <input
                      type="number"
                      value={formData.participantCount}
                      onChange={(e) =>
                        setFormData({ ...formData, participantCount: parseInt(e.target.value) })
                      }
                      min="1"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Ruangan/Alat yang Dipinjam</label>
                  <select
                    value={formData.roomResource}
                    onChange={(e) =>
                      setFormData({ ...formData, roomResource: e.target.value as RoomResource })
                    }
                    className="form-select"
                    required
                  >
                    <option value="">Pilih Ruangan/Alat</option>
                    {rooms.map((room) => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr style={{ borderColor: 'var(--border)' }} />

            {/* Section: Perlengkapan */}
            <div>
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--heading)' }}>
                Perlengkapan Kegiatan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {equipmentOptions.map((equipment) => (
                  <label
                    key={equipment}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      background: formData.equipment.includes(equipment)
                        ? 'var(--primary-light)'
                        : 'var(--secondary)',
                      border: formData.equipment.includes(equipment)
                        ? '1px solid var(--primary)'
                        : '1px solid transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.equipment.includes(equipment)}
                      onChange={() => handleEquipmentChange(equipment)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>
                      {equipment}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Divider */}
            <hr style={{ borderColor: 'var(--border)' }} />

            {/* Notes */}
            <div>
              <label className="form-label">Catatan (Opsional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="form-textarea"
                placeholder="Tambahkan catatan jika ada"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="px-5 py-4 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--danger-light)', color: '#991b1b' }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Memproses...' : 'Submit Booking'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn-outline"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
