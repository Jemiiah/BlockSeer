'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

// Program ID from the deployed Leo program
const PROGRAM_ID = 'predictionprivacyhackviii.aleo';

// Default pool ID (will be made dynamic later)
const DEFAULT_POOL_ID = '1field';

// Transaction polling config
const TX_POLL_INTERVAL = 3000; // 3 seconds
const TX_POLL_MAX_ATTEMPTS = 40; // 2 minutes max

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

export function usePrediction() {
  const {
    address,
    executeTransaction,
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
        // Wallet doesn't support status polling — treat as optimistic success
        return { confirmed: true };
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
          // Still pending — wait and retry
        } catch (e) {
          console.warn('Status poll error:', e);
        }
        await new Promise((r) => setTimeout(r, TX_POLL_INTERVAL));
      }
      // Timed out — don't treat as error, tx may still be processing
      return { confirmed: false };
    },
    [transactionStatus]
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
        const amountInMicrocredits = amount * 1_000_000;

        console.log('=== PREDICTION DEBUG ===');
        console.log('Address:', address);
        console.log('Amount (ALEO):', amount);
        console.log('Amount (microcredits):', amountInMicrocredits);

        // Build inputs matching the Leo function signature:
        //   predict(pool_id: field, option: u64, amount: u64, random_number: u64, user_credit: credits)
        //
        // We pass only the 4 non-record inputs. The wallet auto-resolves
        // the 5th input (credits record) from the user's available records.
        const inputs: string[] = [
          formattedPoolId,
          `${option}u64`,
          `${amountInMicrocredits}u64`,
          `${randomNumber}u64`,
        ];

        console.log('=== TRANSACTION ===');
        console.log('Program:', PROGRAM_ID);
        console.log('Function: predict');
        console.log('Inputs:', inputs);

        // Submit — the wallet handles record resolution and signing
        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'predict',
          inputs: inputs,
          fee: 100_000,
          privateFee: true,
        });

        const tempTxId = typeof result === 'string' ? result : result?.transactionId;
        console.log('Wallet returned temp TX ID:', tempTxId);

        if (!tempTxId) {
          throw new Error('Wallet did not return a transaction ID');
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
          status: 'success',
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
    [address, executeTransaction, pollTransactionStatus]
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
