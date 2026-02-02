'use client';

import { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { Portfolio } from '@/components/portfolio';
import { MarketCard, MarketFilters, FeaturedMarket } from '@/components/market';
import { useMarkets, useAleoPools } from '@/hooks';

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
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Blockchain Prediction Markets
              </h1>
              <p className="text-zinc-400 text-lg">
                Trade on crypto events with zero-knowledge privacy on Aleo.
              </p>
              {error && (
                <p className="text-red-400/70 text-sm mt-2">
                  Error loading markets: {error}
                </p>
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

            {/* Loading State */}
            {isLoadingPools ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-zinc-400">Loading markets from blockchain...</p>
              </div>
            ) : filteredMarkets.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-zinc-400 text-lg mb-2">No markets found</p>
                <p className="text-zinc-500 text-sm">
                  {pools.length === 0
                    ? "No prediction markets available yet."
                    : "No markets match your current filter."}
                </p>
              </div>
            ) : (
              /* Market Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
