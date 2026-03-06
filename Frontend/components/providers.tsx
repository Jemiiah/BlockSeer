'use client';

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AleoWalletProvider, useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { WalletAdapter, WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { Network } from '@provablehq/aleo-types';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { GalileoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-prove-alpha';

import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'manifoldpredictionv6.aleo';
const CREDITS_PROGRAM = 'credits.aleo';

// Must be stable references — the wallet adapter has an effect that
// disconnects whenever `programs` or `decryptPermission` change.
const PROGRAMS = [PROGRAM_ID, CREDITS_PROGRAM];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Handles wallet auto-connection with timeout protection.
 *
 * The library's built-in `autoConnect` can get permanently stuck if the wallet
 * extension doesn't respond — it sets an internal `isConnecting` ref that
 * blocks ALL future connect() calls, even manual ones from the modal.
 *
 * We disable `autoConnect` and do it ourselves with a timeout: if connect()
 * doesn't resolve within 6 seconds, we clear the stale wallet name from
 * localStorage and remount the provider via the `onReset` callback.
 */
function ConnectionManager({
  children,
  onReset,
}: {
  children: React.ReactNode;
  onReset: () => void;
}) {
  const { wallet, connected, connecting, connect } = useWallet();
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    // When a wallet is selected (from modal or localStorage) but not connected,
    // trigger connection. The library's modal only calls selectWallet(), it
    // does not call connect().
    const walletName = wallet?.adapter?.name ?? null;
    if (!walletName || connected || connecting) return;
    // Don't retry the same wallet if we already attempted it this mount
    if (attemptedRef.current === walletName) return;
    attemptedRef.current = walletName;

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      cancelled = true;
      console.warn(
        `Wallet "${walletName}" did not respond within 15s — clearing stale state`
      );
      try {
        localStorage.removeItem('walletName');
      } catch {}
      onReset();
    }, 15000);

    connect(Network.TESTNET)
      .then(() => {
        clearTimeout(timeoutId);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (!cancelled) {
          console.error('Wallet connection failed:', err);
        }
      });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [wallet, connected, connecting, connect, onReset]);

  // Reset the attempted ref when wallet changes (user picked a different one)
  useEffect(() => {
    attemptedRef.current = null;
  }, [wallet?.adapter?.name]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Changing this key remounts AleoWalletProvider, which resets its internal
  // isConnecting ref — the only way to recover from a stuck connection.
  const [providerKey, setProviderKey] = useState(0);

  const wallets = useMemo(
    () => [
      new GalileoWalletAdapter(),
      new ShieldWalletAdapter(),
      new LeoWalletAdapter(),
      new PuzzleWalletAdapter(),
    ] as WalletAdapter[],
    []
  );

  const handleReset = useCallback(() => {
    setProviderKey((k) => k + 1);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AleoWalletProvider
        key={providerKey}
        wallets={wallets}
        decryptPermission={WalletDecryptPermission.OnChainHistory}
        network={Network.TESTNET}
        programs={PROGRAMS}
      >
        <WalletModalProvider>
          <ConnectionManager onReset={handleReset}>
            {children}
          </ConnectionManager>
        </WalletModalProvider>
      </AleoWalletProvider>
    </QueryClientProvider>
  );
}
