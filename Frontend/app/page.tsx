'use client';

import { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { Portfolio } from '@/components/portfolio';
import { MarketCard, MarketFilters, FeaturedMarket, EventDetail } from '@/components/market';
import { useMarkets } from '@/hooks';
import { markets, mockActivities } from '@/lib/data';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>('market');
  const { connected: isConnected } = useWallet();
  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filteredMarkets,
    selectedMarket,
    selectMarket,
    clearSelection,
    liveCount,
    upcomingCount,
  } = useMarkets(markets);

  const handleLogoClick = () => {
    clearSelection();
    setActiveTab('market');
  };

  const handleTabChange = (tab: 'market' | 'portfolio') => {
    setActiveTab(tab);
    clearSelection();
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
        ) : selectedMarket ? (
          <EventDetail market={selectedMarket} activities={mockActivities} onBack={clearSelection} />
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
            </div>

            {/* Filters */}
            <MarketFilters
              activeFilter={filter}
              onFilterChange={setFilter}
              liveCount={liveCount}
              upcomingCount={upcomingCount}
            />

            {/* Featured Market */}
            <FeaturedMarket markets={markets} onClick={selectMarket} />

            {/* Market Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredMarkets.map((market) => (
                <MarketCard key={market.id} market={market} onClick={selectMarket} />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
