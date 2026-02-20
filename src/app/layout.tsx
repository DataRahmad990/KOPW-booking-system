import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const manrope = Manrope({ subsets: ['latin'], weight: ['200', '300', '400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'OJK Booking System',
  description: 'Sistem Peminjaman Ruangan & Alat Kantor OJK Purwokerto',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={manrope.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
