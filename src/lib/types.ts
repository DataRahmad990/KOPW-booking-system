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
  | "Alat ZOOM Logitech"
  | "Monitor CISCO"
  | "Proyektor"
  | "Sound System"
  | "Printer Portable"
  | "LCD Video Wall Ruang Inpresiv"
  | "Hanya Ruangan Tanpa Alat Tambahan"
  | "Mic Confrence Portable";

export type BookingStatus = "pending" | "approved" | "rejected";

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
  equipment: Equipment[];
  status: BookingStatus;
  createdAt: Date;
  createdBy: string;
  notes?: string;
}