# Changelog

All notable changes to the Manifold (BlockSeer) project are documented here.

---

## [Unreleased] - Combined Oracle Process (API + Worker) - 2026-03-09

### Changed — Oracle
- **Combined API + Worker into single process** — Created `src/index.ts` that starts both the Express API server and the background worker loop in one process. Render (or any host) now only needs one service with `npm start` instead of running `npm run api` and `npm run worker` separately
- **Refactored `api.ts` to export Express app** — `app` and `PORT` are now exported; the server only auto-listens when `api.ts` is run directly (preserving backward compatibility)
- **Added `start` script to `package.json`** — `npm start` runs the combined entry point

### Why
All 7 production markets were stuck at "pending" because the Oracle worker was never running on Render — only the API was deployed. Without the worker, no market can progress through its lifecycle (create on-chain → lock at deadline → resolve with metric data → dispute detection). This fix ensures both processes run together.

### Files Modified
`Oracle/src/index.ts` (new), `Oracle/src/api.ts`, `Oracle/package.json`

---

## [Unreleased] - Performance & Data Freshness Fixes - 2026-03-07

### Fixed — Frontend
- **Reduced API cache TTL from 60s to 15s** — Markets now refresh 4x faster; stale data window reduced from up to 2 minutes to ~15 seconds
- **Added auto-polling on market list** — Markets refetch every 20s automatically via `refetchInterval`, and refresh on window focus
- **Added auto-polling on pool detail** — On-chain pool data refetches every 20s on market detail pages
- **Cache invalidation after placing bet** — Trading panel now invalidates both `markets` and `onChainPool` React Query caches after successful prediction, so data refreshes immediately
- **Server-side cache invalidation on prediction** — Predictions API route invalidates the market proxy cache so subsequent fetches get fresh Oracle data
- **Auto-refresh portfolio predictions** — `useUserPredictions` now auto-refetches wallet records every 30s while connected, so new bets appear without manual "Sync Wallet" click
- **Fixed broken dependency in enrichment effect** — `use-aleo-pools.ts` had `[pools.length > 0 && !isLoading]` (evaluates to boolean, causing incorrect re-runs); fixed to `[pools.length, isLoading]`

### Fixed — Prediction Reporting Resilience
- **Oracle report with retry + localStorage queue** — `use-prediction.ts` now retries the Oracle POST up to 3 times with escalating delays (2s, 5s, 15s). If all retries fail, the report is saved to `localStorage` and flushed automatically on the next page load. Reports older than 24h are pruned. This ensures predictions always get reported even if the network drops momentarily
- **409 (duplicate) treated as success** — If the Oracle already has the prediction, the retry doesn't loop forever

### Fixed — Oracle
- **Prediction stakes now update immediately** — `POST /predictions` now calls `getMarketAggregateStakes()` + `updateMarketStats()` after inserting, so market volume reflects the bet on the next fetch instead of waiting for the worker sync cycle
- **Added `POST /markets/sync-stakes`** — Admin utility to manually sync aggregate stakes for all pending markets
- **Added `GET /predictions/:market_id`** — Debug endpoint to check aggregate stakes for a specific market

### Files Modified
`app/api/markets/route.ts`, `app/api/predictions/route.ts`, `lib/market-cache.ts` (new), `hooks/use-aleo-pools.ts`, `hooks/use-on-chain-pool.ts`, `hooks/use-user-predictions.ts`, `components/market/trading-panel.tsx`, `Oracle/src/api.ts`

---

## [Unreleased] - Kalshi-Inspired UI Redesign - 2026-03-07

