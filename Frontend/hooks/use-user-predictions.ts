'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { fetchAllMarkets, ApiMarket } from '@/lib/api-client';
import { getPool, AleoPool } from '@/lib/aleo-client';
import { getTokenSymbol, formatTokenAmount } from '@/lib/tokens';

// Program ID
const PROGRAM_ID = 'manifoldpredictionv6.aleo';

// Prediction record structure from Leo program
export interface PredictionRecord {
  id: string;
  owner: string;
  pool_id: string;
  option: number; // 1 or 2
  amount: number; // in microcredits
  claimed: boolean;
  token_id: string; // '0' = ALEO, else ARC-21 token_id
}

// Parsed prediction for display
export interface UserPrediction {
  id: string;
  poolId: string;
  marketId: string; // Same as poolId, for navigation compatibility
  poolName: string;
  outcome: 'Yes' | 'No';
  amount: number; // in human-readable units (ALEO or token)
  claimed: boolean;
  status: 'active' | 'won' | 'lost' | 'pending';
  profit: number; // in human-readable units (positive = won, negative = lost, 0 = pending)
  profitPercent: number; // percentage gain/loss
  marketTitle: string; // human-readable market name
  marketStatus: 'pending' | 'locked' | 'resolved' | 'disputed' | 'cancelled';
  tokenId: string;
  tokenSymbol: string;
  isCancelled: boolean;
  isClaimable: boolean;
}

// Market + on-chain data used during enrichment
interface EnrichmentData {
  market: ApiMarket | null;
  pool: AleoPool | null;
}

// Parse Aleo field value
function parseField(value: string): string {
  if (!value) return '';
  return value.replace('field', '').replace('.private', '').replace('.public', '').trim();
}

// Parse Aleo u64 value
function parseU64(value: string): number {
  if (!value) return 0;
  return parseInt(value.replace('u64', '').replace('.private', '').replace('.public', '').trim(), 10);
}

// Parse Aleo bool value
function parseBool(value: string): boolean {
  if (!value) return false;
  return value.replace('.private', '').replace('.public', '').trim() === 'true';
}

// Parse record plaintext to PredictionRecord
function parseRecordPlaintext(record: Record<string, unknown>): PredictionRecord | null {
  try {
    // The plaintext field contains the actual record data
    const data = record.recordPlaintext || record.plaintext || record.data || record;

    console.log('🔍 DATA TO PARSE (type:', typeof data, '):', typeof data === 'string' ? data.slice(0, 200) : data);

    if (typeof data === 'string') {
      // Parse string format: { id: 123field, owner: aleo1..., ... }
      const content = data.trim().slice(1, -1);
      const pairs = content.split(',').map((p: string) => p.trim());
      const obj: Record<string, string> = {};

      for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex > -1) {
          const key = pair.slice(0, colonIndex).trim();
          const value = pair.slice(colonIndex + 1).trim();
          obj[key] = value;
        }
      }

      const poolIdClean = obj.pool_id?.replace('.private', '').trim() || '';
      return {
        id: parseField(obj.id),
        owner: obj.owner?.replace('.private', '') || '',
        pool_id: poolIdClean.endsWith('field') ? poolIdClean : poolIdClean + 'field', // Ensure 'field' suffix
        option: parseU64(obj.option),
        amount: parseU64(obj.amount),
        claimed: parseBool(obj.claimed),
        token_id: parseField(obj.token_id || '0field'),
      };
    }

    // Object format
    const dataObj = data as Record<string, string>;
    const poolIdCleanObj = dataObj.pool_id?.replace('.private', '').trim() || '';
    return {
      id: parseField(dataObj.id),
      owner: dataObj.owner?.replace('.private', '') || '',
      pool_id: poolIdCleanObj.endsWith('field') ? poolIdCleanObj : poolIdCleanObj + 'field', // Ensure 'field' suffix
      option: parseU64(dataObj.option),
      amount: parseU64(dataObj.amount),
      claimed: parseBool(dataObj.claimed),
      token_id: parseField(dataObj.token_id || '0field'),
    };
  } catch (error) {
    console.error('Error parsing record:', error, record);
    return null;
  }
}

// Protocol fee: 2% deducted from winnings
const PROTOCOL_FEE_BPS = 200;
const BPS_DENOMINATOR = 10000;

