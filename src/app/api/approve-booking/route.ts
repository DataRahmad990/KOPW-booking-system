import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

// Secret key untuk generate token (PENTING: Simpan di env variable di production!)
const SECRET_KEY = process.env.APPROVE_TOKEN_SECRET || 'kopw-booking-secret-key-2026';

export function generateApproveToken(bookingId: string): string {
  // Sync with client-side algorithm di src/lib/approveToken.ts
  let hash = 0;
  const str = bookingId + SECRET_KEY;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
}

export function verifyApproveToken(bookingId: string, token: string): boolean {
  const validToken = generateApproveToken(bookingId);
  return validToken === token;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('id');
    const token = searchParams.get('token');

    if (!bookingId || !token) {
      return NextResponse.json(
        { error: 'Missing booking ID or token' },
        { status: 400 }
      );
    }

    // Verify token
    if (!verifyApproveToken(bookingId, token)) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }

    // Get booking
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingDoc.data();

    // Check if already approved
    if (booking.status === 'approved') {
      return NextResponse.redirect(
        new URL(`/approve-success?status=already&id=${bookingId}`, request.url)
      );
    }

    // Approve booking
    await updateDoc(bookingRef, {
      status: 'approved',
      approvedAt: new Date(),
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/approve-success?status=success&id=${bookingId}`, request.url)
    );
  } catch (error) {
    console.error('Error approving booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
