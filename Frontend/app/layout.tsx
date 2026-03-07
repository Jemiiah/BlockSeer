import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/error-boundary';

const Providers = dynamic(() => import('@/components/providers').then(mod => mod.Providers), {
  ssr: false,
});

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Manifold - Blockchain Prediction Markets',
  description: 'Trade on crypto events with zero-knowledge privacy on Aleo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className}`}>
        <Providers>
          <div className="min-h-screen bg-[#0d0f13]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </Providers>
      </body>
    </html>
  );
}