### Changed — Frontend
- **Killed glassmorphism** — Removed all `backdrop-blur-*`, translucent `bg-white/[0.04]`/`bg-white/[0.06]` backgrounds, and `border-white/[0.06]` borders across every component. Replaced with solid dark colors for a clean, professional look
- **New solid color palette** — Page bg `#0d0f13`, card surfaces `#161820`, hover `#1c1f2a`, borders `#23262f`, text primary `#e8e9ed`, secondary `#8b8d97`, tertiary `#5a5c66`
- **Yes/No colors** — Replaced blue Yes / neutral No with Kalshi-style teal-green `#00c278` (Yes/Buy) and clean red `#ff4d4d` (No/Sell) across market cards, trading panel, portfolio outcomes, and featured market
- **Accent color** — Primary accent changed from gradient blue-violet to solid muted blue `#4b8cff` for links, active states, search focus, tab indicators
- **Removed gradient text** — Deleted `.gradient-text` CSS class; "Manifold" logo and "Prediction Markets" header now use solid white text
- **Removed background gradients** — Deleted the 3 radial gradient overlay divs from `layout.tsx`; page background is now flat `#0d0f13`
- **Removed decorative accent lines** — Removed `bg-gradient-to-r from-transparent via-blue-500/30 to-transparent` accent lines from trading panel and event detail hero
- **Reduced border radius** — Cards changed from `rounded-2xl` to `rounded-xl`; outcome buttons from `rounded-full` to `rounded-lg`; CSS `--radius` from `0.75rem` to `0.5rem`
- **Solid navbar** — Removed `backdrop-blur-xl` and translucent background; now solid `#0d0f13` with `#23262f` border
- **Solid mobile tab bar** — Removed `backdrop-blur-xl`; solid background, portfolio tab now uses `#4b8cff` instead of violet
- **Clean buttons** — Default button variant changed from gradient blue-violet to solid `#4b8cff`; trading submit buttons use solid `#00c278`/`#ff4d4d`
- **Clean badges** — All badge variants updated to solid backgrounds with new palette colors and `rounded-lg`
- **Trading panel** — Buy Yes/No buttons use solid green/red when selected; privacy notice uses solid blue; all status sections use solid backgrounds
- **Market sidebar** — Removed privacy status gradient glows; all sections use solid `#161820` backgrounds with `#23262f` borders
- **Portfolio** — Stat cards, position table, tab switcher all use solid backgrounds; outcome badges use green/red instead of blue/neutral
- **Skeleton loading** — Updated to solid colors (`#161820` / `#1c1f2a`) instead of HSL translucent values
- **Scrollbar** — Updated to solid `#0d0f13` track and `#23262f` thumb
- **Chart colors** — Price chart line uses `#00c278`/`#ff4d4d`; grid lines use `#23262f`; accent bar uses solid `#4b8cff`

### Files Modified
`globals.css`, `tailwind.config.ts`, `layout.tsx`, `navbar.tsx`, `market-card.tsx`, `featured-market.tsx`, `market-sidebar.tsx`, `trading-panel.tsx`, `event-detail.tsx`, `portfolio.tsx`, `button.tsx`, `badge.tsx`, `page.tsx`

---

## [Deployed] - v5 Stablecoin, Fees, Disputes, Claim Winnings - 2026-03-05

### Deployed
- **Testnet deployment** — `manifoldpredictionv5.aleo` deployed to Aleo testnet
- **Transaction ID:** `at1wy7utdnrlcgdruj7zcm2dvdj0aanz2xaq6k69fc6uauqvucfev9srs2nja`
- **Deployer:** `aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd`

### Added — Smart Contract (manifoldpredictionv5.aleo)
- **Stablecoin support** via `token_registry.aleo` — pools can now be denominated in USDCx, USAD, or any ARC-21 token (addresses judge feedback: "doesn't integrate stablecoin programs")
- **`credits.aleo` integration** — `predict()` uses `transfer_private_to_public` (deposits to program balance), `collect_winnings()` uses `transfer_public_to_private` (trustless self-claim from program balance)
- **Protocol fee** — 2% (200 BPS) deducted from winnings in `collect_winnings()` and `collect_winnings_token()`
- **Dispute mechanism** — `dispute_pool()` transition allows any user to dispute a resolved pool within 2880 blocks (~24h). Status flow: resolved(2) → disputed(3). `cancel_pool()` admin transition cancels disputed pools (status 3→4)
- **User self-claim** — `collect_winnings()` lets winners claim directly from program's public balance without admin involvement. Verifies: correct winning option, dispute window passed, not double-claimed
- **Token predictions** — `predict_with_token()` accepts `token_registry.aleo/Token` records for stablecoin-denominated pools
- **Token claims** — `collect_winnings_token()` for token-denominated pool payouts (admin relay)
- **Refunds** — `refund_prediction()` self-refund from cancelled pools (ALEO), `refund_pred_token()` for token refunds
- **New mappings** — `claims` (double-claim prevention), `dispute_count`, `pool_balance` (accounting)
- **Pool struct** gains `token_id: field` and `resolved_at: u64`
- **Prediction record** gains `token_id: field`
- 12 transitions total (was 7 in v4)

