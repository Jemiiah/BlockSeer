# Manifold

Privacy-first prediction markets on Aleo, powered by zero-knowledge proofs.

## Architecture

```
Manifold/
├── Frontend/       # Next.js 14 web app
├── Oracle/         # Off-chain oracle for market resolution
└── prediction/     # Leo smart contract (deployed on Aleo testnet)
```

## Smart Contract

**Program ID:** `predictionprivacyhackviii.aleo`

A pari-mutuel prediction market where users stake ALEO credits on binary outcomes. Predictions are private records; pool state is public.

Key functions:
- `create_pool` — Admin creates a market with title, options, and deadline
- `predict` — Users stake on option A or B (private record)
- `lock_pool` / `resolve_pool` — Admin closes and resolves markets
- `collect_winnings` — Winners claim proportional payouts

See [`prediction/readme.md`](prediction/readme.md) for full contract documentation.

## Frontend

Next.js 14 app with Aleo wallet integration via `@provablehq/aleo-wallet-adaptor-*`.

**Supported Wallets:**
- Shield (Galileo) — via `ShieldWalletAdapter`
- Leo Wallet — via `LeoWalletAdapter`
- Puzzle Wallet — via `PuzzleWalletAdapter`

**Key Features:**
- Market grid with filtering and search
- On-chain pool data with pari-mutuel odds
- Trading panel with `executeTransaction` for predictions
- Portfolio view with private record fetching
- Admin panel for market creation (wallet-gated)
- Responsive dark theme

See [`Frontend/README.md`](Frontend/README.md) for setup instructions.

## Oracle

Off-chain service that fetches real-world data (ETH price, BTC dominance, gas prices, etc.) and provides resolution data for prediction markets.

## Getting Started

```bash
# Frontend
cd Frontend
npm install
npm run dev

# Oracle
cd Oracle
npm install
npm start
```

## Tech Stack

- **Smart Contract:** Leo (Aleo)
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Wallet:** @provablehq/aleo-wallet-adaptor-* (v0.3.0-alpha)
- **State:** React Query
- **Network:** Aleo Testnet
