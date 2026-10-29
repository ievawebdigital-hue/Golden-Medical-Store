import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Golden Medical Store - POS & Medical Inventory System',
  description: 'High-speed pharmacy POS billing, batch-wise medicine inventory, expiry alerts, supplier purchases, customer dues, and GST invoicing.',
  openGraph: {
    title: 'Golden Medical Store - POS & Medical Inventory',
    description: 'High-speed pharmacy POS billing, batch-wise medicine inventory, and GST invoicing.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Golden Medical Store - POS & Medical Inventory',
    description: 'High-speed pharmacy POS billing, batch-wise medicine inventory, and GST invoicing.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans selection:bg-amber-200 selection:text-amber-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

