'use client';

import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { Network } from '@provablehq/aleo-types';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';

import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'predictionprivacyhackviii.aleo';
const CREDITS_PROGRAM = 'credits.aleo';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [
      new ShieldWalletAdapter(),
      new LeoWalletAdapter(),
      new PuzzleWalletAdapter(),
    ],
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AleoWalletProvider
        wallets={wallets}
        decryptPermission={WalletDecryptPermission.UponRequest}
        network={Network.TESTNET}
        programs={[PROGRAM_ID, CREDITS_PROGRAM]}
        autoConnect
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </AleoWalletProvider>
    </QueryClientProvider>
  );
}
