'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

const PROGRAM_ID = 'manifoldpredictionv5.aleo';
const DISPUTE_FEE = 1_000_000; // 1 ALEO in microcredits
const TX_POLL_INTERVAL = 3000;
const TX_POLL_MAX_ATTEMPTS = 40;

export function useDispute() {
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

  const disputePool = useCallback(
    async (poolId: string, onProgress?: (msg: string) => void) => {
      const progress = onProgress || (() => {});

      if (!address || !executeTransaction) {
        setError('Wallet not connected');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const formattedId = poolId.endsWith('field') ? poolId : `${poolId}field`;
        progress('Submitting dispute transaction...');

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: 'dispute_pool',
          inputs: [formattedId],
          fee: DISPUTE_FEE,
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
          ? `Dispute submitted! TX: ${finalTxId.slice(0, 16)}...`
          : `TX submitted: ${finalTxId.slice(0, 16)}... Check explorer.`);
        setIsLoading(false);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to dispute pool';
        setError(msg);
        setIsLoading(false);
        return false;
      }
    },
    [address, executeTransaction, pollTxStatus],
  );

  return { disputePool, isLoading, error };
}
