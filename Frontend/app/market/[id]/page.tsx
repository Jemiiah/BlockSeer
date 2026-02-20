'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { EventDetail } from '@/components/market/event-detail';
import { mockActivities } from '@/lib/data';
import { useAleoPools } from '@/hooks';
import { getPool } from '@/lib/aleo-client';

export default function MarketPage() {
  const params = useParams();
  const router = useRouter();
  const marketId = params.id as string;

  // Fetch pools from Aleo network (with dummy fallback)
  const { pools, isLoading } = useAleoPools();

  // Fetch pool data from blockchain and log to console
  console.log('\n🔍 Fetching pool data for market ID:', marketId);

  useEffect(() => {
    const fetchAndLogPoolData = async () => {
      console.log('\n🚀 ========================================');
      console.log('🎯 MARKET PAGE LOADED');
      console.log('========================================');
      console.log('📍 URL Pool ID:', marketId);
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('========================================\n');

      // Fetch pool data from blockchain using the pool ID from URL
      const poolData = await getPool(marketId);

      if (poolData) {
        console.log('\n✅ ========================================');
        console.log('🎉 POOL DATA SUCCESSFULLY FETCHED');
        console.log('========================================');
        console.log('📊 Pool ID:', poolData.id);
        console.log('📝 Title:', poolData.title);
        console.log('📄 Description:', poolData.description);
        console.log('🎲 Options:', poolData.options);
        console.log('⏱️  Deadline:', poolData.deadline);
        console.log('🚦 Status:', poolData.status === 0 ? 'Open' : poolData.status === 1 ? 'Closed' : 'Resolved');
        console.log('🏆 Winning Option:', poolData.winning_option === 0 ? 'Not Resolved' : poolData.winning_option);
        console.log('\n💰 STAKING INFORMATION:');
        console.log('├─ Total Staked (microcredits):', poolData.total_staked.toLocaleString());
        console.log('├─ Total Staked (ALEO):', (poolData.total_staked / 1_000_000).toFixed(6));
        console.log('├─ Option A Stakes (microcredits):', poolData.option_a_stakes.toLocaleString());
        console.log('├─ Option A Stakes (ALEO):', (poolData.option_a_stakes / 1_000_000).toFixed(6));
        console.log('├─ Option B Stakes (microcredits):', poolData.option_b_stakes.toLocaleString());
        console.log('└─ Option B Stakes (ALEO):', (poolData.option_b_stakes / 1_000_000).toFixed(6));
        console.log('\n📈 STAKE COUNTS:');
        console.log('├─ Total Number of Stakes:', poolData.total_no_of_stakes);
        console.log('├─ Option A Stake Count:', poolData.total_no_of_stakes_option_a);
        console.log('└─ Option B Stake Count:', poolData.total_no_of_stakes_option_b);
        console.log('\n📦 FULL POOL OBJECT:');
        console.log(poolData);
        console.log('========================================\n');
      } else {
        console.log('\n❌ ========================================');
        console.log('⚠️  POOL NOT FOUND ON BLOCKCHAIN');
        console.log('========================================');
        console.log('Pool ID:', marketId);
        console.log('This pool does not exist on-chain yet.');
        console.log('Make sure the pool has been created using the Leo program.');
        console.log('========================================\n');
      }
    };

    if (marketId) {
      fetchAndLogPoolData();
    }
  }, [marketId]);

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
