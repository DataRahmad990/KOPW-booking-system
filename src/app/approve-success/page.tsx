'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ApproveSuccessContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const bookingId = searchParams.get('id');

  const isSuccess = status === 'success';
  const isAlready = status === 'already';

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="card text-center" style={{ padding: '3rem', maxWidth: '500px', margin: '20px' }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
          style={{
            background: isSuccess ? 'var(--success-light)' : 'var(--warning-light)',
            color: isSuccess ? 'var(--success)' : 'var(--warning)',
          }}
        >
          {isSuccess ? '✓' : '⚠'}
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--heading)' }}>
          {isSuccess && 'Booking Approved!'}
          {isAlready && 'Already Approved'}
          {!isSuccess && !isAlready && 'Something Went Wrong'}
        </h2>

        <p className="text-sm mb-4" style={{ color: 'var(--text)' }}>
          {isSuccess && `Booking ID: ${bookingId} telah berhasil di-approve.`}
          {isAlready && `Booking ID: ${bookingId} sudah di-approve sebelumnya.`}
          {!isSuccess && !isAlready && 'Terjadi kesalahan saat approve booking.'}
        </p>

        <div
          className="px-4 py-3 rounded-xl mb-6"
          style={{ background: 'var(--secondary)' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Booking ID
          </p>
          <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
            {bookingId}
          </p>
        </div>

        {isSuccess && (
          <div
            className="px-4 py-3 rounded-xl mb-6"
            style={{ background: 'var(--success-light)' }}
          >
            <p className="text-sm font-semibold" style={{ color: '#15803d' }}>
              ✓ User akan menerima notifikasi bahwa booking mereka telah di-approve!
            </p>
          </div>
        )}

        <a
          href="/"
          className="btn-primary w-full"
        >
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
}

export default function ApproveSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ApproveSuccessContent />
    </Suspense>
  );
}