// Compute P&L for a prediction given on-chain pool data
function computePnL(
  record: PredictionRecord,
  market: ApiMarket | null,
  pool: AleoPool | null
): { profit: number; profitPercent: number } {
  const amountHuman = formatTokenAmount(record.amount, record.token_id);

  // Not resolved or no data — no P&L yet
  if (!market || market.status !== 'resolved' || !pool) {
    return { profit: 0, profitPercent: 0 };
  }

  const userOption = record.option; // 1 = option A, 2 = option B
  const winningOption = pool.winning_option;

  if (winningOption === 0) {
    return { profit: 0, profitPercent: 0 };
  }

  if (userOption === winningOption) {
    // User won: winnings = (amount * total_staked) / winning_option_stakes
    const winningStakes = winningOption === 1
      ? pool.option_a_stakes
      : pool.option_b_stakes;

    if (winningStakes === 0) {
      return { profit: 0, profitPercent: 0 };
    }

    const grossWinnings = (record.amount * pool.total_staked) / winningStakes;
    // Deduct 2% protocol fee
    const fee = (grossWinnings * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
    const netWinnings = grossWinnings - fee;
    const netWinningsHuman = formatTokenAmount(netWinnings, record.token_id);
    const profit = netWinningsHuman - amountHuman;
    const profitPercent = amountHuman > 0 ? (profit / amountHuman) * 100 : 0;

    return { profit, profitPercent };
  } else {
    // User lost: total loss
    return { profit: -amountHuman, profitPercent: -100 };
  }
}

// Convert PredictionRecord to UserPrediction for display, enriched with market data
function toUserPrediction(
  record: PredictionRecord,
  index: number,
  enrichment: EnrichmentData
): UserPrediction {
  const amountHuman = formatTokenAmount(record.amount, record.token_id);
  const { market, pool } = enrichment;
  const { profit, profitPercent } = computePnL(record, market, pool);

  // Derive market status
  const marketStatus: 'pending' | 'locked' | 'resolved' | 'disputed' | 'cancelled' =
    market?.status ?? 'pending';

  const isCancelled = market?.cancelled ?? false;

  // Derive display status
  let status: 'active' | 'won' | 'lost' | 'pending';
  if (isCancelled) {
    status = 'pending'; // Refundable
  } else if (marketStatus === 'resolved') {
    if (profit > 0) {
      status = 'won';
    } else {
      status = 'lost';
    }
  } else {
    status = 'active';
  }

  const tokenSymbol = getTokenSymbol(record.token_id);

  // Claimable: resolved, dispute window passed, not cancelled
  const now = Math.floor(Date.now() / 1000);
  const disputeWindowEnd = market?.dispute_window_end
    ? parseInt(String(market.dispute_window_end), 10)
    : null;
  const isClaimable = marketStatus === 'resolved'
    && !isCancelled
    && disputeWindowEnd !== null
    && now >= disputeWindowEnd
    && !record.claimed;

  // Market title: use API title or fall back to truncated pool ID
  const marketTitle = market?.title || `Pool ${record.pool_id.slice(0, 8)}...`;

  return {
    id: record.id || `prediction-${index}`,
    poolId: record.pool_id,
    marketId: record.pool_id, // Same as poolId, for navigation
    poolName: marketTitle,
    outcome: record.option === 1 ? 'Yes' : 'No',
    amount: amountHuman,
    claimed: record.claimed,
    status,
    profit,
    profitPercent,
    marketTitle,
    marketStatus,
    tokenId: record.token_id,
    tokenSymbol,
    isCancelled,
    isClaimable,
  };
}

export function useUserPredictions() {
  const { connected, address, requestRecords } = useWallet();
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  const fetchPredictions = useCallback(async () => {
    if (!connected || !address || !requestRecords) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch wallet records and API markets in parallel
      const [records, apiMarkets] = await Promise.all([
        requestRecords(PROGRAM_ID, true),
        fetchAllMarkets(),
      ]);

      if (!records || !Array.isArray(records)) {
        setPredictions([]);
        setHasAttemptedFetch(true);
        return;
      }

      // Build a lookup map: market_id -> ApiMarket
      const marketMap = new Map<string, ApiMarket>();
      for (const m of apiMarkets) {
        marketMap.set(m.market_id, m);
      }

      // Parse prediction records
      const parsedRecords: PredictionRecord[] = [];
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as Record<string, unknown>;
        const recordName = (record.recordName || record.name || '') as string;
        if (recordName && !recordName.includes('Prediction')) {
          continue;
        }
        console.log('🔍 RAW WALLET RECORD:', JSON.stringify(record, null, 2));
        const parsed = parseRecordPlaintext(record);
        console.log('🔍 PARSED RESULT:', parsed);
        if (parsed) {
          parsedRecords.push(parsed);
        }
      }
      console.log(`🔍 PORTFOLIO DEBUG - Found ${parsedRecords.length} predictions in wallet`);
      console.log('🔍 PORTFOLIO DEBUG - Available market IDs:', Array.from(marketMap.keys()).slice(0, 3));

      // Collect unique pool IDs for resolved markets that need on-chain data
      const resolvedPoolIds = new Set<string>();
      for (const rec of parsedRecords) {
        const market = marketMap.get(rec.pool_id);
        if (market?.status === 'resolved') {
          resolvedPoolIds.add(rec.pool_id);
        }
      }

      // Fetch on-chain pool data for resolved markets (in parallel)
      const poolMap = new Map<string, AleoPool>();
      if (resolvedPoolIds.size > 0) {
        const poolEntries = await Promise.all(
          Array.from(resolvedPoolIds).map(async (poolId) => {
            const pool = await getPool(poolId);
            return [poolId, pool] as const;
          })
        );
        for (const [id, pool] of poolEntries) {
          if (pool) {
            poolMap.set(id, pool);
          }
        }
      }

      // Convert to UserPrediction with enrichment
      const enrichedPredictions = parsedRecords.map((rec, i) => {
        const market = marketMap.get(rec.pool_id) ?? null;
        const pool = poolMap.get(rec.pool_id) ?? null;
        console.log(`🔍 Enriching prediction - pool_id: ${rec.pool_id}, found market: ${market?.title || 'NOT FOUND'}`);
        return toUserPrediction(rec, i, { market, pool });
      });

      setPredictions(enrichedPredictions);
      setHasAttemptedFetch(true);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
      setPredictions([]);
      setHasAttemptedFetch(true);
    } finally {
      setIsLoading(false);
    }
  }, [connected, address, requestRecords]);

  // Fetch predictions when wallet connects
  useEffect(() => {
    if (connected && address && !hasAttemptedFetch) {
      fetchPredictions();
    }
  }, [connected, address, hasAttemptedFetch, fetchPredictions]);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setPredictions([]);
      setHasAttemptedFetch(false);
    }
  }, [connected]);

  const refetch = useCallback(() => {
    setHasAttemptedFetch(false);
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    predictions,
    isLoading,
    error,
    refetch,
    hasPredictions: predictions.length > 0,
    isConnected: connected,
  };
}
