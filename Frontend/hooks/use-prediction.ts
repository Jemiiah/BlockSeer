'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

// Program ID from the deployed Leo program
const PROGRAM_ID = 'manifoldpredictionv2.aleo';

// Default pool ID (will be made dynamic later)
const DEFAULT_POOL_ID = '1field';

// Transaction polling config
const TX_POLL_INTERVAL = 3000; // 3 seconds
const TX_POLL_MAX_ATTEMPTS = 40; // 2 minutes max

// Execution fee for predict (cross-program call to credits.aleo needs higher fee)
const PREDICT_FEE = 1_500_000; // 1.5 ALEO

interface PredictionParams {
  poolId?: string;
  option: 1 | 2; // 1 for option A, 2 for option B
  amount: number; // Amount in ALEO (will be converted to microcredits)
}

interface PredictionResult {
  transactionId: string | undefined;
  status: 'pending' | 'success' | 'error'; // pending = submitted but unverified
  error?: string;
}

function generateRandomNumber(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
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
        console.warn('Wallet does not support transactionStatus. TX submitted but unverified:', tempTxId);
        return { confirmed: false, onChainId: tempTxId, error: undefined };
      }

      for (let attempt = 0; attempt < TX_POLL_MAX_ATTEMPTS; attempt++) {
        try {
          const status = await transactionStatus(tempTxId);
          console.log(`TX status poll #${attempt + 1}:`, status);

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
    [transactionStatus]
  );

  /**
   * Find a suitable unspent credits record with enough balance.
   */
  const findCreditsRecord = useCallback(
    async (requiredAmount: number): Promise<string | null> => {
      if (!requestRecords) return null;

      try {
        const records = await requestRecords('credits.aleo', true);
        console.log('Available credits records:', records);

        // Find a record with enough microcredits
        for (const record of records) {
          const rec = record as Record<string, unknown>;
          // Records have a `microcredits` field and may be spent
          if (rec.spent) continue;

          const plaintext = (rec.plaintext || rec.data || rec) as Record<string, unknown>;
          const microcredits = parseInt(
            String(plaintext.microcredits || '0').replace('u64.private', '').replace('u64', ''),
            10
          );

          if (microcredits >= requiredAmount) {
            // Return the record plaintext string the wallet expects
            if (typeof rec.plaintext === 'string') return rec.plaintext as string;
            // Return the serialized record ciphertext if available
            if (typeof rec.ciphertext === 'string') return rec.ciphertext as string;
          }
        }
      } catch (e) {
        console.warn('Could not fetch credits records:', e);
      }
      return null;
    },
    [requestRecords]
  );

  const makePrediction = useCallback(
    async ({
      poolId = DEFAULT_POOL_ID,
      option,
      amount,
    }: PredictionParams): Promise<PredictionResult> => {
      if (!address) {
        return {
          transactionId: undefined,
          status: 'error',
          error: 'Wallet not connected',
        };
      }

      if (!executeTransaction) {
        return {
          transactionId: undefined,
          status: 'error',
          error: 'Wallet does not support transactions',
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        const randomNumber = generateRandomNumber();
        const formattedPoolId = poolId.endsWith('field') ? poolId : `${poolId}field`;
        const amountInMicrocredits = Math.floor(amount * 1_000_000);

        console.log('=== PREDICTION DEBUG ===');
        console.log('Address:', address);
        console.log('Amount (ALEO):', amount);
        console.log('Amount (microcredits):', amountInMicrocredits);

        // Build inputs matching the Leo function signature:
        //   predict(pool_id: field, option: u64, amount: u64, random_number: u64, user_credit: credits)
        const inputs: string[] = [
          formattedPoolId,
          `${option}u64`,
          `${amountInMicrocredits}u64`,
          `${randomNumber}u64`,
        ];

        // Try to find and attach the credits record for the 5th input
        const creditsRecord = await findCreditsRecord(amountInMicrocredits + PREDICT_FEE);
        if (creditsRecord) {
          inputs.push(creditsRecord);
          console.log('Attached credits record as 5th input');
        } else {
          console.log('No explicit record found; relying on wallet auto-resolution');
        }

        console.log('=== TRANSACTION ===');
        console.log('Program:', PROGRAM_ID);
        console.log('Function: predict');
        console.log('Inputs count:', inputs.length);
        console.log('Fee:', PREDICT_FEE);

        // Submit — use public fee to avoid needing a separate private record for fees
        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'predict',
          inputs: inputs,
          fee: PREDICT_FEE,
          privateFee: false,
        });

        const tempTxId = typeof result === 'string' ? result : result?.transactionId;
        console.log('Wallet returned TX ID:', tempTxId);

        if (!tempTxId) {
          throw new Error('Wallet did not return a transaction ID — the transaction may have been rejected by the wallet.');
        }

        setTransactionId(tempTxId);

        // Poll for on-chain confirmation
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

        return {
          transactionId: undefined,
          status: 'error',
          error: errorMessage,
        };
      }
    },
    [address, executeTransaction, findCreditsRecord, pollTransactionStatus]
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
