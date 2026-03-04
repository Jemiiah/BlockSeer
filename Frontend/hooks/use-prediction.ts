'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

// Program ID from the deployed Leo program
const PROGRAM_ID = 'manifoldpredictionv2.aleo';

// Default pool ID
const DEFAULT_POOL_ID = '1field';

// Transaction polling config
const TX_POLL_INTERVAL = 3000; // 3 seconds
const TX_POLL_MAX_ATTEMPTS = 40; // 2 minutes max

// Execution fee — cross-program call to credits.aleo/transfer_private
// requires ZK proof generation which is computationally expensive.
const PREDICT_FEE = 1_500_000; // 1.5 ALEO in microcredits

interface PredictionParams {
  poolId?: string;
  option: 1 | 2; // 1 for option A, 2 for option B
  amount: number; // Amount in ALEO (will be converted to microcredits)
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
 * Parse microcredits value from a record, handling various wallet formats.
 * Wallets return records in different shapes — this normalizes them.
 */
function parseMicrocredits(record: RecordItem): number {
  // Try plaintext object fields
  const sources = [record, record.data, record.plaintext];
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

  // Try parsing plaintext string format: "{ ..., microcredits: 5000000u64.private, ... }"
  if (typeof record.plaintext === 'string') {
    const match = record.plaintext.match(/microcredits:\s*(\d+)u64/);
    if (match) return parseInt(match[1], 10) || 0;
  }

  return 0;
}

/**
 * Extract the record value to pass as a transaction input.
 * The wallet adapter expects either the plaintext string or parsed record object.
 */
function extractRecordInput(record: RecordItem): string | RecordItem | null {
  // Prefer the plaintext string (Aleo record plaintext format)
  if (typeof record.plaintext === 'string' && record.plaintext.includes('microcredits')) {
    return record.plaintext;
  }
  // Some wallets return the ciphertext
  if (typeof record.ciphertext === 'string') {
    return record.ciphertext;
  }
  // If the record itself looks like a plaintext object with the right fields
  if (record.owner && record.microcredits != null) {
    return JSON.stringify(record);
  }
  return null;
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

  /**
   * Poll transactionStatus until accepted/failed or timeout.
   */
  const pollTransactionStatus = useCallback(
    async (tempTxId: string): Promise<{ confirmed: boolean; onChainId?: string; error?: string }> => {
      if (!transactionStatus) {
        console.warn('Wallet does not support transactionStatus:', tempTxId);
        return { confirmed: false, onChainId: tempTxId };
      }

      for (let attempt = 0; attempt < TX_POLL_MAX_ATTEMPTS; attempt++) {
        try {
          const status = await transactionStatus(tempTxId);
          console.log(`TX poll #${attempt + 1}:`, status);

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

  /**
   * Fetch the user's unspent credits records and find one with enough balance.
   * Returns the record in the format expected by executeTransaction inputs.
   */
  const findCreditsRecord = useCallback(
    async (requiredMicrocredits: number): Promise<{ input: string; microcredits: number } | null> => {
      if (!requestRecords) {
        console.warn('Wallet does not support requestRecords');
        return null;
      }

      try {
        const records = await requestRecords('credits.aleo', true);
        console.log(`Found ${records.length} credits record(s)`);

        // Sort by balance descending — pick the largest suitable record
        const candidates = (records as RecordItem[])
          .filter((r) => !r.spent)
          .map((r) => ({ record: r, microcredits: parseMicrocredits(r) }))
          .filter((r) => r.microcredits >= requiredMicrocredits)
          .sort((a, b) => b.microcredits - a.microcredits);

        if (candidates.length === 0) {
          console.warn(
            `No credits record with >= ${requiredMicrocredits} microcredits. ` +
            `Records: ${(records as RecordItem[]).map((r) => parseMicrocredits(r)).join(', ')}`,
          );
          return null;
        }

        const best = candidates[0];
        const input = extractRecordInput(best.record);

        if (!input) {
          console.warn('Could not extract a usable input from record:', best.record);
          return null;
        }

        console.log(`Selected record with ${best.microcredits} microcredits`);
        return { input: typeof input === 'string' ? input : JSON.stringify(input), microcredits: best.microcredits };
      } catch (e) {
        console.error('Error fetching credits records:', e);
        return null;
      }
    },
    [requestRecords],
  );

  const makePrediction = useCallback(
    async ({
      poolId = DEFAULT_POOL_ID,
      option,
      amount,
    }: PredictionParams): Promise<PredictionResult> => {
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

        console.log('=== PREDICTION ===');
        console.log('Pool ID:', formattedPoolId);
        console.log('Option:', option);
        console.log('Amount:', amount, 'ALEO =', amountInMicrocredits, 'microcredits');

        // ── Step 1: Find a credits record with enough balance ──
        // The predict function requires a credits.aleo/credits record as the 5th input.
        // This record is consumed via credits.aleo/transfer_private to stake funds.
        const creditsRecord = await findCreditsRecord(amountInMicrocredits);

        if (!creditsRecord) {
          throw new Error(
            `Insufficient private credits balance. You need at least ${amount} ALEO ` +
            `in a single unspent private credits record. ` +
            `Try consolidating your records or transferring credits to your private balance.`,
          );
        }

        // ── Step 2: Build inputs in exact Leo function order ──
        // predict(pool_id: field, option: u64, amount: u64, random_number: u64, user_credit: credits.aleo/credits)
        const inputs: (string | RecordItem)[] = [
          formattedPoolId,           // pool_id: field
          `${option}u64`,            // option: u64
          `${amountInMicrocredits}u64`, // amount: u64
          `${randomNumber}u64`,      // random_number: u64
          creditsRecord.input,       // user_credit: credits.aleo/credits record
        ];

        console.log('Inputs:', inputs.map((inp, i) =>
          i === 4 ? `[credits record: ${creditsRecord.microcredits} microcredits]` : inp
        ));
        console.log('Fee:', PREDICT_FEE, 'microcredits');

        // ── Step 3: Execute the transaction ──
        // recordIndices tells the wallet which inputs are records (0-indexed).
        // privateFee: false uses the public balance for fees so we don't need
        // a second private record just for the fee.
        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'predict',
          inputs: inputs as string[],
          fee: PREDICT_FEE,
          recordIndices: [4],
          privateFee: false,
        });

        const tempTxId = typeof result === 'string' ? result : result?.transactionId;
        console.log('TX submitted:', tempTxId);

        if (!tempTxId) {
          throw new Error(
            'Wallet did not return a transaction ID. ' +
            'The transaction may have been rejected — check your wallet for details.',
          );
        }

        setTransactionId(tempTxId);

        // ── Step 4: Poll for on-chain confirmation ──
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
    [address, executeTransaction, findCreditsRecord, pollTransactionStatus],
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
