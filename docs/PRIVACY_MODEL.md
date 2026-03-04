# Privacy Model: Trustless Blind Betting with On-Chain Commit-Reveal

## Overview

BlockSeer implements a **trustless blind betting** model for its prediction markets on Aleo. During the active betting phase, individual bet amounts, chosen options, and bettor identities are kept private. After the pool deadline, users **reveal their own predictions on-chain** during a time-limited reveal window. No admin or Oracle involvement is needed for stake aggregation.

This was inspired by hackathon judge feedback: *"Odds hiding prediction market has never existed until now, would be even better if bets amount and bettor identity are also private."*

### Evolution: Admin Reveal → Trustless Commit-Reveal

| Aspect | v3 (Admin Reveal) | v4 (Trustless Commit-Reveal) |
|--------|-------------------|------------------------------|
| Who reveals stakes | Oracle admin calls `reveal_pool_stakes()` | Each user calls `reveal_prediction()` with their own record |
| Trust model | Must trust Oracle to honestly aggregate | Trustless — on-chain validation only |
| Single point of failure | Oracle goes down → stakes never revealed | Users reveal independently |
| Censorship | Oracle can omit predictions | Impossible — users hold their own records |
| Admin involvement | Required for every pool's reveal | Zero — fully automated by users |

## Architecture

```
User                    Aleo Blockchain           Oracle               Frontend
  |                          |                      |                     |
  |-- predict() ----------->|                      |                     |
  |   (private record +     |                      |                     |
  |    credits transfer)     |                      |                     |
  |                          |-- finalize:          |                     |
  |                          |   validate pool,     |                     |
  |                          |   check commitment,  |                     |
  |                          |   increment counter  |                     |
  |                          |                      |                     |
  |-- POST /predictions ----|--------------------->|                     |
  |   (report to Oracle)     |                      |-- store in DB       |
  |                          |                      |                     |
  |          ... deadline passes ...                |                     |
  |                          |                      |                     |
  |                          |<-- lock_pool() ------|                     |
  |                          |                      |-- set reveal window |
  |                          |                      |                     |
  |   ═══ REVEAL WINDOW (1 hour) ═══               |                     |
  |                          |                      |                     |
  |-- reveal_prediction() ->|                      |                     |
  |   (user's own record)    |-- finalize:          |                     |
  |                          |   verify commitment, |                     |-- show "Reveal Window"
  |                          |   accumulate stakes, |                     |-- countdown + reveal button
  |                          |   mark as revealed   |                     |
  |                          |                      |                     |
  |   ═══ REVEAL WINDOW ENDS ═══                   |                     |
  |                          |                      |                     |
  |                          |                      |-- sync on-chain --->|
  |                          |                      |                     |-- show real odds
  |                          |<-- resolve_pool() ---|                     |
  |                          |                      |                     |
  |-- collect_winnings() -->|                      |                     |
  |   (requires revealed)    |                      |                     |
```

## Smart Contract Changes

**Program:** `manifoldpredictionv4.aleo` (renamed from `manifoldpredictionv3.aleo`)

### Removed: `reveal_pool_stakes()` transition
The admin-only transition that required trusting the Oracle to honestly aggregate stakes has been **deleted**. No admin involvement in the reveal process.

### New: `reveal_prediction()` transition
User-callable (no admin check). Consumes a Prediction record to prove authenticity:

```leo
async transition reveal_prediction(prediction: Prediction) -> (Prediction, Future)
```

**Finalize logic:**
1. Verifies the commitment exists and matches the pool (`commitments[prediction_id] == pool_id`)
2. Verifies the commitment hasn't already been revealed (`!= 0field`)
3. Verifies the pool is locked (`status == 1`)
4. Validates the option is 1 or 2
5. Accumulates stakes on-chain (total, option_a, option_b)
6. Sets commitment to `0field` sentinel (marks as revealed)

**Why trustless:** Only the Prediction record holder can call this. Records are created by `predict()` and cryptographically owned by the user's address — they can't be forged, intercepted, or revealed by anyone else.

### Modified: `collect_winnings()` finalize
Added reveal check at the end:
```leo
let commitment_val = Mapping::get(commitments, prediction_id);
assert_eq(commitment_val, 0field); // must have revealed
```
This prevents unrevealed predictions from claiming winnings.

### `commitments` mapping (dual-purpose)
```leo
mapping commitments: field => field; // prediction_id => pool_id (or 0field if revealed)
```
- During betting: `prediction_id → pool_id` (prevents double-betting)
- After reveal: `prediction_id → 0field` (sentinel indicating revealed)
- Unrevealed: still holds `pool_id` → `collect_winnings` blocked

### Unchanged
- `create_pool()`, `lock_pool()`, `resolve_pool()` — no modifications needed
- `check_prediction()` — unchanged
- `predict()` — unchanged (already hides stakes during betting)

