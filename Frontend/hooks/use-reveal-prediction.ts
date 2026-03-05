'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const PROGRAM_ID = 'manifoldpredictionv5.aleo';

// Fee for reveal transaction (ZK proof generation)
const REVEAL_FEE = 1_500_000; // 1.5 ALEO in microcredits

// Transaction polling config
const TX_POLL_INTERVAL = 3000;
const TX_POLL_MAX_ATTEMPTS = 40;

export interface RevealablePrediction {
  rawRecord: Record<string, unknown>;
  recordInput: string;
  id: string;
  poolId: string;
  option: number;
  amount: number;
  claimed: boolean;
}

function parseField(value: string): string {
  if (!value) return '';
  return value.replace('field', '').replace('.private', '').replace('.public', '').trim();
}

function parseU64(value: string): number {
  if (!value) return 0;
  return parseInt(value.replace('u64', '').replace('.private', '').replace('.public', '').trim(), 10) || 0;
}

function parseBool(value: string): boolean {
  if (!value) return false;
  return value.replace('.private', '').replace('.public', '').trim() === 'true';
}

function parseRecordToRevealable(record: Record<string, unknown>): RevealablePrediction | null {
  try {
    const plaintextStr = (record.plaintext || record.recordPlaintext) as string | undefined;
    if (!plaintextStr || typeof plaintextStr !== 'string') return null;

    // Extract record input for transaction
    const recordInput = plaintextStr;

    // Parse the plaintext string
    const content = plaintextStr.trim().slice(1, -1);
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

    const id = parseField(obj.id);
    const poolId = parseField(obj.pool_id);
    if (!id || !poolId) return null;

    return {
      rawRecord: record,
      recordInput,
      id,
      poolId,
      option: parseU64(obj.option),
      amount: parseU64(obj.amount),
      claimed: parseBool(obj.claimed),
    };
  } catch {
    return null;
  }
}

export function useRevealPrediction() {
  const {
    connected,
    address,
    requestRecords,
    executeTransaction,
    transactionStatus,
  } = useWallet();

  const [predictions, setPredictions] = useState<RevealablePrediction[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txMessage, setTxMessage] = useState<string>('');

  // Fetch prediction records from wallet
  const fetchPredictions = useCallback(async () => {
    if (!connected || !requestRecords) {
      setPredictions([]);
      return;
    }

    setIsLoadingRecords(true);
    setError(null);

    try {
      const records = await requestRecords(PROGRAM_ID, true);
      if (!records || !Array.isArray(records)) {
        setPredictions([]);
        return;
      }

      const parsed: RevealablePrediction[] = [];
      for (const record of records) {
        const rec = record as Record<string, unknown>;
        // Skip spent records
        if (rec.spent) continue;
        // Skip non-Prediction records
        const recordName = (rec.recordName || rec.name || '') as string;
        if (recordName && !recordName.includes('Prediction')) continue;

        const revealable = parseRecordToRevealable(rec);
        if (revealable && !revealable.claimed) {
          parsed.push(revealable);
        }
      }

      setPredictions(parsed);
    } catch (err) {
      console.error('Error fetching prediction records:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setIsLoadingRecords(false);
    }
  }, [connected, requestRecords]);

  // Fetch on mount when connected
  useEffect(() => {
    if (connected) {
      fetchPredictions();
    } else {
      setPredictions([]);
    }
  }, [connected, fetchPredictions]);

  const pollTxStatus = useCallback(
    async (tempTxId: string): Promise<{ confirmed: boolean; onChainId?: string; error?: string }> => {
      if (!transactionStatus) {
        return { confirmed: false, onChainId: tempTxId };
      }

      for (let attempt = 0; attempt < TX_POLL_MAX_ATTEMPTS; attempt++) {
        try {
          const status = await transactionStatus(tempTxId);
          if (status.status === 'accepted') {
            return { confirmed: true, onChainId: status.transactionId };
          }
          if (status.status === 'failed' || status.status === 'rejected') {
            return { confirmed: false, error: status.error || `Transaction ${status.status}` };
          }
        } catch {
          // ignore polling errors
        }
        await new Promise((r) => setTimeout(r, TX_POLL_INTERVAL));
      }
      return { confirmed: false };
    },
    [transactionStatus],
  );

  // Reveal a specific prediction on-chain
  const revealPrediction = useCallback(
    async (prediction: RevealablePrediction, onProgress?: (msg: string) => void) => {
      const progress = onProgress || (() => {});

      if (!executeTransaction) {
        setError('Wallet does not support transactions');
        return false;
      }

      setIsRevealing(true);
      setRevealingId(prediction.id);
      setError(null);
      setTxMessage('');

      try {
        progress('Submitting reveal transaction...');
        setTxMessage('Waiting for wallet approval...');

        // reveal_prediction takes a single Prediction record as input
        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'reveal_prediction',
          inputs: [prediction.recordInput],
          fee: REVEAL_FEE,
          recordIndices: [0],
          privateFee: false,
        });

        const tempTxId = typeof result === 'string' ? result : result?.transactionId;

        if (!tempTxId) {
          throw new Error('Wallet did not return a transaction ID');
        }

        progress('Transaction submitted. Waiting for confirmation...');
        setTxMessage(`TX submitted: ${tempTxId.slice(0, 16)}... Confirming...`);

        const txResult = await pollTxStatus(tempTxId);

        if (txResult.error) {
          setError(txResult.error);
          setTxMessage(txResult.error);
          return false;
        }

        const finalTxId = txResult.onChainId || tempTxId;
        const msg = txResult.confirmed
          ? `Prediction revealed on-chain! TX: ${finalTxId.slice(0, 16)}...`
          : `TX submitted: ${finalTxId.slice(0, 16)}... Check explorer for confirmation.`;
        setTxMessage(msg);
        progress(msg);

        // Report reveal to Oracle (non-blocking)
        try {
          await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prediction_id: prediction.id,
              market_id: prediction.poolId.endsWith('field') ? prediction.poolId : `${prediction.poolId}field`,
              option: prediction.option,
              amount: prediction.amount,
              tx_id: finalTxId,
            }),
          });
        } catch {
          // Non-fatal — on-chain reveal is what matters
        }

        // Refresh records after reveal
        await fetchPredictions();
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Reveal failed';
        setError(msg);
        setTxMessage(msg);
        return false;
      } finally {
        setIsRevealing(false);
        setRevealingId(null);
      }
    },
    [executeTransaction, pollTxStatus, fetchPredictions],
  );

  // Get predictions for a specific pool
  const getPredictionsForPool = useCallback(
    (poolId: string) => {
      const normalizedId = poolId.replace('field', '');
      return predictions.filter((p) => p.poolId === normalizedId);
    },
    [predictions],
  );

  return {
    predictions,
    isLoadingRecords,
    isRevealing,
    revealingId,
    error,
    txMessage,
    revealPrediction,
    fetchPredictions,
    getPredictionsForPool,
    isConnected: connected,
  };
}
