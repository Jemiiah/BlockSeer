'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

// Program ID
const PROGRAM_ID = 'predictionprivacyhackviii.aleo';

// Prediction record structure from Leo program
export interface PredictionRecord {
  id: string;
  owner: string;
  pool_id: string;
  option: number; // 1 or 2
  amount: number; // in microcredits
  claimed: boolean;
}

// Parsed prediction for display
export interface UserPrediction {
  id: string;
  poolId: string;
  poolName: string;
  outcome: 'Yes' | 'No';
  amount: number; // in Aleo
  amountUsd: number; // estimated USD value
  claimed: boolean;
  status: 'active' | 'won' | 'lost' | 'pending';
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
    const data = record.plaintext || record.data || record;

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

      return {
        id: parseField(obj.id),
        owner: obj.owner?.replace('.private', '') || '',
        pool_id: parseField(obj.pool_id),
        option: parseU64(obj.option),
        amount: parseU64(obj.amount),
        claimed: parseBool(obj.claimed),
      };
    }

    // Object format
    const dataObj = data as Record<string, string>;
    return {
      id: parseField(dataObj.id),
      owner: dataObj.owner?.replace('.private', '') || '',
      pool_id: parseField(dataObj.pool_id),
      option: parseU64(dataObj.option),
      amount: parseU64(dataObj.amount),
      claimed: parseBool(dataObj.claimed),
    };
  } catch (error) {
    console.error('Error parsing record:', error, record);
    return null;
  }
}

// Convert PredictionRecord to UserPrediction for display
function toUserPrediction(record: PredictionRecord, index: number): UserPrediction {
  // Convert microcredits to Aleo (1 Aleo = 1,000,000 microcredits)
  const amountInAleo = record.amount / 1_000_000;

  // Estimate USD value (placeholder rate)
  const aleoPrice = 1.5; // Placeholder price
  const amountUsd = amountInAleo * aleoPrice;

  return {
    id: record.id || `prediction-${index}`,
    poolId: record.pool_id,
    poolName: `Pool ${record.pool_id.slice(0, 8)}...`,
    outcome: record.option === 1 ? 'Yes' : 'No',
    amount: amountInAleo,
    amountUsd,
    claimed: record.claimed,
    status: record.claimed ? 'pending' : 'active', // Will need pool status to determine win/loss
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
      // Request decrypted records from the wallet
      const records = await requestRecords(PROGRAM_ID, true);

      if (!records || !Array.isArray(records)) {
        setPredictions([]);
        setHasAttemptedFetch(true);
        return;
      }

      // Parse and filter Prediction records
      const parsedPredictions: UserPrediction[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i] as Record<string, unknown>;

        // Check if this is a Prediction record (by recordName or structure)
        const recordName = (record.recordName || record.name || '') as string;
        if (recordName && !recordName.includes('Prediction')) {
          continue;
        }

        const parsed = parseRecordPlaintext(record as Record<string, unknown>);
        if (parsed) {
          parsedPredictions.push(toUserPrediction(parsed, i));
        }
      }

      setPredictions(parsedPredictions);
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
