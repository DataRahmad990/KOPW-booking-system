import { Booking } from './types';

export const BUFFER_MINUTES = 15;
export const OFFICE_START = '06:00';
export const OFFICE_END = '22:00';
export const SLOT_INTERVAL = 30;

// Generate time slots (06:00, 06:30, 07:00, ..., 22:00)
export const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  const [startHour] = OFFICE_START.split(':').map(Number);
  const [endHour] = OFFICE_END.split(':').map(Number);

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
      if (hour === endHour && minute === 0) break;
    }
  }

  return slots;
};

// Convert time string to minutes (e.g., "09:30" -> 570)
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Add buffer to time
export const addBuffer = (time: string, minutes: number): string => {
  const totalMinutes = timeToMinutes(time) + minutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Check if time slot is available
export const isSlotAvailable = (
  date: string,
  startTime: string,
  endTime: string,
  roomResource: string,
  bookings: Booking[]
): boolean => {
  const relevantBookings = bookings.filter(
    (b) =>
      b.bookingDate === date &&
      b.roomResource === roomResource &&
      (b.status === 'pending' || b.status === 'approved')
  );

  if (relevantBookings.length === 0) return true;

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  for (const booking of relevantBookings) {
    const bookingStart = timeToMinutes(booking.startTime);
    const bookingEnd = timeToMinutes(booking.endTime);

    // Add buffer before and after existing booking
    const bookingStartWithBuffer = bookingStart - BUFFER_MINUTES;
    const bookingEndWithBuffer = bookingEnd + BUFFER_MINUTES;

    // Check overlap (including buffer)
    const hasOverlap =
      (newStart >= bookingStartWithBuffer && newStart < bookingEndWithBuffer) ||
      (newEnd > bookingStartWithBuffer && newEnd <= bookingEndWithBuffer) ||
      (newStart <= bookingStartWithBuffer && newEnd >= bookingEndWithBuffer);

    if (hasOverlap) return false;
  }

  return true;
};

// Get available slots for a specific date and room
export const getAvailableSlots = (
  date: string,
  roomResource: string,
  bookings: Booking[]
): { startTime: string; endTime: string }[] => {
  const allSlots = generateTimeSlots();
  const availableSlots: { startTime: string; endTime: string }[] = [];

  for (let i = 0; i < allSlots.length - 1; i++) {
    const startTime = allSlots[i];
    const endTime = allSlots[i + 1];

    if (isSlotAvailable(date, startTime, endTime, roomResource, bookings)) {
      availableSlots.push({ startTime, endTime });
    }
  }

  return availableSlots;
};

// Format date to YYYY-MM-DD
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};