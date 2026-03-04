'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Navbar } from '@/components/navbar';
import { Portfolio } from '@/components/portfolio';
import { MarketCard, MarketCardSkeleton, MarketFilters, FeaturedMarket } from '@/components/market';
import { useMarkets, useAleoPools } from '@/hooks';
import { MarketCategory, Market } from '@/types';
import { ALL_CATEGORIES } from '@/lib/category-map';
import { Clock, CheckCircle2 } from 'lucide-react';

function MarketSection({
  title,
  icon,
  markets,
  emptyText,
  accentColor = 'white',
}: {
  title: string;
  icon?: React.ReactNode;
  markets: Market[];
  emptyText: string;
  accentColor?: string;
}) {
  if (markets.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-5">
        {icon}
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <span className="text-xs bg-white/[0.06] text-white/50 px-2.5 py-1 rounded-full font-medium">
          {markets.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {markets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </section>
  );
}

const CATEGORY_ICONS: Record<MarketCategory, string> = {
  Crypto: '₿',
  DeFi: '🔗',
  Tech: '⚙️',
  AI: '🤖',
};

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

  // Group markets by category
  const marketsByCategory = useMemo(() => {
    const grouped: Record<MarketCategory, Market[]> = {
      Crypto: [],
      DeFi: [],
      Tech: [],
      AI: [],
    };
    pools.forEach((market) => {
      if (market.status !== 'resolved' && grouped[market.category]) {
        grouped[market.category].push(market);
      }
    });
    return grouped;
  }, [pools]);

  // Upcoming and resolved markets
  const upcomingMarkets = useMemo(
    () => pools.filter((m) => m.status === 'upcoming'),
    [pools]
  );
  const resolvedMarkets = useMemo(
    () => pools.filter((m) => m.status === 'resolved'),
    [pools]
  );

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

            {/* Filtered Results (when a filter or category is active) */}
            {(filter !== 'all' || categoryFilter !== 'all' || searchQuery.trim()) ? (
              isLoadingPools ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <MarketCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredMarkets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-[hsl(230,10%,50%)] text-lg mb-2">No markets found</p>
                  <p className="text-[hsl(230,10%,35%)] text-sm">
                    No markets match your current filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMarkets.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              )
            ) : (
              /* Category Sections (default "All" view) */
              isLoadingPools ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <MarketCardSkeleton key={i} />
                  ))}
                </div>
              ) : pools.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-[hsl(230,10%,50%)] text-lg mb-2">No markets found</p>
                  <p className="text-[hsl(230,10%,35%)] text-sm">
                    No prediction markets available yet.
                  </p>
                </div>
              ) : (
                <>
                  {/* Category sections */}
                  {ALL_CATEGORIES.map((cat) => (
                    <MarketSection
                      key={cat}
                      title={cat}
                      icon={
                        <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                      }
                      markets={marketsByCategory[cat]}
                      emptyText={`No ${cat} markets yet`}
                    />
                  ))}

                  {/* Upcoming Markets */}
                  <MarketSection
                    title="Upcoming Markets"
                    icon={<Clock className="w-5 h-5 text-amber-400" />}
                    markets={upcomingMarkets}
                    emptyText="No upcoming markets"
                  />

                  {/* Resolved / Ended Markets */}
                  <MarketSection
                    title="Resolved Markets"
                    icon={<CheckCircle2 className="w-5 h-5 text-zinc-400" />}
                    markets={resolvedMarkets}
                    emptyText="No resolved markets"
                  />
                </>
              )
            )}
          </div>
        )}
      </main>
    </>
  );
}
