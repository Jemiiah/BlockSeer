'use client';

import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Navbar } from '@/components/navbar';
import { Portfolio } from '@/components/portfolio';
import { MarketCard, MarketFilters, FeaturedMarket } from '@/components/market';
import { useMarkets, useAleoPools } from '@/hooks';

function SkeletonCard() {
  return (
    <div className="bg-[hsl(230,15%,8%)]/80 border border-white/[0.06] rounded-[24px] p-6 min-h-[252px] animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-5 w-14 bg-white/[0.06] rounded-full" />
        <div className="h-4 w-8 bg-white/[0.04] rounded" />
      </div>
      <div className="h-5 w-3/4 bg-white/[0.06] rounded mb-2" />
      <div className="h-4 w-1/2 bg-white/[0.04] rounded mb-5" />
      <div className="h-8 w-28 bg-white/[0.04] rounded-lg mb-5" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-14 bg-blue-500/5 rounded-full" />
        <div className="h-14 bg-white/[0.03] rounded-full" />
      </div>
      <div className="h-px bg-white/[0.06] mb-3" />
      <div className="h-4 w-24 bg-white/[0.04] rounded" />
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>('market');
  const { connected: isConnected } = useWallet();

  // Fetch pools from backend API
  const { pools, isLoading: isLoadingPools, error } = useAleoPools();

  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filteredMarkets,
    liveCount,
    upcomingCount,
  } = useMarkets(pools);

  const handleLogoClick = () => {
    setActiveTab('market');
  };

  const handleTabChange = (tab: 'market' | 'portfolio') => {
    setActiveTab(tab);
  };

  return (
    <>
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogoClick={handleLogoClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === 'portfolio' ? (
          <Portfolio isConnected={isConnected} />
        ) : (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                <span className="gradient-text">Prediction Markets</span>
              </h1>
              <p className="text-[hsl(230,10%,50%)] text-lg">
                Trade on crypto events with zero-knowledge privacy on Aleo.
              </p>
              {error && (
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-red-400/70 text-sm">
                    Error loading markets: {error}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Filters */}
            <MarketFilters
              activeFilter={filter}
              onFilterChange={setFilter}
              liveCount={liveCount}
              upcomingCount={upcomingCount}
            />

            {/* Featured Market */}
            <FeaturedMarket markets={pools} />

            {/* Loading State — Skeleton grid */}
            {isLoadingPools ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredMarkets.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[hsl(230,10%,50%)] text-lg mb-2">No markets found</p>
                <p className="text-[hsl(230,10%,35%)] text-sm">
                  {pools.length === 0
                    ? "No prediction markets available yet."
                    : "No markets match your current filter."}
                </p>
              </div>
            ) : (
              /* Market Grid — staggered animations */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMarkets.map((market, index) => (
                  <div
                    key={market.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
                  >
                    <MarketCard market={market} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