### Added — Oracle Backend
- `POST /markets/:id/cancel` — admin cancels disputed markets on-chain
- `GET /markets/disputed` — list disputed markets
- Dispute detection phase in worker — scans on-chain pool status for `3u8` (disputed), syncs to DB
- `token_id` parameter in `POST /markets` and market creation flow
- `dispute_window_end`, `winning_option`, `cancelled` fields in market API responses
- DB schema migrations: `token_id`, `dispute_window_end`, `winning_option`, `cancelled` columns

### Added — Frontend
- **Claim Winnings UI** — trading panel shows claim button when market resolved + dispute window passed + user has winning predictions. Calculates payout with 2% fee breakdown
- **Dispute UI** — dispute button with countdown timer shown during dispute window after resolution
- **Refund UI** — refund button for cancelled market predictions
- **Token denomination** — pools display their currency (ALEO/USDCx/USAD) throughout: market cards, featured carousel, trading panel, event detail, portfolio
- **Fee disclosure** — "2% protocol fee on winnings" shown in order summary and event detail stats
- **4 new hooks** — `use-collect-winnings`, `use-dispute`, `use-refund`, `use-predict-token`
- **Claims API route** — `app/api/claims/route.ts` proxies to Oracle for token claims
- **Token config** — `lib/tokens.ts` maps token_id → { symbol, name, decimals }
- Market cards show disputed/cancelled status badges
- Portfolio shows token symbols per position, claimable/refundable indicators

### Changed
- Program ID → `manifoldpredictionv5.aleo` across all hooks, components, and providers
- `program.json` — added `token_registry.aleo` dependency
- P&L calculation now accounts for 2% protocol fee on winnings
- Volume display uses pool's token denomination instead of hardcoded "ALEO"
- `Market` type gains: `tokenId`, `tokenSymbol`, `winningOption`, `disputeWindowEnd`, `isInDisputeWindow`, `isCancelled`, `isClaimable`
- `UserPrediction` gains: `tokenId`, `tokenSymbol`, `isCancelled`, `isClaimable`

---

## [Unreleased] - 2026-03-05

### Added
- **Real portfolio P&L** — Portfolio now shows actual profit/loss for each prediction by cross-referencing wallet records with Oracle API markets and on-chain pool data (`winning_option`, stake totals). Formula matches the smart contract's `calculate_winnings`: `winnings = (amount * total_staked) / winning_option_stakes`
- **Market titles in portfolio** — Predictions display human-readable market titles from the Oracle API instead of truncated pool IDs ("Pool 12345...")
- **Portfolio stats** — Stats cards (Net P&L, Biggest Win, Volume Traded) now compute from real enriched data instead of showing zeros
- **Privacy notice in trading panel** — Added blue gradient notice before the Place Bet button explaining that predictions are encrypted in wallet records, only commitment hashes go on-chain, and pool totals stay hidden until reveal window (prevents front-running)

### Changed
- **Redesigned trading panel** — Replaced small outcome cards with large, prominent "Buy Yes"/"Buy No" buttons inspired by Kalshi/Polymarket. Prices now display directly on buttons (e.g. "52¢"). Selected button shows checkmark indicator. Main action button changes color based on selected outcome (blue for Yes, red for No) and shows amount in label

### Security
- **Removed sensitive plaintext record logging** — `use-prediction.ts` was logging raw wallet records (microcredits, addresses) via `console.log`; replaced with safe `console.debug` that only logs non-sensitive metadata
- **Admin address externalized** — Hardcoded admin address in `navbar.tsx`, `trading-panel.tsx`, and `admin/page.tsx` now reads from `NEXT_PUBLIC_ADMIN_ADDRESS` env var (falls back to current address)

### Fixed
- **Oracle type safety** — Replaced 39 `any` types across `db.ts`, `api.ts`, `worker.ts`, and `config.ts` with proper `MarketRow`, `AggregateStakes`, and `DbPoolConfig` interfaces (new `Oracle/src/types.ts`)
- **API input validation** — `POST /markets` now validates title length (1-200 chars), deadline bounds (must be future, max 1 year), and threshold is numeric
- **React error boundary** — Added `ErrorBoundary` component wrapping the app layout to prevent white-screen crashes; shows retry button on error

