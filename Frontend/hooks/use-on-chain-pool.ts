'use client';

import { useQuery } from '@tanstack/react-query';
import { getPool, getTotalPredictions, AleoPool } from '@/lib/aleo-client';

export function useOnChainPool(poolId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['onChainPool', poolId],
    queryFn: async () => {
      if (!poolId) return { pool: null, totalPredictions: 0 };

      const [pool, predictions] = await Promise.all([
        getPool(poolId),
        getTotalPredictions(poolId),
      ]);

      return {
        pool,
        totalPredictions: predictions ?? 0,
      };
    },
    enabled: !!poolId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  return {
    pool: data?.pool ?? null,
    totalPredictions: data?.totalPredictions ?? 0,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch on-chain pool') : null,
  };
}
