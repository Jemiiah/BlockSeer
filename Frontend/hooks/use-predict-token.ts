'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const PROGRAM_ID = 'manifoldpredictionv5.aleo';
const PREDICT_TOKEN_FEE = 1_500_000; // 1.5 ALEO in microcredits
const TX_POLL_INTERVAL = 3000;
const TX_POLL_MAX_ATTEMPTS = 40;
const RECORD_FETCH_TIMEOUT = 15_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecordItem = Record<string, any>;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ]);
}

interface PredictTokenParams {
  poolId: string;
  option: 1 | 2;
  amount: number; // raw token amount (e.g. microcredits equivalent)
  random?: number;
  onProgress?: (msg: string) => void;
}

export function usePredictToken() {
  const { address, executeTransaction, requestRecords, transactionStatus } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTxStatus = useCallback(
    async (tempTxId: string): Promise<{ confirmed: boolean; onChainId?: string; error?: string }> => {
      if (!transactionStatus) return { confirmed: false, onChainId: tempTxId };
      for (let attempt = 0; attempt < TX_POLL_MAX_ATTEMPTS; attempt++) {
        try {
          const status = await transactionStatus(tempTxId);
          if (status.status === 'accepted') return { confirmed: true, onChainId: status.transactionId };
          if (status.status === 'failed' || status.status === 'rejected') {
            return { confirmed: false, error: status.error || `Transaction ${status.status}` };
          }
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, TX_POLL_INTERVAL));
      }
      return { confirmed: false };
    },
    [transactionStatus],
  );

  const predictWithToken = useCallback(
    async (params: PredictTokenParams) => {
      const { poolId, option, amount, onProgress } = params;
      const progress = onProgress || (() => {});

      if (!address || !executeTransaction) {
        setError('Wallet not connected');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch token_registry.aleo records from wallet
        progress('Fetching token records from wallet...');

        let tokenRecord: string | null = null;

        if (requestRecords) {
          try {
            const records = await withTimeout(
              requestRecords('token_registry.aleo', true),
              RECORD_FETCH_TIMEOUT,
              'requestRecords',
            );

            // Find a Token record with sufficient balance
            for (const record of records as RecordItem[]) {
              if (record.spent) continue;
              const plaintextStr = (record.plaintext || record.recordPlaintext) as string | undefined;
              if (plaintextStr && typeof plaintextStr === 'string') {
                // Check amount field in the record
                const amountMatch = plaintextStr.match(/amount:\s*(\d+)u128/);
                if (amountMatch) {
                  const recordAmount = parseInt(amountMatch[1], 10);
                  if (recordAmount >= amount) {
                    tokenRecord = plaintextStr;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Failed to fetch token records:', e);
          }
        }

        if (!tokenRecord) {
          throw new Error('No token record with sufficient balance found in wallet.');
        }

        const formattedPoolId = poolId.endsWith('field') ? poolId : `${poolId}field`;
        const random = params.random ?? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

        progress('Building transaction...');

        const inputs = [
          formattedPoolId,
          `${option}u64`,
          `${amount}u64`,
          `${random}u64`,
          tokenRecord,
        ];

        progress('Waiting for wallet approval...');

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'predict_with_token',
          inputs,
          fee: PREDICT_TOKEN_FEE,
          recordIndices: [4],
          privateFee: false,
        });

        const tempTxId = typeof result === 'string' ? result : result?.transactionId;
        if (!tempTxId) throw new Error('Wallet did not return a transaction ID');

        progress('Transaction submitted. Waiting for confirmation...');
        const txResult = await pollTxStatus(tempTxId);

        if (txResult.error) {
          setError(txResult.error);
          setIsLoading(false);
          return false;
        }

        const finalTxId = txResult.onChainId || tempTxId;
        progress(txResult.confirmed
          ? `Token prediction confirmed! TX: ${finalTxId.slice(0, 16)}...`
          : `TX submitted: ${finalTxId.slice(0, 16)}... Check explorer.`);
        setIsLoading(false);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Token prediction failed';
        setError(msg);
        setIsLoading(false);
        return false;
      }
    },
    [address, executeTransaction, requestRecords, pollTxStatus],
  );

  return { predictWithToken, isLoading, error };
}
