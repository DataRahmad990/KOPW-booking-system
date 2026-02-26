import { Equipment, EQUIPMENT_INVENTORY, ROOM_BUILT_IN_EQUIPMENT, RoomResource, Booking } from './types';

/**
 * Get available quantity for an equipment on a specific date
 */
export function getAvailableEquipment(
  equipment: Equipment,
  date: string,
  existingBookings: Booking[]
): number {
  // Find equipment config
  const config = EQUIPMENT_INVENTORY.find(e => e.name === equipment);
  if (!config) return 0;

  // Count how many are already booked on this date
  const bookedCount = existingBookings
    .filter(booking =>
      booking.bookingDate === date &&
      (booking.status === 'pending' || booking.status === 'approved') &&
      booking.equipment.includes(equipment)
    )
    .length;

  return Math.max(0, config.quantity - bookedCount);
}

/**
 * Get equipment list filtered by room
 * Excludes built-in equipment and includes room-specific equipment
 */
export function getAvailableEquipmentForRoom(room: RoomResource): Equipment[] {
  const builtInEquipment = ROOM_BUILT_IN_EQUIPMENT[room] || [];

  // Get all equipment from inventory
  const allEquipment = EQUIPMENT_INVENTORY.map(e => e.name);

  // Exclude LCD Proyektor if room has built-in video wall or monitor
  const excludedEquipment: Equipment[] = [];
  if (room === 'Aula INPRESIV') {
    excludedEquipment.push('LCD Proyektor'); // Has Video Wall
  }
  if (room === 'R. Inklusif') {
    excludedEquipment.push('LCD Proyektor'); // Has Monitor Cisco
  }

  // Filter out built-in equipment and excluded items
  return allEquipment.filter(eq =>
    !builtInEquipment.includes(eq) && !excludedEquipment.includes(eq)
  );
}

/**
 * Get built-in equipment for a room
 */
export function getBuiltInEquipment(room: RoomResource): Equipment[] {
  return ROOM_BUILT_IN_EQUIPMENT[room] || [];
}

/**
 * Check if equipment is available for booking
 */
export function isEquipmentAvailable(
  equipment: Equipment[],
  date: string,
  existingBookings: Booking[]
): { available: boolean; unavailable: Equipment[] } {
  const unavailable: Equipment[] = [];

  for (const eq of equipment) {
    const available = getAvailableEquipment(eq, date, existingBookings);
    if (available <= 0) {
      unavailable.push(eq);
    }
  }

  return {
    available: unavailable.length === 0,
    unavailable,
  };
}
