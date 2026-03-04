'use client';

import { useState, useMemo } from 'react';
import { Market, MarketFilter, MarketCategory } from '@/types';
import { filterMarkets, countMarketsByStatus } from '@/lib/utils';

export function useMarkets(initialMarkets: Market[]) {
  const [filter, setFilter] = useState<MarketFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<MarketCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMarkets = useMemo(() => {
    let markets = filterMarkets(initialMarkets, filter);

    if (categoryFilter !== 'all') {
      markets = markets.filter((m) => m.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      markets = markets.filter(
        (market) =>
          market.title.toLowerCase().includes(query) ||
          market.description?.toLowerCase().includes(query) ||
          market.category?.toLowerCase().includes(query)
      );
    }

    return markets;
  }, [initialMarkets, filter, categoryFilter, searchQuery]);

  const counts = useMemo(
    () => countMarketsByStatus(initialMarkets),
    [initialMarkets]
  );

  return {
    filter,
    setFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    filteredMarkets,
    liveCount: counts.live,
    upcomingCount: counts.upcoming,
    resolvedCount: counts.resolved,
  };
}
