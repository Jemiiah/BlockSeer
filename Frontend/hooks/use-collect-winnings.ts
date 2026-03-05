'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const PROGRAM_ID = 'manifoldpredictionv5.aleo';
const COLLECT_FEE = 1_500_000; // 1.5 ALEO in microcredits
const TX_POLL_INTERVAL = 3000;
const TX_POLL_MAX_ATTEMPTS = 40;

interface CollectParams {
  winningOption: number; // 1 or 2
  totalStaked: number; // microcredits
  optionAStakes: number;
  optionBStakes: number;
  predictionRecord: string; // plaintext record input
  onProgress?: (msg: string) => void;
}

export function useCollectWinnings() {
  const { address, executeTransaction, transactionStatus } = useWallet();
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

  const collectWinnings = useCallback(
    async (params: CollectParams) => {
      const { winningOption, totalStaked, optionAStakes, optionBStakes, predictionRecord, onProgress } = params;
      const progress = onProgress || (() => {});

      if (!address || !executeTransaction) {
        setError('Wallet not connected');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        progress('Submitting collect_winnings transaction...');

        const inputs = [
          `${winningOption}u64`,
          `${totalStaked}u64`,
          `${optionAStakes}u64`,
          `${optionBStakes}u64`,
          predictionRecord,
        ];

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'collect_winnings',
          inputs,
          fee: COLLECT_FEE,
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
          ? `Winnings collected! TX: ${finalTxId.slice(0, 16)}...`
          : `TX submitted: ${finalTxId.slice(0, 16)}... Check explorer.`);
        setIsLoading(false);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to collect winnings';
        setError(msg);
        setIsLoading(false);
        return false;
      }
    },
    [address, executeTransaction, pollTxStatus],
  );

  return { collectWinnings, isLoading, error };
}
