'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Division, RoomResource, Equipment, Booking } from '@/lib/types';
import { formatDate, generateTimeSlots, timeToMinutes } from '@/lib/timeUtils';
import DashboardLayout from '@/components/DashboardLayout';

interface BookingWithDetails extends Booking {
  displayName: string;
  color: string;
  slotSpan: number;
}

export default function WeeklyCalendarPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomResource | ''>('');
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [hoveredBooking, setHoveredBooking] = useState<BookingWithDetails | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    startTime: string;
  } | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    borrowerName: '',
    division: '' as Division,
    activityType: '',
    participantCount: 1,
    equipment: [] as Equipment[],
    notes: '',
  });

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

  const divisions: Division[] = [
    'FPEPK (LIKD)',
    'FPEPK (MCSK)',
    'FPLJK 1',
    'FPLJK 2',
    'FPLJK 3',
    'LMST',
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

  const colors = [
    'linear-gradient(135deg, #3b82f6, #2563eb)',
    'linear-gradient(135deg, #22c55e, #16a34a)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #dc2626)',
    'linear-gradient(135deg, #6366f1, #4f46e5)',
    'linear-gradient(135deg, #14b8a6, #0d9488)',
  ];

  const durationOptions = [
    { label: '30 mnt', slots: 1 },
    { label: '1 jam', slots: 2 },
    { label: '1.5 jam', slots: 3 },
    { label: '2 jam', slots: 4 },
    { label: '2.5 jam', slots: 5 },
    { label: '3 jam', slots: 6 },
    { label: '4 jam', slots: 8 },
  ];

  const calculateSlotSpan = (startTime: string, endTime: string): number => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    return Math.ceil((end - start) / 30);
  };

  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      week.push(day);
    }
    setCurrentWeek(week);
  }, []);

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

    if (!selectedRoom || currentWeek.length === 0) return;

    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('roomResource', '==', selectedRoom),
      where('status', 'in', ['pending', 'approved'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc, idx) => {
        const data = doc.data() as Booking;
        const slotSpan = calculateSlotSpan(data.startTime, data.endTime);
        return {
          ...data,
          id: doc.id,
          displayName: data.borrowerName,
          color: colors[idx % colors.length],
          slotSpan,
        };
      }) as BookingWithDetails[];

      const weekStart = new Date(currentWeek[0]);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(currentWeek[6]);
      weekEnd.setHours(23, 59, 59, 999);

      const filtered = bookingsData.filter((b) => {
        const bookingDate = new Date(b.bookingDate + 'T00:00:00');
        return bookingDate >= weekStart && bookingDate <= weekEnd;
      });

      setBookings(filtered);
    });

    return () => unsubscribe();
  }, [user, router, selectedRoom, currentWeek]);

  const handleSlotClick = (date: Date, startTime: string) => {
    if (!selectedRoom) {
      alert('Pilih ruangan terlebih dahulu!');
      return;
    }

    setSelectedSlot({ date: formatDate(date), startTime });
    setSelectedDuration(1);
    setShowBookingModal(true);
  };

  const calculateEndTime = (startTime: string, slots: number): string => {
    const start = timeToMinutes(startTime);
    const end = start + slots * 30;
    const hours = Math.floor(end / 60);
    const mins = end % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const checkConflict = (dateStr: string, startTime: string, endTime: string): boolean => {
    const BUFFER = 15;
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    return bookings.some((b) => {
      if (b.bookingDate !== dateStr) return false;

      const bookingStart = timeToMinutes(b.startTime);
      const bookingEnd = timeToMinutes(b.endTime);

      const bookingStartWithBuffer = bookingStart - BUFFER;
      const bookingEndWithBuffer = bookingEnd + BUFFER;

      return (
        (newStart >= bookingStartWithBuffer && newStart < bookingEndWithBuffer) ||
        (newEnd > bookingStartWithBuffer && newEnd <= bookingEndWithBuffer) ||
        (newStart <= bookingStartWithBuffer && newEnd >= bookingEndWithBuffer)
      );
    });
  };

  const handlePreviousWeek = () => {
    const newWeek = currentWeek.map((day) => {
      const newDay = new Date(day);
      newDay.setDate(day.getDate() - 7);
      return newDay;
    });
    setCurrentWeek(newWeek);
  };

  const handleNextWeek = () => {
    const newWeek = currentWeek.map((day) => {
      const newDay = new Date(day);
      newDay.setDate(day.getDate() + 7);
      return newDay;
    });
    setCurrentWeek(newWeek);
  };

  const handleEquipmentChange = (equipment: Equipment) => {
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter((e) => e !== equipment)
        : [...prev.equipment, equipment],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const endTime = calculateEndTime(selectedSlot.startTime, selectedDuration);
    const hasConflict = checkConflict(selectedSlot.date, selectedSlot.startTime, endTime);

    if (hasConflict) {
      alert('Slot ini bentrok dengan booking lain (termasuk buffer 15 menit)!');
      return;
    }

    setLoading(true);
    try {
      const bookingData: Omit<Booking, 'id'> = {
        borrowerName: formData.borrowerName,
        borrowerEmail: user!.email,
        division: formData.division,
        bookingDate: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: endTime,
        activityType: formData.activityType,
        participantCount: formData.participantCount,
        roomResource: selectedRoom as RoomResource,
        equipment: formData.equipment,
        notes: formData.notes,
        status: 'pending',
        createdAt: new Date(),
        createdBy: user!.uid,
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      alert('Booking berhasil! Menunggu approval admin.');
      setShowBookingModal(false);
      setSelectedSlot(null);
      setFormData({
        borrowerName: user!.name,
        division: user!.division,
        activityType: '',
        participantCount: 1,
        equipment: [],
        notes: '',
      });
    } catch (err) {
      console.error('Error creating booking:', err);
      alert('Gagal membuat booking');
    } finally {
      setLoading(false);
    }
  };

  const getBookingAtSlot = (date: Date, startTime: string) => {
    const dateStr = formatDate(date);
    return bookings.find((b) => b.bookingDate === dateStr && b.startTime === startTime);
  };

  const isSlotOccupied = (date: Date, startTime: string): boolean => {
    const dateStr = formatDate(date);
    const slotStart = timeToMinutes(startTime);

    return bookings.some((b) => {
      if (b.bookingDate !== dateStr) return false;

      const bookingStart = timeToMinutes(b.startTime);
      const bookingEnd = timeToMinutes(b.endTime);

      return slotStart >= bookingStart && slotStart < bookingEnd;
    });
  };

  const timeSlots = generateTimeSlots();

  if (!user) return null;

  return (
    <DashboardLayout title="Calendar Booking" subtitle="Jadwal peminjaman ruangan">
      {/* Room & Week Controls */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value as RoomResource)}
              className="form-select"
              style={{ width: 'auto', minWidth: '220px' }}
            >
              <option value="">-- Pilih Ruangan/Alat --</option>
              {rooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          {currentWeek.length > 0 && (
            <div className="flex items-center gap-3">
              <button onClick={handlePreviousWeek} className="btn-outline btn-sm">
                ← Minggu Lalu
              </button>
              <span
                className="text-sm font-bold px-4 py-2 rounded-full"
                style={{ background: 'var(--secondary)', color: 'var(--heading)' }}
              >
                {currentWeek[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} -{' '}
                {currentWeek[6].toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <button onClick={handleNextWeek} className="btn-outline btn-sm">
                Minggu Depan →
              </button>
            </div>
          )}
        </div>
      </div>

      {!selectedRoom ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              ◫
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>
              Pilih Ruangan/Alat
            </h2>
            <p className="text-sm" style={{ color: 'var(--text)' }}>
              Pilih ruangan di atas untuk melihat jadwal booking
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            {/* Header */}
            <div className="grid grid-cols-8 gap-1.5 mb-2">
              <div className="text-center text-xs font-bold py-3" style={{ color: 'var(--text)' }}>
                Waktu
              </div>
              {currentWeek.map((day, idx) => {
                const isToday = formatDate(day) === formatDate(new Date());
                return (
                  <div
                    key={idx}
                    className="text-center py-3 rounded-xl"
                    style={{
                      background: isToday ? 'var(--primary)' : 'var(--white)',
                      color: isToday ? 'white' : 'var(--heading)',
                      boxShadow: isToday ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="text-xs font-semibold" style={{ opacity: isToday ? 0.8 : 0.6 }}>
                      {day.toLocaleDateString('id-ID', { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-bold">{day.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid */}
            <div className="space-y-1">
              {timeSlots.slice(0, -1).map((startTime, idx) => (
                <div key={idx} className="grid grid-cols-8 gap-1.5">
                  <div
                    className="text-center text-xs font-bold py-4 rounded-xl"
                    style={{ background: 'var(--white)', color: 'var(--text)' }}
                  >
                    {startTime}
                  </div>

                  {currentWeek.map((day, dayIdx) => {
                    const booking = getBookingAtSlot(day, startTime);
                    const isOccupied = isSlotOccupied(day, startTime);
                    const isPast = new Date(`${formatDate(day)}T${startTime}`) < new Date();

                    if (isOccupied && !booking) {
                      return <div key={dayIdx} className="bg-transparent"></div>;
                    }

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => !booking && !isPast && handleSlotClick(day, startTime)}
                        onMouseEnter={() => booking && setHoveredBooking(booking)}
                        onMouseLeave={() => setHoveredBooking(null)}
                        style={
                          booking
                            ? {
                                gridRow: `span ${booking.slotSpan}`,
                                background: booking.color,
                                borderRadius: '12px',
                              }
                            : undefined
                        }
                        className={`relative transition-all duration-200 cursor-pointer ${
                          booking
                            ? 'text-white shadow-md hover:shadow-lg'
                            : isPast
                            ? 'rounded-xl py-4'
                            : 'rounded-xl py-4 hover:scale-[1.02]'
                        }`}
                        {...(!booking && {
                          style: {
                            background: isPast ? 'var(--secondary)' : 'var(--white)',
                            border: isPast ? 'none' : '1px solid var(--border)',
                            cursor: isPast ? 'not-allowed' : 'pointer',
                            borderRadius: '12px',
                            padding: '16px 0',
                          },
                        })}
                      >
                        {booking && (
                          <div className="p-2.5 h-full flex flex-col justify-between">
                            <div>
                              <div className="font-bold text-xs mb-0.5">{booking.displayName}</div>
                              <div className="text-[11px] opacity-80">{booking.activityType}</div>
                              <div className="text-[10px] opacity-60 mt-1">
                                {booking.startTime} - {booking.endTime}
                              </div>
                            </div>
                            <div className="mt-1">
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{
                                  background:
                                    booking.status === 'approved'
                                      ? 'rgba(255,255,255,0.25)'
                                      : 'rgba(245,158,11,0.3)',
                                }}
                              >
                                {booking.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {hoveredBooking && (
        <div
          className="fixed bottom-6 right-6 card z-50"
          style={{ maxWidth: '320px', padding: '20px', border: '1px solid var(--border)' }}
        >
          <h3 className="font-bold mb-3" style={{ color: 'var(--heading)', fontSize: '15px' }}>
            Detail Booking
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text)' }}>Peminjam</span>
              <span className="font-semibold" style={{ color: 'var(--heading)' }}>
                {hoveredBooking.borrowerName}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text)' }}>Divisi</span>
              <span className="font-semibold" style={{ color: 'var(--heading)' }}>
                {hoveredBooking.division}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text)' }}>Kegiatan</span>
              <span className="font-semibold" style={{ color: 'var(--heading)' }}>
                {hoveredBooking.activityType}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text)' }}>Waktu</span>
              <span className="font-semibold" style={{ color: 'var(--heading)' }}>
                {hoveredBooking.startTime} - {hoveredBooking.endTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text)' }}>Peserta</span>
              <span className="font-semibold" style={{ color: 'var(--heading)' }}>
                {hoveredBooking.participantCount} orang
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--white)',
              borderRadius: '18px',
              maxWidth: '640px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div
              className="sticky top-0 px-6 py-4 flex justify-between items-center"
              style={{
                background: 'var(--white)',
                borderBottom: '1px solid var(--border)',
                borderRadius: '18px 18px 0 0',
              }}
            >
              <h2 className="text-lg font-bold" style={{ color: 'var(--heading)' }}>
                Booking Baru
              </h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-gray-100 transition"
                style={{ color: 'var(--text)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Booking Info */}
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: 'var(--primary-light)' }}
              >
                <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                  {selectedRoom}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--primary)' }}>
                  {selectedSlot.date} | {selectedSlot.startTime} -{' '}
                  {calculateEndTime(selectedSlot.startTime, selectedDuration)}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="form-label">Durasi Booking</label>
                <div className="grid grid-cols-4 gap-2">
                  {durationOptions.map((option) => (
                    <button
                      key={option.slots}
                      type="button"
                      onClick={() => setSelectedDuration(option.slots)}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                      style={{
                        background:
                          selectedDuration === option.slots
                            ? 'var(--primary)'
                            : 'var(--secondary)',
                        color:
                          selectedDuration === option.slots ? 'white' : 'var(--heading)',
                        border:
                          selectedDuration === option.slots
                            ? '1px solid var(--primary)'
                            : '1px solid transparent',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    onChange={(e) =>
                      setFormData({ ...formData, division: e.target.value as Division })
                    }
                    className="form-select"
                    required
                  >
                    <option value="">Pilih Sub Bagian</option>
                    {divisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Jenis Kegiatan</label>
                <input
                  type="text"
                  value={formData.activityType}
                  onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                  className="form-input"
                  placeholder="Contoh: Rapat Koordinasi"
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

              <div>
                <label className="form-label">Perlengkapan Kegiatan</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {equipmentOptions.map((equipment) => (
                    <label
                      key={equipment}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-all"
                      style={{
                        background: formData.equipment.includes(equipment)
                          ? 'var(--primary-light)'
                          : 'var(--secondary)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.equipment.includes(equipment)}
                        onChange={() => handleEquipmentChange(equipment)}
                        className="w-3.5 h-3.5 rounded"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span className="font-semibold" style={{ color: 'var(--heading)' }}>
                        {equipment}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Catatan (Opsional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Tambahkan catatan jika ada"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Memproses...' : 'Submit Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="btn-outline"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
