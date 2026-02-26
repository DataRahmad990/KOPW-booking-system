'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function CancelSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('id');
  const name = searchParams.get('name');
  const room = searchParams.get('room');
  const date = searchParams.get('date');

  // Admin WhatsApp numbers
  const adminNumbers = [
    { name: 'Admin 1', number: '6282242595858' },
    { name: 'Admin 2 (Backup)', number: '6281328241709' }
  ];

  // Format WhatsApp message
  const message = `Halo Admin, ada pembatalan booking:

*Booking ID:* ${bookingId}
*Nama Peminjam:* ${name}
*Ruangan/Alat:* ${room}
*Tanggal:* ${date}

Booking ini telah dibatalkan oleh user.`;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="card text-center" style={{ padding: '3rem', maxWidth: '500px', margin: '20px' }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
          style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
        >
          ✕
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--heading)' }}>
          Booking Dibatalkan
        </h2>

        <p className="text-sm mb-4" style={{ color: 'var(--text)' }}>
          Booking ID: {bookingId} telah berhasil dibatalkan.
        </p>

        <div
          className="px-4 py-3 rounded-xl mb-6"
          style={{ background: 'var(--warning-light)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
            📱 Silakan beritahu admin via WhatsApp tentang pembatalan ini
          </p>
        </div>

        {/* WhatsApp Buttons - 2 Admin */}
        <div className="space-y-3 mb-6">
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
              Beritahu {admin.name}
            </a>
          ))}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="btn-outline w-full"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}

export default function CancelSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CancelSuccessContent />
    </Suspense>
  );
}
