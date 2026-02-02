'use client';

import { useState, useEffect, useCallback } from 'react';
import { Market, MarketCategory } from '@/types';
import { fetchAllMarkets, fetchPendingMarkets, fetchLockedMarkets, ApiMarket } from '@/lib/api-client';

// Convert API market to Market type
function apiMarketToMarket(market: ApiMarket): Market {
  // Parse stakes from string to number
  const optionAStakes = parseInt(market.option_a_stakes || '0', 10);
  const optionBStakes = parseInt(market.option_b_stakes || '0', 10);
  const totalStakes = optionAStakes + optionBStakes;

  let yesPrice = 50;
  let noPrice = 50;

  if (totalStakes > 0) {
    yesPrice = Math.round((optionAStakes / totalStakes) * 100);
    noPrice = 100 - yesPrice;
  }

  // Determine status based on API status
  // pending = open for betting = 'live'
  // locked = betting closed, awaiting resolution = 'upcoming' (resolving soon)
  // resolved = market is done = 'resolved'
  let status: 'live' | 'upcoming' | 'resolved' = 'live';
  if (market.status === 'pending') {
    status = 'live'; // Active and accepting predictions
  } else if (market.status === 'locked') {
    status = 'upcoming'; // Locked means waiting for resolution (not accepting bets)
  } else if (market.status === 'resolved') {
    status = 'resolved'; // Market has been resolved
  }

  // Convert deadline to readable date (deadline is Unix timestamp as string)
  const deadlineTimestamp = parseInt(market.deadline || '0', 10);
  const deadline = deadlineTimestamp ? new Date(deadlineTimestamp * 1000) : new Date();
  const endDate = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Convert total staked to volume string (microcredits to Aleo)
  const totalStaked = parseInt(market.total_staked || '0', 10);
  const volumeInAleo = totalStaked / 1_000_000;
  const volume = volumeInAleo >= 1000
    ? `${(volumeInAleo / 1000).toFixed(1)}K ALEO`
    : `${volumeInAleo.toFixed(2)} ALEO`;

  // Create subtitle from option labels
  const subtitle = `${market.option_a_label} vs ${market.option_b_label}`;

  return {
    id: market.market_id,
    title: market.title || `Market`,
    subtitle: subtitle,
    category: 'DeFi' as MarketCategory,
    endDate,
    volume,
    traders: 0,
    yesPrice,
    noPrice,
    change: 0,
    status,
    description: market.description || `A prediction market on Manifold.`,
    resolution: `This market resolves based on the ${market.metric_type} oracle. Threshold: ${market.threshold}`,
    history: [yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice],
  };
}

export function useAleoPools() {
  const [pools, setPools] = useState<Market[]>([]);
  const [pendingPools, setPendingPools] = useState<Market[]>([]);
  const [lockedPools, setLockedPools] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [allMarkets, pending, locked] = await Promise.all([
        fetchAllMarkets(),
        fetchPendingMarkets(),
        fetchLockedMarkets(),
      ]);

      // Convert API markets to Market type
      const allPools = allMarkets.map(apiMarketToMarket);
      const pendingMarkets = pending.map(apiMarketToMarket);
      const lockedMarkets = locked.map(apiMarketToMarket);

      setPools(allPools);
      setPendingPools(pendingMarkets);
      setLockedPools(lockedMarkets);
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markets');
      setPools([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const refetch = useCallback(() => {
    fetchPools();
  }, [fetchPools]);

  return {
    pools,
    pendingPools,
    lockedPools,
    isLoading,
    error,
    refetch,
  };
}
