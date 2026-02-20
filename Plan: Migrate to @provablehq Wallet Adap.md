Plan: Migrate to @provablehq Wallet Adapters + Shield (Galileo) Support

 Context

 We're on @demox-labs/aleo-wallet-adapter-* which does not support Shield Wallet. Provable published @provablehq/aleo-wallet-adaptor-* (v0.3.0-alpha.3) with
 GalileoWalletAdapter for Shield. This plan swaps every wallet adapter import and adapts to the new API.

 Key API Changes (old → new)

 ┌───────────────────────────────────────────────────┬───────────────────────────────────────────────────┐
 │                        Old                        │                        New                        │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ publicKey                                         │ address                                           │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ requestExecution(tx) / requestTransaction(tx)     │ executeTransaction(options: TransactionOptions)   │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ requestRecordPlaintexts(program)                  │ requestRecords(program, true)                     │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ WalletAdapterNetwork.TestnetBeta                  │ Network.TESTNET                                   │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ DecryptPermission from base                       │ WalletDecryptPermission from aleo-wallet-standard │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ <WalletProvider>                                  │ <AleoWalletProvider>                              │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ LeoWalletAdapter({ appName })                     │ LeoWalletAdapter() (no config)                    │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ Tx: { address, chainId, transitions: [...], fee } │ { program, function, inputs, fee, privateFee }    │
 ├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ CSS: @demox-labs/.../styles.css                   │ @provablehq/.../dist/styles.css                   │
 └───────────────────────────────────────────────────┴───────────────────────────────────────────────────┘

 Wallets After Migration

 - GalileoWalletAdapter (Shield) — NEW, primary target
 - LeoWalletAdapter (Leo / Shield Chrome extension)
 - PuzzleWalletAdapter
 - Fox & Soter — dropped (no @provablehq adapters yet)

 ---
 Files to Modify (7 files + package.json)

 ┌─────┬─────────────────────────────────────┬────────────────────────────────────┐
 │  #  │                File                 │              Summary               │
 ├─────┼─────────────────────────────────────┼────────────────────────────────────┤
 │ 1   │ package.json                        │ Swap deps                          │
 ├─────┼─────────────────────────────────────┼────────────────────────────────────┤
 │ 2   │ components/providers.tsx            │ Provider + adapter setup           │
 ├─────┼─────────────────────────────────────┼────────────────────────────────────┤
 │ 3   │ hooks/use-prediction.ts             │ Transaction API rewrite (heaviest) │
 ├─────┼─────────────────────────────────────┼────────────────────────────────────┤
 │ 4   │ hooks/use-user-predictions.ts       │ Record fetching API                │
 ├─────┼─────────────────────────────────────┼────────────────────────────────────┤
 │ 5   │ components/navbar.tsx               │ publicKey → address                │
 ├─────┼─────────────────────────────────────┼────────────────────────────────────┤
 │ 6   │ components/market/trading-panel.tsx │ publicKey → address                │
 ├─────┼─────────────────────────────────────┼────────────────────────────────────┤
 │ 7   │ app/page.tsx                        │ Import path only                   │
 ├─────┼─────────────────────────────────────┼────────────────────────────────────┤
 │ 8   │ app/admin/page.tsx                  │ publicKey → address                │
 └─────┴─────────────────────────────────────┴────────────────────────────────────┘

 ---
 Implementation Steps

 Step 1: Swap Dependencies

 Remove:
 - @demox-labs/aleo-wallet-adapter-base
 - @demox-labs/aleo-wallet-adapter-leo
 - @demox-labs/aleo-wallet-adapter-react
 - @demox-labs/aleo-wallet-adapter-reactui
 - aleo-adapters

 Install:
 - @provablehq/aleo-wallet-adaptor-core
 - @provablehq/aleo-wallet-adaptor-react
 - @provablehq/aleo-wallet-adaptor-react-ui
 - @provablehq/aleo-wallet-adaptor-leo
 - @provablehq/aleo-wallet-adaptor-puzzle
 - @provablehq/aleo-wallet-adaptor-prove-alpha
 - @provablehq/aleo-wallet-standard
 - @provablehq/aleo-types

 Step 2: Rewrite components/providers.tsx

 Replace all imports and provider component:

 import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
 import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
 import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
 import { Network } from '@provablehq/aleo-types';
 import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
 import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
 import { GalileoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-prove-alpha';
 import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

 const wallets = useMemo(() => [
   new GalileoWalletAdapter(),
   new LeoWalletAdapter(),
   new PuzzleWalletAdapter(),
 ], []);

 <AleoWalletProvider
   wallets={wallets}
   decryptPermission={WalletDecryptPermission.UponRequest}
   network={Network.TESTNET}
   programs={[PROGRAM_ID, CREDITS_PROGRAM]}
   autoConnect
 >

 Step 3: Rewrite hooks/use-prediction.ts (heaviest change)

 Import: useWallet from @provablehq/aleo-wallet-adaptor-react

 Destructure change:
 const { address, executeTransaction, requestRecords } = useWallet();

 Record fetching — replace dual-method loop with single call:
 const records = await requestRecords(program, true);

 Transaction shape — from transitions-based to flat TransactionOptions:
 // OLD
 const aleoTransaction = {
   address: publicKey,
   chainId: 'testnetbeta',
   transitions: [{ program: PROGRAM_ID, functionName: 'predict', inputs }],
   fee: 100_000,
   feePrivate: true,
 };
 await requestExecution(aleoTransaction);

 // NEW
 const result = await executeTransaction({
   program: PROGRAM_ID,
   function: 'predict',
   inputs: inputs,
   fee: 100_000,
   privateFee: true,
 });

 No more requestExecution/requestTransaction fallback — single executeTransaction method.

 Update isConnected and all refs from publicKey → address.

 Step 4: Update hooks/use-user-predictions.ts

 Import: @provablehq/aleo-wallet-adaptor-react

 Destructure: { connected, address, requestRecords }

 Replace:
 // OLD
 await requestRecordPlaintexts(PROGRAM_ID);
 // NEW
 await requestRecords(PROGRAM_ID, true);

 Update all publicKey → address in deps and conditions.

 Step 5: Update components/navbar.tsx

 Imports:
 import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
 import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';

 Destructure: { address, connected, connecting, disconnect } — remove publicKey, address comes from hook directly. Remove the manual const address = publicKey || ''; line.

 Step 6: Update components/market/trading-panel.tsx

 Imports:
 import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
 import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';

 Destructure: Replace publicKey with address (unused but keeping for consistency).

 Step 7: Update app/page.tsx

 Import path only:
 import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

 Only uses connected — no other changes needed.

 Step 8: Update app/admin/page.tsx

 Import: @provablehq/aleo-wallet-adaptor-react

 Destructure: { address, connected } instead of { publicKey, connected }

 Admin check: const isAdmin = connected && address === ADMIN_ADDRESS;

 ---
 Risk Notes

 - Alpha packages (v0.3.0-alpha.3): Acceptable for hackathon/testnet. API surface is well-defined.
 - Fox & Soter dropped: No @provablehq adapters yet. Low impact — Shield/Leo/Puzzle cover primary users.
 - requestRecords(program, true): Merges old requestRecords + requestRecordPlaintexts. Verify return format matches our record parsing.

 Verification

 1. npm install succeeds
 2. App starts without import errors
 3. Shield wallet appears in wallet modal
 4. Connect → address shows in navbar
 5. Market detail page → trading panel works (connect, enter amount, order summary)
 6. Submit prediction → executeTransaction fires, wallet prompts
 7. Admin page → recognizes admin by address
 8. Portfolio → predictions load via requestRecords(program, true)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