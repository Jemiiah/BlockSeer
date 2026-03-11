# BlockSeer (Manifold)

**Privacy-first prediction markets on Aleo, powered by zero-knowledge proofs.**

BlockSeer is the first prediction market where odds are hidden during the betting phase. Users stake ALEO credits or ARC-21 stablecoins (USDCx, USAD) on binary Yes/No outcomes with complete privacy — bet amounts, chosen options, and bettor identities remain sealed until a trustless on-chain reveal. This eliminates front-running, copy-trading, and whale manipulation that plague transparent prediction markets.

**Program ID:** `manifoldpredictionv6.aleo` (Aleo Testnet)

---

## Why BlockSeer?

Traditional prediction markets (Polymarket, Kalshi) expose all bets in real-time. This creates:

- **Front-running** — bots copy large bets before they move the odds
- **Whale manipulation** — large visible bets scare retail participants away
- **Information asymmetry** — early bettors see how the market is leaning and game their timing

BlockSeer solves this with **blind betting** powered by Aleo's zero-knowledge proof system. During the betting phase, the blockchain proves your prediction is valid without revealing what it is. After the deadline, users reveal their own predictions on-chain — no trusted third party needed.

---

## Architecture

Three independent components that communicate via REST API and on-chain state:

```
BlockSeer/
├── Frontend/       → Next.js 14 App Router, Aleo wallet integration
├── Oracle/         → Express API + background worker, PostgreSQL
└── prediction/     → Leo smart contract (ZK prediction market logic)
```

```
┌─────────────┐     REST API      ┌──────────────┐     On-chain TX      ┌─────────────────┐
│  Frontend   │ ◄──────────────► │    Oracle     │ ──────────────────► │  Aleo Blockchain │
│  (Next.js)  │                  │  (Express +   │                     │  manifoldpredic- │
│             │ ─── Wallet TX ──────────────────────────────────────► │  tionv6.aleo     │
│             │                  │   Worker)     │ ◄─── Read state ── │                  │
└─────────────┘                  └──────────────┘                     └─────────────────┘
```

**Data Flow:**
1. Oracle creates markets in PostgreSQL
2. Worker deploys pools on-chain via `create_pool()`
3. Users predict via Frontend wallet (ALEO or stablecoin) — private Prediction records
4. Pool locks at deadline, reveal window opens (1 hour)
5. Users reveal their own predictions on-chain (trustless)
6. Oracle resolves with real-world metric data
7. 24-hour dispute window
8. Winners self-claim payouts (2% protocol fee deducted)

---

## Smart Contract

**12 transitions** handling the full market lifecycle:

| Transition | Who | Description |
|-----------|-----|-------------|
| `create_pool` | Admin | Create a market with title, options, deadline, and token denomination |
| `lock_pool` | Admin | Lock betting at deadline |
| `resolve_pool` | Admin | Set the winning option after reveal window |
| `cancel_pool` | Admin | Cancel a disputed pool (enables refunds) |
| `predict` | User | Stake ALEO credits on Yes or No (private record) |
| `predict_with_token` | User | Stake ARC-21 tokens (USDCx, USAD) on Yes or No |
| `reveal_prediction` | User | Trustlessly reveal your own prediction after lock |
| `collect_winnings` | User | Self-claim ALEO winnings from program balance |
| `collect_winnings_token` | Admin | Relay token winnings to winner |
| `dispute_pool` | User | Dispute a resolved pool within 24h (~2880 blocks) |
| `refund_prediction` | User | Self-refund ALEO from cancelled pools |
| `refund_pred_token` | Admin | Relay token refund from cancelled pools |

### Key On-Chain Mechanics

- **Pari-mutuel payouts:** `winnings = (your_stake * total_pool) / winning_side_total`
- **Protocol fee:** 2% (200 BPS) deducted from winnings
- **Commit-reveal privacy:** `predict()` stores a commitment hash; `reveal_prediction()` accumulates stakes after lock
- **Double-bet prevention:** `commitments` mapping blocks duplicate prediction IDs
- **Double-claim prevention:** `claims` mapping blocks duplicate claims
- **Dispute window:** 2880 blocks (~24 hours at 30s/block) after resolution

### Dependencies

- `credits.aleo` — native ALEO credit transfers (deposit via `transfer_private_to_public`, withdraw via `transfer_public_to_private`)
- `token_registry.aleo` — ARC-21 stablecoin support (USDCx, USAD)

---

## Privacy Model: Trustless Blind Betting

BlockSeer's core innovation is a **trustless commit-reveal** system where no party — not even the Oracle — can see or manipulate bets during the betting phase.

