'use client';

import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Navbar } from '@/components/navbar';
import { Portfolio } from '@/components/portfolio';
import { MarketCard, MarketCardSkeleton, MarketFilters, FeaturedMarket } from '@/components/market';
import { useMarkets, useAleoPools } from '@/hooks';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>('market');
  const { connected: isConnected } = useWallet();

  const { pools, isLoading: isLoadingPools, error } = useAleoPools();

  const {
    filter,
    setFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    filteredMarkets,
    liveCount,
    upcomingCount,
    resolvedCount,
  } = useMarkets(pools);

  const handleLogoClick = () => setActiveTab('market');
  const handleTabChange = (tab: 'market' | 'portfolio') => setActiveTab(tab);

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
              resolvedCount={resolvedCount}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />

            {/* Featured Market */}
            <FeaturedMarket markets={pools} />

            {/* Loading State */}
            {isLoadingPools ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <MarketCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredMarkets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[hsl(230,10%,50%)] text-lg mb-2">No markets found</p>
                <p className="text-[hsl(230,10%,35%)] text-sm">
                  {pools.length === 0
                    ? 'No prediction markets available yet.'
                    : 'No markets match your current filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
