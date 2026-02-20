'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

// Program ID from the deployed Leo program
const PROGRAM_ID = 'predictionprivacyhackviii.aleo';

// Native Aleo credits program
const CREDITS_PROGRAM_ID = 'credits.aleo';

// Default pool ID (will be made dynamic later)
const DEFAULT_POOL_ID = '1field';

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

/**
 * Try to extract microcredits balance from a record regardless of format.
 */
function extractMicrocredits(record: any): bigint | null {
  try {
    const obj = typeof record === 'string' ? JSON.parse(record) : record;
    const raw =
      obj?.microcredits ??
      obj?.data?.microcredits ??
      obj?.plaintext?.microcredits;

    if (raw == null) return null;

    const str = String(raw)
      .replace('u64.private', '')
      .replace('u64.public', '')
      .replace('u64', '')
      .trim();

    return BigInt(str);
  } catch {
    return null;
  }
}

export function usePrediction() {
  const {
    address,
    executeTransaction,
    requestRecords,
  } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

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

        // --- Step 1: Try to fetch credits records ---
        console.log('=== PREDICTION DEBUG ===');
        console.log('Address:', address);
        console.log('Amount (ALEO):', amount);
        console.log('Amount (microcredits):', amountInMicrocredits);
        console.log('requestRecords available:', !!requestRecords);
        console.log('executeTransaction available:', !!executeTransaction);

        let creditsRecord: string | undefined;

        if (requestRecords) {
          const programsToTry = [CREDITS_PROGRAM_ID, PROGRAM_ID];

          for (const program of programsToTry) {
            if (creditsRecord) break;

            try {
              console.log(`Trying requestRecords('${program}', true)...`);
              const records = await requestRecords(program, true);
              console.log(`requestRecords('${program}', true) returned ${records?.length ?? 0} records`);

              if (records && records.length > 0) {
                console.log('First record raw type:', typeof records[0]);
                console.log('First record raw value:', JSON.stringify(records[0]).slice(0, 500));

                for (const record of records) {
                  const balance = extractMicrocredits(record);
                  console.log('Record balance:', balance?.toString());
                  if (balance !== null && balance >= BigInt(amountInMicrocredits)) {
                    creditsRecord = typeof record === 'string' ? record : JSON.stringify(record);
                    console.log('Found suitable record with balance:', balance.toString());
                    break;
                  }
                }
              }
            } catch (e) {
              console.warn(`requestRecords('${program}', true) failed:`, e);
            }
          }
        }

        // --- Step 2: Build inputs ---
        const inputs: string[] = [
          formattedPoolId,
          `${option}u64`,
          `${amountInMicrocredits}u64`,
          `${randomNumber}u64`,
        ];

        if (creditsRecord) {
          inputs.push(creditsRecord);
          console.log('Including credits record in inputs');
        } else {
          console.warn('No credits record found — sending without it, wallet may auto-fill');
        }

        // --- Step 3: Build and send transaction ---
        console.log('=== TRANSACTION ===');
        console.log('Inputs:', JSON.stringify(inputs, null, 2));

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'predict',
          inputs: inputs,
          fee: 100_000,
          privateFee: true,
        });

        const txId = typeof result === 'string' ? result : result?.transactionId;
        setTransactionId(txId || null);
        setIsLoading(false);

        return {
          transactionId: txId,
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
    [address, executeTransaction, requestRecords]
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
