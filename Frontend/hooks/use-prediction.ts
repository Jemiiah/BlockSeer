'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

// Program ID from the deployed Leo program
const PROGRAM_ID = 'manifoldpredictionv5.aleo';

// Default pool ID
const DEFAULT_POOL_ID = '1field';

// Transaction polling config
const TX_POLL_INTERVAL = 3000; // 3 seconds
const TX_POLL_MAX_ATTEMPTS = 40; // 2 minutes max

// Execution fee — cross-program call to credits.aleo/transfer_private
// requires ZK proof generation which is computationally expensive.
const PREDICT_FEE = 1_500_000; // 1.5 ALEO in microcredits

// Timeout for requestRecords (some wallets hang on this)
const RECORD_FETCH_TIMEOUT = 15_000; // 15 seconds

interface PredictionParams {
  poolId?: string;
  option: 1 | 2;
  amount: number; // Amount in ALEO
  onProgress?: (message: string) => void;
}

interface PredictionResult {
  transactionId: string | undefined;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

function generateRandomNumber(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecordItem = Record<string, any>;

/**
 * Parse microcredits from a record, handling various wallet formats.
 */
function parseMicrocredits(record: RecordItem): number {
  // Try direct fields and nested data/plaintext objects
  const sources = [record, record.data, record.plaintext, record.recordPlaintext];
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    const raw = src.microcredits;
    if (raw != null) {
      return parseInt(
        String(raw).replace(/u64\.private|u64\.public|u64/g, '').trim(),
        10,
      ) || 0;
    }
  }

  // Try parsing plaintext string: "{ ..., microcredits: 5000000u64.private, ... }"
  // Shield wallet uses "recordPlaintext", others use "plaintext"
  const plaintextStr = record.plaintext || record.recordPlaintext;
  if (typeof plaintextStr === 'string') {
    const match = plaintextStr.match(/microcredits:\s*(\d+)u64/);
    if (match) return parseInt(match[1], 10) || 0;
  }

  return 0;
}

/**
 * Extract the record value to pass as a transaction input.
 */
function extractRecordInput(record: RecordItem): string | null {
  // Prefer plaintext string (Aleo record plaintext format)
  // Shield wallet uses "recordPlaintext", others use "plaintext"
  const plaintextStr = record.plaintext || record.recordPlaintext;
  if (typeof plaintextStr === 'string' && plaintextStr.includes('microcredits')) {
    return plaintextStr;
  }
  // Some wallets return ciphertext
  if (typeof record.ciphertext === 'string' || typeof record.recordCiphertext === 'string') {
    return record.ciphertext || record.recordCiphertext;
  }
  // If the record itself looks like a valid plaintext object
  if (record.owner && record.microcredits != null) {
    return JSON.stringify(record);
  }
  return null;
}

/**
 * Wrap a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ]);
}

export function usePrediction() {
  const {
    address,
    executeTransaction,
    requestRecords,
    transactionStatus,
  } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const pollTransactionStatus = useCallback(
    async (tempTxId: string): Promise<{ confirmed: boolean; onChainId?: string; error?: string }> => {
      if (!transactionStatus) {
        console.warn('Wallet does not support transactionStatus:', tempTxId);
        return { confirmed: false, onChainId: tempTxId };
      }

      for (let attempt = 0; attempt < TX_POLL_MAX_ATTEMPTS; attempt++) {
        try {
          const status = await transactionStatus(tempTxId);
          console.debug(`[predict] TX poll #${attempt + 1}:`, status?.status);

          if (status.status === 'accepted') {
            return { confirmed: true, onChainId: status.transactionId };
          }
          if (status.status === 'failed' || status.status === 'rejected') {
            return { confirmed: false, error: status.error || `Transaction ${status.status} on-chain` };
          }
        } catch (e) {
          console.warn('Status poll error:', e);
        }
        await new Promise((r) => setTimeout(r, TX_POLL_INTERVAL));
      }
      return { confirmed: false };
    },
    [transactionStatus],
  );

  const makePrediction = useCallback(
    async ({
      poolId = DEFAULT_POOL_ID,
      option,
      amount,
      onProgress,
    }: PredictionParams): Promise<PredictionResult> => {
      const progress = onProgress || (() => {});

      if (!address) {
        return { transactionId: undefined, status: 'error', error: 'Wallet not connected' };
      }
      if (!executeTransaction) {
        return { transactionId: undefined, status: 'error', error: 'Wallet does not support transactions' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const randomNumber = generateRandomNumber();
        const formattedPoolId = poolId.endsWith('field') ? poolId : `${poolId}field`;
        const amountInMicrocredits = Math.floor(amount * 1_000_000);

        if (amountInMicrocredits <= 0) {
          throw new Error('Amount must be greater than 0');
        }

        // Debug info (no sensitive data)
        console.debug('[predict]', formattedPoolId, 'option', option, amountInMicrocredits, 'microcredits');

        // ── Step 1: Find a credits record ──
        progress('Fetching credits records from wallet...');

        let creditsRecord: { input: string; microcredits: number } | null = null;

        if (requestRecords) {
          try {
            const records = await withTimeout(
              requestRecords('credits.aleo', true),
              RECORD_FETCH_TIMEOUT,
              'requestRecords',
            );

            console.debug(`[predict] Found ${records.length} credits record(s)`);

            const candidates = (records as RecordItem[])
              .filter((r) => !r.spent)
              .map((r) => ({ record: r, microcredits: parseMicrocredits(r) }))
              .filter((r) => r.microcredits >= amountInMicrocredits)
              .sort((a, b) => b.microcredits - a.microcredits);

            console.debug('[predict] Candidate balances:', candidates.map((c) => c.microcredits));

            if (candidates.length > 0) {
              const best = candidates[0];
              const input = extractRecordInput(best.record);
              if (input) {
                creditsRecord = { input, microcredits: best.microcredits };
                console.debug(`[predict] Selected record: ${best.microcredits} microcredits`);
              } else {
                console.warn('[predict] Could not extract input from record');
              }
            } else {
              const allBalances = (records as RecordItem[])
                .filter((r) => !r.spent)
                .map((r) => parseMicrocredits(r));
              console.warn('[predict] No record with enough balance. Unspent balances:', allBalances);
            }
          } catch (e) {
            console.warn('requestRecords failed or timed out:', e);
          }
        }

        if (!creditsRecord) {
          throw new Error(
            `Insufficient private credits balance. You need at least ${amount} ALEO ` +
            `in a single unspent private credits record. ` +
            `Try consolidating your records or transferring credits to your private balance.`,
          );
        }

        // ── Step 2: Build inputs ──
        progress('Building transaction...');

        const inputs: (string | RecordItem)[] = [
          formattedPoolId,
          `${option}u64`,
          `${amountInMicrocredits}u64`,
          `${randomNumber}u64`,
          creditsRecord.input,
        ];

        console.debug('[predict] Inputs ready, credits record:', creditsRecord.microcredits, 'microcredits');

        // ── Step 3: Submit to wallet ──
        progress('Waiting for wallet approval...');

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'predict',
          inputs: inputs as string[],
          fee: PREDICT_FEE,
          recordIndices: [4],
          privateFee: false,
        });

        const tempTxId = typeof result === 'string' ? result : result?.transactionId;
        console.debug('[predict] TX submitted:', tempTxId);

        if (!tempTxId) {
          throw new Error(
            'Wallet did not return a transaction ID. ' +
            'The transaction may have been rejected — check your wallet for details.',
          );
        }

        setTransactionId(tempTxId);

        // ── Step 4: Poll for confirmation ──
        progress('Transaction submitted. Waiting for on-chain confirmation...');

        const txResult = await pollTransactionStatus(tempTxId);

        if (txResult.error) {
          setError(txResult.error);
          setIsLoading(false);
          return {
            transactionId: txResult.onChainId || tempTxId,
            status: 'error',
            error: txResult.error,
          };
        }

        const finalTxId = txResult.onChainId || tempTxId;
        setTransactionId(finalTxId);
        setIsLoading(false);

        // Report prediction to Oracle (non-blocking — failure doesn't break the prediction)
        try {
          await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prediction_id: finalTxId,
              market_id: formattedPoolId,
              option,
              amount: amountInMicrocredits,
              tx_id: finalTxId,
            }),
          });
          console.debug('[predict] Reported to Oracle');
        } catch (reportErr) {
          console.warn('Failed to report prediction to Oracle (non-fatal):', reportErr);
        }

        return {
          transactionId: finalTxId,
          status: txResult.confirmed ? 'success' : 'pending',
        };
      } catch (e) {
        console.error('Prediction error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Transaction failed';
        setError(errorMessage);
        setIsLoading(false);

        return { transactionId: undefined, status: 'error', error: errorMessage };
      }
    },
    [address, executeTransaction, requestRecords, pollTransactionStatus],
  );

  return {
    makePrediction,
    isLoading,
    error,
    transactionId,
    isConnected: !!address,
    address,
  };
}
