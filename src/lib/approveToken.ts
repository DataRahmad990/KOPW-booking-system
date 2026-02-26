// Generate approve token untuk booking
// Token ini digunakan untuk approve booking via link tanpa login

const SECRET_KEY = process.env.APPROVE_TOKEN_SECRET || 'kopw-booking-secret-key-2026';

export function generateApproveToken(bookingId: string): string {
  // Simple hash function for client-side (for display only)
  // Real verification happens on server-side
  let hash = 0;
  const str = bookingId + SECRET_KEY;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
}

export function generateApproveLink(bookingId: string, baseUrl: string = ''): string {
  const token = generateApproveToken(bookingId);
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://kopw-booking.vercel.app');
  return `${url}/api/approve-booking?id=${bookingId}&token=${token}`;
}
