'use client';

import { useState, useMemo, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Portfolio } from '@/components/portfolio';
import { MarketCard, MarketCardSkeleton, FeaturedMarket, MarketSidebar } from '@/components/market';
import { useMarkets, useAleoPools } from '@/hooks';
import { MarketCategory } from '@/types';
import { SlidersHorizontal, X } from 'lucide-react';

export default function HomePage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') === 'portfolio' ? 'portfolio' : 'market';
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio'>(initialTab);

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'portfolio') setActiveTab('portfolio');
  }, [searchParams]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { connected: isConnected } = useWallet();

  const { pools, isLoading: isLoadingPools, error } = useAleoPools();

  const {
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    filteredMarkets,
    sort,
    setSort,
  } = useMarkets(pools);

  // Compute category counts from all pools
  const categoryCounts = useMemo(() => {
    const counts = { all: pools.length, Crypto: 0, DeFi: 0, Tech: 0, AI: 0 };
    pools.forEach((m) => {
      if (counts[m.category as MarketCategory] !== undefined) {
        counts[m.category as MarketCategory]++;
      }
    });
    return counts;
  }, [pools]);

  const handleLogoClick = () => {
    console.debug('Logo clicked, navigating to markets');
    setActiveTab('market');
  };
  const handleTabChange = (tab: 'market' | 'portfolio') => {
    console.debug('Tab change requested:', tab);
    setActiveTab(tab);
  };

  const sidebarProps = {
    categoryFilter,
    onCategoryChange: setCategoryFilter,
    sort,
    onSortChange: setSort,
    categoryCounts,
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

      <main className="max-w-[1400px] mx-auto px-6 py-10">
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

            {/* Sidebar + Content */}
            <div className="flex gap-6">
              {/* Desktop Sidebar */}
              <MarketSidebar
                {...sidebarProps}
                className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Featured Market */}
                <FeaturedMarket markets={pools} />

                {/* Market Grid */}
                {isLoadingPools ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <MarketCardSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredMarkets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-[hsl(230,10%,50%)] text-lg mb-2">No markets found</p>
                    <p className="text-[hsl(230,10%,35%)] text-sm">
                      {categoryFilter !== 'all' || searchQuery.trim()
                        ? 'No markets match your current filter.'
                        : 'No prediction markets available yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMarkets.map((market) => (
                      <MarketCard key={market.id} market={market} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Drawer Toggle */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-2xl bg-[hsl(230,15%,10%)] border border-white/[0.1] hover:border-blue-500/30 text-white/70 hover:text-blue-400 flex items-center justify-center shadow-xl shadow-black/40 transition-all duration-200"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>

            {/* Mobile Drawer */}
            {drawerOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                  onClick={() => setDrawerOpen(false)}
                />
                {/* Drawer Panel */}
                <div className="lg:hidden fixed top-0 left-0 bottom-0 w-[310px] z-50 bg-[hsl(230,15%,5%)] border-r border-white/[0.08] animate-slide-in overflow-y-auto">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                    <span className="text-sm font-semibold text-white/60 tracking-wide">
                      Filters
                    </span>
                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
                      aria-label="Close filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5">
                    <MarketSidebar {...sidebarProps} className="w-full" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}
