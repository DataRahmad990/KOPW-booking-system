'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Division, RoomResource, Equipment, Booking } from '@/lib/types';
import { timeToMinutes } from '@/lib/timeUtils';
import { getStaffByJabatan } from '@/lib/staffData';
import { generateApproveLink } from '@/lib/approveToken';
import DashboardLayout from '@/components/DashboardLayout';

export default function NewBookingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState('');

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

      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      setBookingId(docRef.id);
      setSuccess(true);
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
    // Generate approve link
    const approveLink = generateApproveLink(bookingId);

    // Format WhatsApp message
    const whatsappNumber = '6282242595858'; // Admin WA number
    const message = `Halo Admin, ada booking baru yang perlu di-approve:

*Booking ID:* ${bookingId}
*Nama:* ${formData.borrowerName}
*Sub Bagian:* ${formData.division}
*Ruangan/Alat:* ${formData.roomResource}
*Tanggal:* ${formData.bookingDate}
*Waktu:* ${formData.startTime} - ${formData.endTime}
*Kegiatan:* ${formData.activityType}
*Jumlah Peserta:* ${formData.participantCount} orang
${formData.equipment.length > 0 ? `*Perlengkapan:* ${formData.equipment.join(', ')}` : ''}
${formData.notes ? `*Catatan:* ${formData.notes}` : ''}

👉 *Quick Approve:*
${approveLink}

Atau login ke dashboard untuk review.`;

    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    return (
      <DashboardLayout title="Booking Baru" subtitle="Booking berhasil dibuat">
        <div className="flex items-center justify-center py-12">
          <div className="card text-center" style={{ padding: '3rem', maxWidth: '500px' }}>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ background: 'var(--success-light)', color: 'var(--success)' }}
            >
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--heading)' }}>
              Booking Berhasil!
            </h2>
            <div
              className="inline-block px-4 py-2 rounded-lg mb-4"
              style={{ background: 'var(--secondary)' }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                Booking ID
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                {bookingId}
              </p>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text)' }}>
              Silakan hubungi admin via WhatsApp untuk konfirmasi booking Anda
            </p>

            {/* WhatsApp Button */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center justify-center gap-2 mb-3"
              style={{ background: '#25D366' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Hubungi Admin via WhatsApp
            </a>

            <button
              onClick={() => router.push('/dashboard')}
              className="btn-outline w-full"
            >
              Kembali ke Dashboard
            </button>
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
                  <select
                    value={formData.borrowerName}
                    onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                    className="form-select"
                    required
                  >
                    <option value="">Pilih Nama Peminjam</option>
                    {Object.entries(getStaffByJabatan()).map(([jabatan, members]) => (
                      <optgroup key={jabatan} label={jabatan}>
                        {members.map((s) => (
                          <option key={s.no} value={s.nama}>{s.nama}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
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
