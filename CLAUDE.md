w# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlockSeer (Manifold) is a privacy-first prediction market on the Aleo blockchain. Users stake ALEO credits or ARC-21 tokens (USDCx, USAD) on binary (Yes/No) outcomes. The system uses trustless on-chain commit-reveal with zero-knowledge proofs, a 2% protocol fee on winnings, dispute mechanism, and user self-claim.

**Program ID:** `manifoldpredictionv5.aleo` (Aleo testnet)
**Dependencies:** `credits.aleo`, `token_registry.aleo`

## Architecture

Three independent components that communicate via REST API and on-chain state:

```
Frontend/   → Next.js 14 App Router, Aleo wallet integration
Oracle/     → Express API + background worker, PostgreSQL, market lifecycle management
prediction/ → Leo smart contract (ZK prediction market logic)
```

**Flow:** Oracle creates markets in DB → Worker deploys pools on-chain → Users predict via Frontend (ALEO or token) → Pool locks at deadline → Users reveal stakes on-chain → Oracle resolves with metric data → Dispute window (24h) → Winners self-claim payouts (2% fee deducted). Disputed pools can be cancelled by admin → users refund.

## Commands

### Frontend
```bash
cd Frontend
npm run dev       # Dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

### Oracle
```bash
cd Oracle
npm run api       # REST API server
npm run worker    # Background sync/create/lock/resolve loop
npm run cli -- create-market "ETH-3500" 3500 1738320000 --metric eth_price
npm run load-markets  # Batch load from markets.json
```

### Smart Contract
```bash
cd prediction
leo build
leo deploy
```

## Key Architectural Decisions

### Wallet Integration
All wallet interaction uses `@provablehq/aleo-wallet-adaptor-react` (v0.3.0-alpha). The `useWallet()` hook provides `executeTransaction`, `requestRecords`, `transactionStatus`. Supports Leo, Puzzle, Shield, and Prove Alpha wallets — each returns records in different formats, so parsing must handle all variants (see `use-prediction.ts`).

### Transaction Execution Pattern
Aleo records are UTXOs. When calling `predict()`, you must pass a `credits.aleo/credits` record as the 5th input with `recordIndices: [4]`. Use `privateFee: false` (public fee) so users only need one private record. Fee is 1.5 ALEO due to cross-program ZK proof generation. For token pools, `predict_with_token()` accepts a `token_registry.aleo/Token` record instead.

### Smart Contract Transitions (12 total)
`create_pool`, `lock_pool`, `resolve_pool`, `cancel_pool`, `predict`, `predict_with_token`, `reveal_prediction`, `collect_winnings`, `collect_winnings_token`, `dispute_pool`, `refund_prediction`, `refund_pred_token`. Key Leo patterns: all external async transitions return Futures that must be `.await()`ed in finalize functions. Identifier names must be ≤31 bytes.

### Microcredits
Smart contract works in microcredits (1 ALEO = 1,000,000 microcredits). Frontend converts at boundaries. All on-chain amounts are u64 microcredits.

### Two-Phase Market Loading
`use-aleo-pools.ts` loads markets from Oracle API first (instant), then enriches with on-chain data (stakes, trader counts) in the background. This prevents slow blockchain reads from blocking initial render.

### Commit-Reveal Privacy
- **Commit phase:** `predict()` creates a private Prediction record; stakes hidden from public state
- **Reveal phase:** After pool locks, users call `reveal_prediction()` with their record to accumulate stakes on-chain
- **Resolution:** Oracle resolves after reveal window (1 hour). Unrevealed predictions cannot claim winnings (`commitments[id] must == 0field`)

### Oracle Worker Lifecycle
`sync → create → lock (+ set reveal window) → resolve (after window ends) → detect disputes`. The worker runs continuously, polling for state changes. After resolution, it sets `winning_option` and `dispute_window_end` in the DB.

### Frontend API Proxy
`Frontend/app/api/markets/route.ts`, `predictions/route.ts`, and `claims/route.ts` proxy to the Oracle API to avoid CORS issues. The Oracle API URL is toggled via `NEXT_PUBLIC_DEV_MODE`.

### Token Denomination
Pools have a `token_id` field: `'0'` = native ALEO credits, otherwise an ARC-21 token_id. `lib/tokens.ts` maps token_id → { symbol, name, decimals }. All amount displays use `formatTokenAmount()` to convert from raw on-chain values.

## Important Patterns

### Path Aliases
Frontend uses `@/*` mapped to `Frontend/*` in tsconfig. Import as `@/components/...`, `@/hooks/...`, `@/lib/...`, `@/types/...`.

### Design System
Dark glassmorphic UI: `bg-[hsl(230,15%,8%)]` cards, `border-white/[0.06]` borders, `rounded-2xl`. Accent colors: blue (primary), emerald (success/sort), violet (reveal window), red (errors). Fonts: Inter (body) + JetBrains Mono (`font-mono`, numeric values).

### Admin Gating
Admin address set via `NEXT_PUBLIC_ADMIN_ADDRESS` env var. Admin panel (`/admin`) and navbar admin link check `address === ADMIN_ADDRESS`.

### Market Categories
`lib/category-map.ts` maps market IDs to categories (Crypto, DeFi, Tech, AI). Category counts are computed client-side from the pool list.

## File Map for Common Tasks

| Task | Key Files |
|------|-----------|
| Place prediction (ALEO) | `hooks/use-prediction.ts`, `components/market/trading-panel.tsx` |
| Place prediction (token) | `hooks/use-predict-token.ts`, `components/market/trading-panel.tsx` |
| Reveal prediction | `hooks/use-reveal-prediction.ts`, `components/market/trading-panel.tsx` |
| Claim winnings | `hooks/use-collect-winnings.ts`, `components/market/trading-panel.tsx` |
| Dispute pool | `hooks/use-dispute.ts`, `components/market/trading-panel.tsx` |
| Refund (cancelled) | `hooks/use-refund.ts`, `components/market/trading-panel.tsx` |
| Wallet balance | `hooks/use-wallet-balance.ts` |
| User's predictions | `hooks/use-user-predictions.ts`, `components/portfolio.tsx` |
| Market list + filtering | `hooks/use-markets.ts`, `hooks/use-aleo-pools.ts`, `lib/api-client.ts` |
| On-chain pool data | `lib/aleo-client.ts` |
| Token config | `lib/tokens.ts` |
| Market sidebar | `components/market/market-sidebar.tsx` |
| Wallet connection | `components/providers.tsx` (ConnectionManager + AleoWalletProvider) |
| Oracle REST API | `Oracle/src/api.ts` |
| Oracle worker | `Oracle/src/worker.ts` |
| DB queries | `Oracle/src/db.ts` |
| Smart contract | `prediction/src/main.leo` |
| Oracle config/fees | `Oracle/src/config.ts` |

## Environment Variables

### Frontend
- `NEXT_PUBLIC_DEV_MODE` — `true` uses localhost Oracle, `false` uses production URL
- `NEXT_PUBLIC_ADMIN_ADDRESS` — Aleo address for admin panel access

### Oracle (.env)
- `ORACLE_PRIVATE_KEY` — Aleo private key for on-chain transactions
- `ALEO_NODE_URL` — Aleo testnet node (e.g., `https://api.explorer.aleo.org/v1`)
- `DATABASE_URL` or `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE/PGSSL` — PostgreSQL
- `ETHERSCAN_API_KEY` — For gas price metrics

## Changelog
Always update `CHANGELOG.md` as part of any implementation work, not as a separate step.