## Oracle Changes

### Replaced: `stakes_revealed` → `reveal_window_end`
```sql
ALTER TABLE markets ADD COLUMN reveal_window_end BIGINT;
```
Instead of a boolean flag controlled by admin reveal, markets now track when the reveal window ends (Unix timestamp).

### Removed: Worker reveal step
The worker loop no longer calls any reveal function. The flow changed from:
```
sync → create → lock → REVEAL → resolve
```
to:
```
sync → create → lock (+ set reveal window) → resolve (after window ends)
```

### Lock step sets reveal window
When the Oracle locks a pool on-chain, it also sets `reveal_window_end = currentTime + REVEAL_WINDOW_SECONDS` (default: 1 hour).

### Resolution waits for reveal window
Markets are only eligible for resolution when `status = 'locked' AND reveal_window_end < NOW()`.

### Kept: Predictions table + POST /predictions
Still used for monitoring, UI display, and sync guard during the reveal window (on-chain stakes may be partially accumulated during reveals).

## Frontend Changes

### Reveal Window UI
When `market.isInRevealWindow === true`:
- **Market cards:** "Reveal window open" badge (violet theme)
- **Featured market:** "Reveal Window Open" banner with timer icon
- **Trading panel:**
  - "Reveal Window" label on pool stats
  - Countdown timer showing remaining time
  - "Reveal Your Prediction" buttons for each unrevealed prediction in the user's wallet
  - Status messages for reveal transaction progress
- **Event detail:** Sentiment bar shows hidden (same as blind betting)

### New Hook: `use-reveal-prediction`
- Fetches user's Prediction records via wallet's `requestRecords()`
- Filters for unrevealed, unclaimed predictions
- `revealPrediction(record)` submits `reveal_prediction` transaction
- Polls for on-chain confirmation
- Reports to Oracle (non-blocking)

### Three UI States
1. **Blind Betting** (`!oddsRevealed && !isInRevealWindow`): Lock icons, hidden odds, "Stakes hidden until deadline"
2. **Reveal Window** (`isInRevealWindow`): Violet theme, countdown, reveal buttons
3. **Revealed** (`oddsRevealed`): Real odds, full pool stats

## Security Considerations

### Trust Model
- **Oracle trust: MINIMAL** — The Oracle only controls pool creation, locking, and resolution (which option won). It does NOT control stake aggregation or reveals.
- **User sovereignty:** Each user reveals their own prediction using their cryptographically owned record. No third party can reveal, censor, or modify predictions.
- **On-chain validation:** The finalize function validates commitments, pool status, and option validity. Stakes are accumulated trustlessly.

### Reveal Incentives
- Users MUST reveal to claim winnings (commitment must be `0field` for `collect_winnings`)
- Unrevealed predictions effectively forfeit their stake
- This is the same model used by ENS auctions and Ethereum commit-reveal voting
- The 1-hour default window gives users ample time to reveal

### Edge Cases
- **User doesn't reveal:** Their stake is forfeited. Other revealed winners split the pool proportionally. This is by design — no admin can "rescue" unrevealed stakes.
- **Missing prediction reports to Oracle:** The on-chain state is authoritative after the reveal window. Oracle aggregates are only used during betting/reveal for UI display.
- **Double reveal:** Blocked by `assert_neq(committed_pool, 0field)` — once revealed (sentinel = 0field), the same prediction can't be revealed again.
- **Reveal before lock:** Blocked by `assert_eq(pool.status, 1u8)` — pool must be locked.

### What's NOT Hidden
- **Transaction existence:** The Aleo network records that `predict()` and `reveal_prediction()` transactions occurred.
- **Total prediction count:** The `total_predictions` counter is public on-chain.
- **Revealed stakes:** After the reveal window, individual reveal transactions are public (but this is intentional — it's the reveal phase).
- **Credits transfer amount:** The `credits.aleo/transfer_private` call in `predict()` moves credits privately, but aggregate balance changes are theoretically observable.

## Pool Lifecycle

1. **Create:** Admin creates pool via Oracle → `create_pool()` on-chain
2. **Bet (Blind):** Users call `predict()` → private Prediction record created, credits transferred, counter incremented. Frontend reports to Oracle.
3. **Lock:** Deadline passes → Oracle calls `lock_pool()` on-chain, sets `reveal_window_end`
4. **Reveal Window (1 hour):** Users call `reveal_prediction()` with their Prediction records → stakes accumulated on-chain trustlessly
5. **Resolve:** Reveal window ends → Oracle fetches metric value → calls `resolve_pool()` with winning option
6. **Claim:** Winners call `collect_winnings()` with their revealed Prediction record → winnings transferred
