'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Market } from '@/types';
import { fetchAllMarkets, ApiMarket } from '@/lib/api-client';
import { getPool, AleoPool } from '@/lib/aleo-client';
import { calculateOdds } from '@/lib/utils';
import { inferCategory } from '@/lib/category-map';
import { getTokenSymbol, formatTokenAmount, getTokenConfig } from '@/lib/tokens';

// Convert API market to Market type, optionally enriched with on-chain data
function apiMarketToMarket(market: ApiMarket, onChain?: AleoPool | null): Market {
  const now = Math.floor(Date.now() / 1000);
  const revealWindowEnd = market.reveal_window_end ?? null;

  // Reveal window is active when pool is locked and reveal window hasn't ended yet
  const isInRevealWindow = market.status === 'locked'
    && revealWindowEnd !== null
    && now < revealWindowEnd;

  // Odds are revealed when: pool is resolved, OR pool is locked and reveal window has ended
  const oddsRevealed = market.status === 'resolved'
    || market.status === 'disputed'
    || market.status === 'cancelled'
    || (market.status === 'locked' && revealWindowEnd !== null && now >= revealWindowEnd);

  const optionAStakes = onChain ? onChain.option_a_stakes : parseInt(market.option_a_stakes || '0', 10);
  const optionBStakes = onChain ? onChain.option_b_stakes : parseInt(market.option_b_stakes || '0', 10);

  // If odds not revealed (betting phase or reveal window), show 50/50
  const { yesPrice, noPrice } = oddsRevealed
    ? calculateOdds(optionAStakes, optionBStakes)
    : { yesPrice: 50, noPrice: 50 };

  const traders = onChain ? onChain.total_no_of_stakes : 0;

  let status: 'live' | 'upcoming' | 'resolved' = 'live';
  if (market.status === 'pending') {
    status = 'live';
  } else if (market.status === 'locked') {
    status = 'upcoming';
  } else if (market.status === 'resolved' || market.status === 'disputed' || market.status === 'cancelled') {
    status = 'resolved';
  }

  const deadlineTimestamp = parseInt(market.deadline || '0', 10);
  const deadline = deadlineTimestamp ? new Date(deadlineTimestamp * 1000) : new Date();
  const endDate = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Token denomination
  const tokenId = market.token_id || '0';
  const tokenSymbol = getTokenSymbol(tokenId);
  const tokenConfig = getTokenConfig(tokenId);
  const totalStaked = onChain ? onChain.total_staked : parseInt(market.total_staked || '0', 10);
  const volumeHuman = formatTokenAmount(totalStaked, tokenId);
  const volume = volumeHuman >= 1000
    ? `${(volumeHuman / 1000).toFixed(1)}K ${tokenSymbol}`
    : `${volumeHuman.toFixed(2)} ${tokenSymbol}`;

  const subtitle = `${market.option_a_label} vs ${market.option_b_label}`;

  // v5 fields: dispute window, winning option, cancelled, claimable
  const disputeWindowEnd = market.dispute_window_end ?? null;
  const isInDisputeWindow = market.status === 'resolved'
    && disputeWindowEnd !== null
    && now < disputeWindowEnd;
  const isCancelled = market.cancelled ?? false;
  const winningOption = market.winning_option ?? null;
  const isClaimable = market.status === 'resolved'
    && !isCancelled
    && disputeWindowEnd !== null
    && now >= disputeWindowEnd;

  return {
    id: market.market_id,
    title: market.title || `Market`,
    subtitle: subtitle,
    category: inferCategory(market.metric_type, market.title),
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
    oddsRevealed,
    isInRevealWindow,
    revealWindowEnd,
    volumeRaw: volumeHuman,
    endTimestamp: deadlineTimestamp,
    tokenId,
    tokenSymbol,
    winningOption,
    disputeWindowEnd,
    isInDisputeWindow,
    isCancelled,
    isClaimable,
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