### Removed
- **Dead wagmi hook** — Deleted `use-wallet.ts` (wagmi/EVM) which was unused; entire app uses `@provablehq/aleo-wallet-adaptor-react`
- **Excessive console.log** — Removed 30+ verbose debug logs from `aleo-client.ts` (blockchain fetch URLs, parsed pool data dumps, prediction counts) and cleaned up `use-prediction.ts` logging
- **Fake activity feed** — Removed mock `0x7a3...` Ethereum-style addresses from market detail pages; removed Activity tab entirely
- **Placeholder USD pricing** — Removed hardcoded `aleoPrice = 1.5` from portfolio; all values now display in native ALEO
- **Dead mock data** — `lib/data.ts` (9 fake markets, fake activities, fabricated platform stats) is no longer imported anywhere

### Added
- **Live wallet balance** — Navbar "Balance" chip reads actual ALEO balance from wallet via `requestRecords('credits.aleo')`
- **Vertical sidebar with categories, sort & privacy status** replacing horizontal filter bar
  - Categories section with count badges (All Markets, Crypto, DeFi, Tech, AI) — purple accent for active
  - Sort By section (Highest Volume, Ending Soon, Newest, Needs Resolution) — teal accent for active
  - Privacy Status section with purple glow border showing ZK proofs, encryption, MEV protection status
  - Mobile drawer: floating filter button opens slide-in sidebar overlay on screens < 1024px
- `MarketSort` type and `sortMarkets()` utility for flexible market ordering
- `volumeRaw` and `endTimestamp` fields on `Market` interface for sort support
- JetBrains Mono font via `next/font/google` with `--font-mono` CSS variable
- `slide-in` animation keyframe and `font-mono` Tailwind utility

### Changed
- Page layout restructured to sidebar + content flex layout with `max-w-[1400px]`
- Market grid reduced to `lg:grid-cols-2 xl:grid-cols-3` to accommodate sidebar
- Removed category sections / upcoming / resolved groupings in favor of unified sorted grid
- "Blind Betting Active" renamed to "Sealed Predictions" across featured market, market cards, and trading panel
- Portfolio values display in ALEO instead of fake USD conversion
- Market detail social proof bar shows "Total Predictions" (on-chain count) instead of fake "Recent Trades"

---

## [Unreleased] - 2026-03-04

### Added
- **Trustless On-Chain Commit-Reveal** — Replaced admin-controlled stake reveal with user-driven on-chain commit-reveal. Each user reveals their own prediction after the pool locks, eliminating Oracle trust for stake aggregation.
  - New `reveal_prediction()` user-callable transition — consumes a Prediction record to prove authenticity, accumulates stakes on-chain trustlessly
  - Reveal check in `collect_winnings()` — unrevealed predictions cannot claim winnings (`commitments[id] must == 0field`)
  - `reveal_window_end` column on markets table — tracks when users' reveal window expires
  - `setRevealWindowEnd()` / `getMarketsReadyForResolution()` DB functions for reveal window timing
  - New `use-reveal-prediction` React hook — fetches user's Prediction records, submits `reveal_prediction` transactions
  - Reveal Window UI in trading panel — countdown timer, reveal buttons for each prediction, transaction status
  - Reveal Window badges in market cards and featured market carousel (violet theme)
  - Three-state UI: Blind Betting → Reveal Window → Odds Revealed

### Changed
- Renamed program from `manifoldpredictionv3.aleo` to `manifoldpredictionv4.aleo`
- **Removed** `reveal_pool_stakes()` admin-only transition (centralized trust)
- **Removed** `revealPoolStakes()` from Oracle worker (no admin reveal step)
- **Removed** `REVEAL_POOL_FEE` config, `markStakesRevealed()`, `getLockedUnrevealedMarkets()`, `getLockedRevealedMarkets()` (all admin-reveal artifacts)
- Worker flow changed from `sync → create → lock → reveal → resolve` to `sync → create → lock (+ set reveal window) → resolve (after window ends)`
- `markets` table: replaced `stakes_revealed BOOLEAN` with `reveal_window_end BIGINT`
- Market conversion (`apiMarketToMarket`) now derives `oddsRevealed` and `isInRevealWindow` from `reveal_window_end` timestamp
- `Market` type gains `isInRevealWindow` and `revealWindowEnd` fields
- On-chain sync guard updated to use reveal window timing instead of `stakes_revealed` flag
- All PROGRAM_ID references updated to `manifoldpredictionv4.aleo` across frontend

### Documentation
- Updated `docs/PRIVACY_MODEL.md` — replaced admin-reveal architecture with trustless commit-reveal, added comparison table, updated pool lifecycle and security considerations

