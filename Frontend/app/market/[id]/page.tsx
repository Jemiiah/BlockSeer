'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { EventDetail } from '@/components/market/event-detail';
import { mockActivities } from '@/lib/data';
import { useAleoPools } from '@/hooks';

export default function MarketPage() {
  const params = useParams();
  const router = useRouter();
  const marketId = params.id as string;

  // Fetch pools from Aleo network (with dummy fallback)
  const { pools, isLoading } = useAleoPools();

  // Find the market by ID
  const market = pools.find((m) => m.id === marketId);

  const handleBack = () => {
    router.push('/');
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <Navbar
          activeTab="market"
          onTabChange={() => router.push('/')}
          onLogoClick={() => router.push('/')}
        />
        <main className="max-w-7xl mx-auto px-6 py-10">
          {/* Skeleton loading */}
          <div className="animate-pulse">
            <div className="h-5 w-36 bg-white/[0.06] rounded mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[hsl(230,15%,8%)]/80 border border-white/[0.06] rounded-2xl p-6 h-64" />
                <div className="bg-[hsl(230,15%,8%)]/80 border border-white/[0.06] rounded-2xl p-6 h-40" />
              </div>
              <div className="bg-[hsl(230,15%,8%)]/80 border border-white/[0.06] rounded-2xl p-6 h-96" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!isLoading && !market) {
    return (
      <>
        <Navbar
          activeTab="market"
          onTabChange={() => router.push('/')}
          onLogoClick={() => router.push('/')}
        />
        <main className="max-w-7xl mx-auto px-6 py-10">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-white mb-4">Market Not Found</h1>
            <p className="text-[hsl(230,10%,50%)] mb-6">The market you&apos;re looking for doesn&apos;t exist.</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Back to Markets
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-colors"
              >
                Browse All Markets
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar
        activeTab="market"
        onTabChange={(tab) => {
          if (tab === 'portfolio') {
            router.push('/?tab=portfolio');
          } else {
            router.push('/');
          }
        }}
        onLogoClick={() => router.push('/')}
      />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <EventDetail market={market!} activities={mockActivities} onBack={handleBack} />
      </main>
    </>
  );
}
