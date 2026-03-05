'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecordItem = Record<string, any>;

function parseMicrocredits(record: RecordItem): number {
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

  const plaintextStr = record.plaintext || record.recordPlaintext;
  if (typeof plaintextStr === 'string') {
    const match = plaintextStr.match(/microcredits:\s*(\d+)u64/);
    if (match) return parseInt(match[1], 10) || 0;
  }

  return 0;
}

export function useWalletBalance() {
  const { connected, requestRecords } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!connected || !requestRecords) {
      setBalance(0);
      return;
    }

    setIsLoading(true);
    try {
      const records = await requestRecords('credits.aleo', true);
      const total = (records as RecordItem[])
        .filter((r) => !r.spent)
        .reduce((sum, r) => sum + parseMicrocredits(r), 0);
      setBalance(total / 1_000_000); // Convert microcredits to ALEO
    } catch {
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [connected, requestRecords]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, isLoading, refetch: fetchBalance };
}
