# Changelog

All notable changes to the Manifold (BlockSeer) project are documented here.

---

## [Unreleased] - 2026-03-03

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