### Pool Lifecycle

```
  BLIND BETTING              REVEAL WINDOW (1hr)         RESOLUTION
 ┌─────────────┐            ┌──────────────────┐       ┌───────────┐
 │ Users call   │  deadline  │ Users call        │ ends  │ Oracle    │
 │ predict()    │ ─────────► │ reveal_prediction │ ────► │ resolves  │
 │              │            │ ()                │       │ pool      │
 │ Stakes are   │  lock_pool │ Stakes accumulate │       │           │
 │ HIDDEN       │            │ on-chain          │       │ 24h       │
 │              │            │ trustlessly       │       │ dispute   │
 │ Only commit  │            │                   │       │ window    │
 │ hash on-chain│            │ Odds become       │       │           │
 └─────────────┘            │ visible           │       │ Winners   │
                            └──────────────────┘       │ self-claim│
                                                       └───────────┘
```

### What's Private

- Bet amounts during blind betting phase
- Chosen option (Yes/No) during blind betting
- Bettor identity linked to specific predictions
- Pool odds/totals until reveal window completes

### What's Public

- That a `predict()` transaction occurred (existence, not content)
- Total prediction count per pool
- Revealed stakes after reveal window (intentional)
- Pool resolution outcome

### Trust Model

| Component | Trust Required |
|-----------|---------------|
| Stake aggregation | **None** — users reveal their own records on-chain |
| Pool creation/locking | Oracle (admin-controlled) |
| Resolution (winning option) | Oracle — mitigated by 24h dispute window |
| Prediction records | **None** — cryptographically owned by user's Aleo address |

See [`docs/PRIVACY_MODEL.md`](docs/PRIVACY_MODEL.md) for the full technical deep-dive.

---

## Frontend

Next.js 14 App Router with a Kalshi-inspired dark UI theme.

### Supported Wallets

- **Leo Wallet** — `LeoWalletAdapter`
- **Puzzle Wallet** — `PuzzleWalletAdapter`
- **Shield (Galileo)** — `ShieldWalletAdapter`
- **Prove Alpha** — `ProveAlphaWalletAdapter`

All via `@provablehq/aleo-wallet-adaptor-react` (v0.3.0-alpha).

### Features

- **Market grid** with category filtering (Crypto, DeFi, Tech, AI), sorting (volume, ending soon, newest), and search
- **Sealed predictions** — odds hidden during blind betting, visible after reveal
- **Buy Yes / Buy No** buttons with live implied probability pricing
- **Reveal window UI** — countdown timer, per-prediction reveal buttons
- **Claim winnings** — self-claim with 2% fee breakdown
- **Dispute** — dispute button with countdown during 24h window
- **Refunds** — one-click refund for cancelled market predictions
- **Portfolio** — real P&L, position tracking, claimable/refundable indicators
- **Multi-currency** — displays ALEO, USDCx, or USAD per pool denomination
- **Live wallet balance** in navbar
- **Admin panel** (wallet-gated) for market creation
- **Two-phase loading** — markets render instantly from API, enriched with on-chain data in the background
- **Auto-polling** — markets refresh every 20s, portfolio every 30s
- **Error boundary** — prevents white-screen crashes

### Design System

Solid dark theme (no glassmorphism):
- Background: `#0d0f13`, Cards: `#161820`, Borders: `#23262f`
- Yes/Buy: `#00c278` (teal-green), No/Sell: `#ff4d4d` (red)
- Accent: `#4b8cff` (muted blue)
- Fonts: Inter (body) + JetBrains Mono (numeric values)

---

## Oracle

