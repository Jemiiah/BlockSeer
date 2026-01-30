'use client';

import { useState, useEffect, useCallback } from 'react';
import { Market, MarketCategory } from '@/types';
import { fetchAllMarkets, fetchPendingMarkets, fetchLockedMarkets, ApiMarket } from '@/lib/api-client';

// Dummy pools to show when no real pools exist
const DUMMY_POOLS: Market[] = [
  {
    id: 'dummy-1',
    title: 'Bitcoin $150K by 2026',
    subtitle: 'Will BTC reach $150,000 USD?',
    category: 'Price',
    endDate: 'Dec 31, 2026',
    volume: '$0',
    traders: 0,
    yesPrice: 50,
    noPrice: 50,
    change: 0,
    status: 'upcoming',
    description: 'This market will resolve to Yes if Bitcoin reaches $150,000 USD on any major exchange before December 31, 2026.',
    resolution: 'Resolves based on price data from Coinbase, Binance, or Kraken.',
    history: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
  },
  {
    id: 'dummy-2',
    title: 'Ethereum Flips Bitcoin',
    subtitle: 'ETH market cap exceeds BTC in 2026',
    category: 'DeFi',
    endDate: 'Dec 31, 2026',
    volume: '$0',
    traders: 0,
    yesPrice: 25,
    noPrice: 75,
    change: 0,
    status: 'upcoming',
    description: 'Will Ethereum\'s market capitalization exceed Bitcoin\'s market capitalization at any point in 2026?',
    resolution: 'Resolves based on CoinGecko market cap data.',
    history: [25, 25, 25, 25, 25, 25, 25, 25, 25, 25],
  },
  {
    id: 'dummy-3',
    title: 'Aleo Top 20 by Market Cap',
    subtitle: 'ALEO enters top 20 cryptocurrencies',
    category: 'Token',
    endDate: 'Jun 30, 2026',
    volume: '$0',
    traders: 0,
    yesPrice: 35,
    noPrice: 65,
    change: 0,
    status: 'upcoming',
    description: 'Will Aleo (ALEO) enter the top 20 cryptocurrencies by market capitalization before June 30, 2026?',
    resolution: 'Resolves based on CoinGecko rankings.',
    history: [35, 35, 35, 35, 35, 35, 35, 35, 35, 35],
  },
];

// Convert API market to Market type
function apiMarketToMarket(market: ApiMarket): Market {
  // Calculate yes/no prices based on stakes
  const optionAStakes = market.option_a_stakes || 0;
  const optionBStakes = market.option_b_stakes || 0;
  const totalStakes = optionAStakes + optionBStakes;

  let yesPrice = 50;
  let noPrice = 50;

  if (totalStakes > 0) {
    yesPrice = Math.round((optionAStakes / totalStakes) * 100);
    noPrice = 100 - yesPrice;
  }

  // Determine status based on API status
  let status: 'live' | 'upcoming' | 'resolved' = 'upcoming';
  if (market.status === 'pending') {
    status = 'live';
  } else if (market.status === 'locked') {
    status = 'upcoming';
  } else if (market.status === 'resolved') {
    status = 'resolved';
  }

  // Convert deadline to readable date
  const deadline = market.deadline ? new Date(market.deadline * 1000) : new Date();
  const endDate = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Convert total staked to volume string (microcredits to Aleo)
  const totalStaked = market.total_staked || 0;
  const volumeInAleo = totalStaked / 1_000_000;
  const volume = volumeInAleo >= 1000
    ? `$${(volumeInAleo / 1000).toFixed(1)}K`
    : `$${volumeInAleo.toFixed(2)}`;

  const traders = market.total_predictions || 0;

  return {
    id: market.id,
    title: market.title || `Market ${market.id}`,
    subtitle: market.description || `Prediction market with ${traders} predictions`,
    category: 'DeFi' as MarketCategory,
    endDate,
    volume,
    traders,
    yesPrice,
    noPrice,
    change: 0,
    status,
    description: market.description || `A prediction market on Manifold. Total staked: ${volumeInAleo.toFixed(2)} ALEO.`,
    resolution: 'This market resolves based on the outcome determined by the oracle.',
    history: [yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice, yesPrice],
  };
}

export function useAleoPools() {
  const [pools, setPools] = useState<Market[]>(DUMMY_POOLS);
  const [pendingPools, setPendingPools] = useState<Market[]>([]);
  const [lockedPools, setLockedPools] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all markets from backend API
      const [allMarkets, pending, locked] = await Promise.all([
        fetchAllMarkets(),
        fetchPendingMarkets(),
        fetchLockedMarkets(),
      ]);

      // Convert API markets to Market type
      const allPools = allMarkets.map(apiMarketToMarket);
      const pendingMarkets = pending.map(apiMarketToMarket);
      const lockedMarkets = locked.map(apiMarketToMarket);

      if (allPools.length > 0) {
        setPools(allPools);
        setPendingPools(pendingMarkets);
        setLockedPools(lockedMarkets);
        setIsLoading(false);
        return;
      }

      // No real pools found, use dummy pools
      console.log('No markets found from backend, using dummy data');
      setPools(DUMMY_POOLS);
      setPendingPools([]);
      setLockedPools([]);
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markets');
      // Fall back to dummy pools on error
      setPools(DUMMY_POOLS);
      setPendingPools([]);
      setLockedPools([]);
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
    isDummyData: pools === DUMMY_POOLS || pools.length === 0,
  };
}

// Export dummy pools for use in other places
export { DUMMY_POOLS };
