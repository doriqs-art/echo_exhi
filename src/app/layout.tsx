import type { Metadata } from 'next';
import { Public_Sans, Syncopate } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import Cursor from '@/components/Cursor';
import SoundFx from '@/components/SoundFx';
import NoiseOverlay from '@/components/NoiseOverlay';

const publicSans = Public_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const syncopate = Syncopate({
  variable: '--font-syncopate',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'ECHO',
  description: 'ECHO — recall a memory.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${syncopate.variable} antialiased`}
    >
      <body className="bg-ink text-bone">
        <NoiseOverlay />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SmoothScroll />
        <Cursor />
        <SoundFx />
        {children}
      </body>
    </html>
  );
}
