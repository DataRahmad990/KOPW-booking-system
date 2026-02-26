export type Division = 
  | "FPEPK (LIKD)"
  | "FPEPK (MCSK)"
  | "FPLJK 1"
  | "FPLJK 2"
  | "FPLJK 3"
  | "LMST";

export type RoomResource = 
  | "R. Integritas"
  | "R. Profesionalisme"
  | "R. Sinergi"
  | "R. Inklusif"
  | "R. Visioner"
  | "Aula INPRESIV"
  | "R. Visinergi"
  | "Akun Zoom"
  | "Hanya Alat";

export type Equipment =
  | "LCD Proyektor"
  | "Zoom Dedicated (Profesionalisme)"
  | "Zoom Mobile"
  | "Recording"
  | "Pointer"
  | "Printer Portable"
  | "Mic Ashley Mobile"
  | "Speaker Portable"
  | "Screen Proyektor"
  | "Video Wall (Inpresiv Built-in)"
  | "Monitor Cisco (Inklusif Built-in)";

export type RoomLayout =
  | "U-Shape"
  | "Classroom"
  | "Lesehan"
  | "Room Table"
  | "Default";

export type BookingStatus = "pending" | "approved" | "rejected";

// Equipment configuration with quantity
export interface EquipmentConfig {
  name: Equipment;
  quantity: number;
  description?: string;
}

export const EQUIPMENT_INVENTORY: EquipmentConfig[] = [
  { name: "LCD Proyektor", quantity: 3 },
  { name: "Zoom Dedicated (Profesionalisme)", quantity: 1, description: "Fixed di R. Profesionalisme" },
  { name: "Zoom Mobile", quantity: 1, description: "Kondisi agak rusak" },
  { name: "Recording", quantity: 2 },
  { name: "Pointer", quantity: 3 },
  { name: "Printer Portable", quantity: 2 },
  { name: "Mic Ashley Mobile", quantity: 2, description: "2 set (4 mic, 2 receiver)" },
  { name: "Speaker Portable", quantity: 2 },
  { name: "Screen Proyektor", quantity: 2 },
];

// Room-specific built-in equipment
export const ROOM_BUILT_IN_EQUIPMENT: Record<string, Equipment[]> = {
  "Aula INPRESIV": ["Video Wall (Inpresiv Built-in)"],
  "R. Inklusif": ["Monitor Cisco (Inklusif Built-in)"],
};

export interface User {
  uid: string;
  email: string;
  name: string;
  division: Division;
  role: "admin" | "user";
  createdAt: Date;
}

export interface Booking {
  id?: string;
  borrowerName: string;
  borrowerEmail: string;
  division: Division;
  bookingDate: string;
  startTime: string;
  endTime: string;
  activityType: string;
  participantCount: number;
  roomResource: RoomResource;
  roomLayout?: RoomLayout; // For Aula INPRESIV
  equipment: Equipment[];
  status: BookingStatus;
  createdAt: Date;
  createdBy: string;
  notes?: string;
}