Combined Express API server + background worker in a single process. Manages market lifecycle, fetches real-world metric data for resolution, and syncs on-chain state.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/markets` | List all markets |
| `GET` | `/markets/:id` | Get market details |
| `GET` | `/markets/disputed` | List disputed markets |
| `POST` | `/markets` | Create a new market (admin) |
| `POST` | `/markets/:id/cancel` | Cancel a disputed market (admin) |
| `POST` | `/markets/sync-stakes` | Manually sync aggregate stakes (admin) |
| `POST` | `/predictions` | Report a prediction from frontend |
| `GET` | `/predictions/:market_id` | Debug: check aggregate stakes |

### Worker Loop

Runs continuously alongside the API:

```
sync → create on-chain → lock at deadline (+set reveal window) → resolve (after reveal window ends) → detect disputes
```

### Supported Metrics

ETH price, BTC dominance, gas prices, stablecoin pegs, fear & greed index — extensible via metric registry.

### Database

PostgreSQL with tables for markets, predictions, and aggregate stakes. Key columns: `token_id`, `reveal_window_end`, `winning_option`, `dispute_window_end`, `cancelled`.

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- [Leo](https://developer.aleo.org/leo/) (for smart contract development)
- An Aleo wallet (Leo, Puzzle, Shield, or Prove Alpha)

### Frontend

```bash
cd Frontend
npm install
npm run dev       # Dev server at localhost:3000
```

Environment variables:
- `NEXT_PUBLIC_DEV_MODE` — `true` for localhost Oracle, `false` for production
- `NEXT_PUBLIC_ADMIN_ADDRESS` — Aleo address that can access admin panel

### Oracle

```bash
cd Oracle
npm install
npm start         # Combined API + Worker (single process)
```

Or run separately:
```bash
npm run api       # API only (port 3001)
npm run worker    # Worker only
```

Environment variables (`.env`):
- `ORACLE_PRIVATE_KEY` — Aleo private key for on-chain transactions
- `ALEO_NODE_URL` — Aleo testnet node URL
- `DATABASE_URL` or `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE/PGSSL` — PostgreSQL connection
- `ETHERSCAN_API_KEY` — For gas price metrics

### CLI Tools

```bash
cd Oracle
npm run cli -- create-market "ETH > 3500" 3500 1738320000 --metric eth_price
npm run load-markets      # Batch load from markets.json
npm run load-markets-db   # Load to DB only (no on-chain deployment)
```

### Smart Contract

```bash
cd prediction
leo build
leo deploy        # Deploy to Aleo testnet
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | [Leo](https://developer.aleo.org/leo/) (Aleo ZK language) |
| Blockchain | Aleo Testnet |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| State Management | React Query (TanStack) |
| Wallet | @provablehq/aleo-wallet-adaptor (v0.3.0-alpha) |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL |
| Deployment | Aleo SDK (@provablehq/sdk) |

---

## Project Structure

```
BlockSeer/
├── Frontend/
│   ├── app/                  # Next.js App Router pages
│   │   ├── admin/            # Admin panel (wallet-gated)
│   │   ├── market/[id]/      # Market detail page
│   │   └── api/              # API proxy routes (markets, predictions, claims)
│   ├── components/
│   │   ├── market/           # MarketCard, TradingPanel, MarketSidebar, EventDetail
│   │   ├── ui/               # Button, Badge, skeleton components
│   │   └── portfolio.tsx     # Portfolio view with P&L
│   ├── hooks/                # All Aleo transaction hooks
│   │   ├── use-prediction.ts         # Place ALEO bet
│   │   ├── use-predict-token.ts      # Place token bet
│   │   ├── use-reveal-prediction.ts  # Reveal during window
│   │   ├── use-collect-winnings.ts   # Claim payouts
│   │   ├── use-dispute.ts            # Dispute resolution
│   │   └── use-refund.ts             # Refund cancelled
│   ├── lib/
│   │   ├── aleo-client.ts    # On-chain data reader
│   │   ├── api-client.ts     # Oracle API client
│   │   └── tokens.ts         # Token ID → symbol mapping
│   └── types/                # TypeScript interfaces
├── Oracle/
│   └── src/
│       ├── index.ts          # Combined API + Worker entry point
│       ├── api.ts            # Express REST API
│       ├── worker.ts         # Background sync/create/lock/resolve loop
│       ├── db.ts             # PostgreSQL queries
│       ├── config.ts         # Fees, timing, node URLs
│       ├── cli.ts            # Market management CLI
│       └── types.ts          # Shared TypeScript types
├── prediction/
│   └── src/
│       └── main.leo          # Smart contract (12 transitions)
├── docs/
│   └── PRIVACY_MODEL.md     # Full privacy architecture documentation
└── CHANGELOG.md              # Detailed development history
```

---

## Security

- **Zero-knowledge proofs** — Aleo's ZK system ensures prediction validity without revealing content
- **No admin access to funds** — ALEO stakes go to the program's public balance, not an admin wallet. Winners self-claim via `transfer_public_to_private`
- **Commit-reveal** prevents front-running, copy-trading, and oracle manipulation of bets
- **Dispute mechanism** — 24-hour window for any user to dispute a resolution before claims are allowed
- **Double-bet/double-claim prevention** — on-chain mappings enforce uniqueness
- **No sensitive logging** — wallet records are never logged in plaintext
- **Input validation** — Oracle validates title length, deadline bounds, and numeric thresholds
- **Error boundary** — Frontend catches crashes gracefully

---

## License

MIT