### Previous (v3): Blind Betting Foundation
- `commitments` mapping on-chain to prevent double-betting
- Oracle `predictions` table for off-chain prediction tracking
- `POST /predictions` API endpoint for frontend reporting
- Frontend shows "Blind Betting Active", hidden odds, and lock icons during betting phase
- `finalize_predict()` does not publish `amount`, `option`, or stake totals on-chain

---

## [1.0.0] - 2026-03-03

### Fixed
- **Transaction execution broken** - Transactions were showing "submitted" but never hitting the chain. Root causes:
  - Missing 5th input (`credits.aleo/credits` record) for the `predict` function — Aleo records are UTXOs that must be explicitly passed as inputs in the exact order the Leo function expects. Now fetched via `requestRecords('credits.aleo')`, validated for sufficient balance, and attached as the 5th input
  - `recordIndices: [4]` now passed in `TransactionOptions` to tell the wallet which input positions contain records
  - Fee too low (`0.1 ALEO`) for cross-program ZK proof execution; increased to `1.5 ALEO` (the `predict` function calls `credits.aleo/transfer_private` which requires expensive proof generation)
  - `privateFee: true` required two separate private records (one for stake, one for fee); switched to `privateFee: false` (public fee) so users only need one private record
  - Added proper record parsing that handles different wallet return formats (Leo, Puzzle, Shield, Galileo)
  - Added clear error message when user has insufficient private credits balance

### Improved
- **Market loading speed** - Markets now appear instantly from the API, with on-chain data (stakes, trader counts) enriched in the background instead of blocking the initial render
- **Loading UX** - Replaced the generic spinner with skeleton placeholder cards that match the real card layout

### Changed
- `Frontend/hooks/use-prediction.ts` - Complete rewrite of transaction submission with proper Aleo record handling per official documentation
- `Frontend/hooks/use-aleo-pools.ts` - Split into two-phase loading (API-first, then on-chain enrichment)
- `Frontend/components/market/market-card.tsx` - Added `MarketCardSkeleton` component
- `Frontend/app/page.tsx` - Uses skeleton cards during loading state

---

## [0.9.0] - 2026-02-20

### Fixed
- Failed buy transactions (`fix fail buys`)
- CLI failures for market operations

### Changed
- Upgraded frontend components and styling
- Updated project name references to BlockSeer
- Reworked codebase structure

---

## [0.8.0] - 2026-02-04

### Fixed
- API startup errors caused by incorrect CORS preflight handling
- Testing and stability improvements

### Added
- CORS configuration for backend API

---

## [0.7.0] - 2026-02-02

### Added
- Dev mode toggle for switching between local and production API URLs
- Real API data integration replacing dummy/mock markets
- CORS configuration and improved blockchain sync
- Blockchain sync for automatic market creation on-chain
- Admin panel with oracle metrics dashboard

### Fixed
- Winnings calculation in the Leo smart contract
- Slow loading of API calls with caching and retry logic

---

## [0.6.0] - 2026-01-30

### Added
- Batch market loader with CSV template support
- `fear_greed` and `stablecoin_peg` oracle metric types
- New metrics registry and CLI updates
- PostgreSQL database integration for market storage
- Oracle component with worker logic, metrics, and configuration
- `collect_winnings` function in the prediction contract
- `test_network.ts` for network testing
- Frontend README documentation

### Changed
- Converted Oracle project from Python to TypeScript
- Centralized configuration variables
- Restructured project directory layout
- Renamed product from BlockSeer to Manifold in various places
- Improved `collect_winnings` logic with proper reward calculation
- Updated stake details and pool tracking

### Fixed
- Market creation CLI options
- PostgreSQL security configuration
- Program source path in `config.ts`
- TypeScript conversion issues and `package.json` updates

---

## [0.5.0] - 2026-01-29

### Added
- Prediction smart contract (`manifoldpredictionv2.aleo`) with:
  - Pool creation, locking, and resolution
  - User predictions with ZK-private credit transfers
  - Winnings calculation and collection
  - Admin-controlled pool management
- Credits integration via `credits.aleo/transfer_private`
- Oracle core logic and database (`oracle.db`)
- Oracle metrics component for the frontend
- Market event detail page
- Improved frontend UI with modern design

### Changed
- Rebranded project to BlockSeer with updated market UI
- Removed old contract files in favor of new Leo program
- SSR configuration fixes

---

## [0.1.0] - 2026-01-29

### Added
- Initial project setup
- Frontend scaffold with Next.js
- Basic project README
