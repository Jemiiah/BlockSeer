'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Market, MarketCategory } from '@/types';
import { fetchAllMarkets, ApiMarket } from '@/lib/api-client';
import { getPool, AleoPool } from '@/lib/aleo-client';
import { calculateOdds } from '@/lib/utils';

// Convert API market to Market type, optionally enriched with on-chain data
function apiMarketToMarket(market: ApiMarket, onChain?: AleoPool | null): Market {
  const optionAStakes = onChain ? onChain.option_a_stakes : parseInt(market.option_a_stakes || '0', 10);
  const optionBStakes = onChain ? onChain.option_b_stakes : parseInt(market.option_b_stakes || '0', 10);

  const { yesPrice, noPrice } = calculateOdds(optionAStakes, optionBStakes);

  const traders = onChain ? onChain.total_no_of_stakes : 0;

  let status: 'live' | 'upcoming' | 'resolved' = 'live';
  if (market.status === 'pending') {
    status = 'live';
  } else if (market.status === 'locked') {
    status = 'upcoming';
  } else if (market.status === 'resolved') {
    status = 'resolved';
  }

  const deadlineTimestamp = parseInt(market.deadline || '0', 10);
  const deadline = deadlineTimestamp ? new Date(deadlineTimestamp * 1000) : new Date();
  const endDate = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const totalStaked = onChain ? onChain.total_staked : parseInt(market.total_staked || '0', 10);
  const volumeInAleo = totalStaked / 1_000_000;
  const volume = volumeInAleo >= 1000
    ? `${(volumeInAleo / 1000).toFixed(1)}K ALEO`
    : `${volumeInAleo.toFixed(2)} ALEO`;

  const subtitle = `${market.option_a_label} vs ${market.option_b_label}`;

  return {
    id: market.market_id,
    title: market.title || `Market`,
    subtitle: subtitle,
    category: 'DeFi' as MarketCategory,
    endDate,
    volume,
    traders,
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
  const queryClient = useQueryClient();

  // Phase 1: Fetch markets from API only (fast)
  const { data: pools = [], isLoading, error, refetch } = useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const allMarkets = await fetchAllMarkets();
      return allMarkets.map((market) => apiMarketToMarket(market));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Phase 2: Enrich with on-chain data in the background
  useEffect(() => {
    if (pools.length === 0 || isLoading) return;

    let cancelled = false;

    async function enrichWithOnChain() {
      const allMarkets = await fetchAllMarkets();
      const enriched = await Promise.all(
        allMarkets.map(async (market) => {
          try {
            const onChainPool = await getPool(market.market_id);
            return apiMarketToMarket(market, onChainPool);
          } catch {
            return apiMarketToMarket(market);
          }
        })
      );

      if (!cancelled) {
        queryClient.setQueryData(['markets'], enriched);
      }
    }

    enrichWithOnChain();

    return () => { cancelled = true; };
  }, [pools.length > 0 && !isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    pools,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch markets') : null,
    refetch,
  };
}
