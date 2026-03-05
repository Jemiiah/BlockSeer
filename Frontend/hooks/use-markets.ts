'use client';

import { useState, useMemo } from 'react';
import { Market, MarketFilter, MarketCategory, MarketSort } from '@/types';
import { filterMarkets, sortMarkets, countMarketsByStatus } from '@/lib/utils';

export function useMarkets(initialMarkets: Market[]) {
  const [filter, setFilter] = useState<MarketFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<MarketCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<MarketSort>('volume');

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

    return sortMarkets(markets, sort);
  }, [initialMarkets, filter, categoryFilter, searchQuery, sort]);

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
    sort,
    setSort,
    liveCount: counts.live,
    upcomingCount: counts.upcoming,
    resolvedCount: counts.resolved,
  };
}
