'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { EventDetail } from '@/components/market/event-detail';
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
            <div className="h-5 w-36 bg-[#1c1f2a] rounded mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#161820] border border-[#23262f] rounded-xl p-6 h-64" />
                <div className="bg-[#161820] border border-[#23262f] rounded-xl p-6 h-40" />
              </div>
              <div className="bg-[#161820] border border-[#23262f] rounded-xl p-6 h-96" />
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
            <p className="text-[#8b8d97] mb-6">The market you&apos;re looking for doesn&apos;t exist.</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-[#4b8cff] hover:bg-[#3a7bf0] text-white rounded-lg transition-colors"
              >
                Back to Markets
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-[#1c1f2a] hover:bg-[#23262f] text-white rounded-lg transition-colors"
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
        <EventDetail market={market!} onBack={handleBack} />
      </main>
    </>
  );
}
