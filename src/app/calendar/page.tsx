'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Division, RoomResource, Equipment, Booking, RoomLayout, EQUIPMENT_INVENTORY } from '@/lib/types';
import { formatDate, generateTimeSlots, timeToMinutes } from '@/lib/timeUtils';
import { getStaffByJabatan } from '@/lib/staffData';
import { generateApproveLink } from '@/lib/approveToken';
import { getAvailableEquipmentForRoom, getBuiltInEquipment, getAvailableEquipment } from '@/lib/equipmentUtils';
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
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [lastBookingData, setLastBookingData] = useState<any>(null);

  const [formData, setFormData] = useState({
    borrowerName: '',
    division: '' as Division,
    activityType: '',
    participantCount: 1,
    roomLayout: 'Default' as RoomLayout,
    equipment: [] as Equipment[],
    notes: '',
  });

  // All bookings for equipment availability checking
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

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

  // Dynamic equipment based on selected room
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);

  // Room layouts
  const roomLayouts: RoomLayout[] = ['U-Shape', 'Classroom', 'Lesehan', 'Room Table'];

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

  // Fetch all bookings for equipment availability
  useEffect(() => {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('status', 'in', ['pending', 'approved']));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setAllBookings(bookingsData);
    });

    return () => unsubscribe();
  }, []);

  // Update available equipment when room changes
  useEffect(() => {
    if (selectedRoom) {
      const availableEq = getAvailableEquipmentForRoom(selectedRoom);
      setAvailableEquipment(availableEq);

      // Auto-assign built-in equipment
      const builtIn = getBuiltInEquipment(selectedRoom);
      if (builtIn.length > 0) {
        setFormData((prev) => ({
          ...prev,
          equipment: [...new Set([...builtIn])],
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          equipment: [],
        }));
      }
    }
  }, [selectedRoom]);

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
        roomLayout: formData.roomLayout,
        equipment: formData.equipment,
        notes: formData.notes,
        status: 'pending',
        createdAt: new Date(),
        createdBy: user!.uid,
      };

      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      setBookingId(docRef.id);
      setLastBookingData({
        ...bookingData,
        roomResource: selectedRoom,
        bookingDate: selectedSlot.date,
      });
      setSuccess(true);
      setShowBookingModal(false);
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

  if (success && lastBookingData) {
    // Generate approve link
    const approveLink = generateApproveLink(bookingId);

    // Admin WhatsApp numbers
    const adminNumbers = [
      { name: 'Admin 1', number: '6282242595858' },
      { name: 'Admin 2 (Backup)', number: '6281328241709' }
    ];

    // Format WhatsApp message
    const message = `Halo Admin, ada booking baru yang perlu di-approve:

*Booking ID:* ${bookingId}
*Nama:* ${lastBookingData.borrowerName}
*Sub Bagian:* ${lastBookingData.division}
*Ruangan/Alat:* ${lastBookingData.roomResource}
*Tanggal:* ${lastBookingData.bookingDate}
*Waktu:* ${lastBookingData.startTime} - ${lastBookingData.endTime}
*Kegiatan:* ${lastBookingData.activityType}
*Jumlah Peserta:* ${lastBookingData.participantCount} orang
${lastBookingData.equipment.length > 0 ? `*Perlengkapan:* ${lastBookingData.equipment.join(', ')}` : ''}
${lastBookingData.notes ? `*Catatan:* ${lastBookingData.notes}` : ''}

👉 *Quick Approve:*
${approveLink}

Atau login ke dashboard untuk review.`;

    return (
      <DashboardLayout title="Booking Berhasil" subtitle="Silakan hubungi admin untuk konfirmasi">
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

            {/* WhatsApp Buttons - 2 Admin */}
            <div className="space-y-3 mb-3">
              {adminNumbers.map((admin) => (
                <a
                  key={admin.number}
                  href={`https://wa.me/${admin.number}?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center justify-center gap-2 w-full"
                  style={{ background: '#25D366' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Hubungi {admin.name}
                </a>
              ))}
            </div>

            <button
              onClick={() => {
                setSuccess(false);
                setBookingId('');
                setLastBookingData(null);
                setFormData({
                  borrowerName: user.name,
                  division: user.division,
                  activityType: '',
                  participantCount: 1,
                  roomLayout: 'Default',
                  equipment: [],
                  notes: '',
                });
              }}
              className="btn-outline w-full"
            >
              Booking Lagi
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                  <select
                    value={formData.borrowerName}
                    onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                    className="form-select"
                    required
                  >
                    <option value="">Pilih Nama</option>
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

              {/* Room Layout - Only for Aula INPRESIV */}
              {selectedRoom === 'Aula INPRESIV' && (
                <div>
                  <label className="form-label">Layout Ruangan</label>
                  <select
                    value={formData.roomLayout}
                    onChange={(e) =>
                      setFormData({ ...formData, roomLayout: e.target.value as RoomLayout })
                    }
                    className="form-select"
                    required
                  >
                    {roomLayouts.map((layout) => (
                      <option key={layout} value={layout}>
                        {layout}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Built-in Equipment Info */}
              {selectedRoom && getBuiltInEquipment(selectedRoom as RoomResource).length > 0 && (
                <div
                  className="px-4 py-3 rounded-xl"
                  style={{ background: 'var(--success-light)' }}
                >
                  <div className="text-xs font-bold mb-1" style={{ color: 'var(--success)' }}>
                    Perlengkapan Built-in (sudah termasuk):
                  </div>
                  <div className="text-xs" style={{ color: '#15803d' }}>
                    {getBuiltInEquipment(selectedRoom as RoomResource).join(', ')}
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Perlengkapan Kegiatan</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableEquipment.map((equipment) => {
                    const builtIn = selectedRoom ? getBuiltInEquipment(selectedRoom as RoomResource) : [];
                    const isBuiltIn = builtIn.includes(equipment);
                    const available = selectedSlot
                      ? getAvailableEquipment(equipment, selectedSlot.date, allBookings)
                      : 0;
                    const isOutOfStock = available === 0 && !isBuiltIn;

                    return (
                      <label
                        key={equipment}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                        style={{
                          background: formData.equipment.includes(equipment)
                            ? 'var(--primary-light)'
                            : 'var(--secondary)',
                          cursor: isBuiltIn || isOutOfStock ? 'not-allowed' : 'pointer',
                          opacity: isBuiltIn || isOutOfStock ? 0.6 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.equipment.includes(equipment)}
                          onChange={() => handleEquipmentChange(equipment)}
                          disabled={isBuiltIn || isOutOfStock}
                          className="w-3.5 h-3.5 rounded"
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <div className="flex-1">
                          <div className="font-semibold" style={{ color: 'var(--heading)' }}>
                            {equipment}
                          </div>
                          {!isBuiltIn && (
                            <div
                              className="text-[10px]"
                              style={{
                                color: isOutOfStock ? 'var(--danger)' : 'var(--text)',
                              }}
                            >
                              {isOutOfStock ? 'Habis' : `Tersedia: ${available}`}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
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
