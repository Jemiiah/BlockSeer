# Changelog

All notable changes to the Manifold (BlockSeer) project are documented here.

---

## [Unreleased] - 2026-03-05

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

### Added
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
