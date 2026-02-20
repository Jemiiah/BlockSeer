Plan to implement                                                                                                                                                           │
│                                                                                                                                                                             │
│ Plan: On-Chain Pool Data + Odds System                                                                                                                                      │
│                                                                                                                                                                             │
│ Context                                                                                                                                                                     │
│                                                                                                                                                                             │
│ The market detail page currently shows pool data from a backend API (blockseer.onrender.com). The on-chain contract stores real-time staking data in public mappings        │
│ (pools, total_predictions) that include option_a_stakes, option_b_stakes, total_staked, etc. An aleo-client.ts already exists with functions to query these mappings        │
│ (getPool, getAllPools, getTotalPredictions) but is not used anywhere. The trading panel's odds/return calculation is a placeholder (shares * 1). We need to wire up real    │
│ on-chain data and build a proper odds system.                                                                                                                               │
│                                                                                                                                                                             │
│ Files to Modify                                                                                                                                                             │
│                                                                                                                                                                             │
│ ┌──────────────────────────────────────────────┬────────────────────────────────────────────────────────┐                                                                   │
│ │                     File                     │                         Change                         │                                                                   │
│ ├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤                                                                   │
│ │ Frontend/hooks/use-aleo-pools.ts             │ Add on-chain pool data fetching as enrichment/fallback │                                                                   │
│ ├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤                                                                   │
│ │ Frontend/lib/utils.ts                        │ Rewrite calculateOrderSummary with real odds math      │                                                                   │
│ ├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤                                                                   │
│ │ Frontend/components/market/trading-panel.tsx │ Show on-chain stakes, odds breakdown                   │                                                                   │
│ ├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤                                                                   │
│ │ Frontend/components/market/event-detail.tsx  │ Display real trader count and staking stats            │                                                                   │
│ ├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤                                                                   │
│ │ Frontend/lib/aleo-client.ts                  │ Fix network URL path to use /testnet/                  │                                                                   │
│ └──────────────────────────────────────────────┴────────────────────────────────────────────────────────┘                                                                   │
│                                                                                                                                                                             │
│ Existing Code to Reuse                                                                                                                                                      │
│                                                                                                                                                                             │
│ - Frontend/lib/aleo-client.ts — getPool(), getTotalPredictions(), parsePoolStruct() (already built, just unused)                                                            │
│ - Frontend/hooks/use-aleo-pools.ts — apiMarketToMarket() conversion (keep backend as primary source, enrich with on-chain)                                                  │
│ - Frontend/lib/utils.ts — calculateOrderSummary() (rewrite in place)                                                                                                        │
│                                                                                                                                                                             │
│ Implementation Steps                                                                                                                                                        │
│                                                                                                                                                                             │
│ Step 1: Fix aleo-client.ts network URL                                                                                                                                      │
│                                                                                                                                                                             │
│ The client currently uses https://api.explorer.provable.com/v1 without a network path. The program is deployed on testnet, so mapping queries need /testnet/ in the path.   │
│ Update NETWORK_URL to https://api.explorer.provable.com/v1/testnet.                                                                                                         │
│                                                                                                                                                                             │
│ Step 2: Create useOnChainPool hook                                                                                                                                          │
│                                                                                                                                                                             │
│ New hook in Frontend/hooks/use-on-chain-pool.ts that:                                                                                                                       │
│ - Takes a poolId (field string)                                                                                                                                             │
│ - Calls getPool(poolId) from aleo-client.ts to fetch on-chain AleoPool data                                                                                                 │
│ - Calls getTotalPredictions(poolId) for prediction count                                                                                                                    │
│ - Uses React Query with 30s stale time for caching                                                                                                                          │
│ - Returns { pool: AleoPool | null, totalPredictions: number, isLoading, error }                                                                                             │
│                                                                                                                                                                             │
│ Step 3: Build odds calculation in lib/utils.ts                                                                                                                              │
│                                                                                                                                                                             │
│ Rewrite calculateOrderSummary to use a proper pari-mutuel odds system:                                                                                                      │
│                                                                                                                                                                             │
│ Odds formula (pari-mutuel style):                                                                                                                                           │
│ - yesOdds = totalStaked / optionAStakes (e.g., if 100 total, 60 on Yes → 1.67x)                                                                                             │
│ - noOdds = totalStaked / optionBStakes (e.g., 100 total, 40 on No → 2.5x)                                                                                                   │
│ - impliedProbability = optionAStakes / totalStaked (shown as price in cents: 60¢)                                                                                           │
│                                                                                                                                                                             │
│ Returns formula:                                                                                                                                                            │
│ - potentialReturn = amount * odds (your stake × payout multiplier)                                                                                                          │
│ - profit = potentialReturn - amount                                                                                                                                         │
│                                                                                                                                                                             │
│ Add a new function calculateOdds(optionAStakes, optionBStakes) that returns { yesPrice, noPrice, yesOdds, noOdds }.                                                         │
│                                                                                                                                                                             │
│ Update calculateOrderSummary to accept on-chain stakes and compute:                                                                                                         │
│ - shares = amount / price (how many outcome tokens you get)                                                                                                                 │
│ - potentialReturn = shares × $1 (each share pays $1 if it wins)                                                                                                             │
│ - avgPrice = current implied probability as cents                                                                                                                           │
│                                                                                                                                                                             │
│ Step 4: Update use-aleo-pools.ts                                                                                                                                            │
│                                                                                                                                                                             │
│ Enrich the apiMarketToMarket conversion:                                                                                                                                    │
│ - After fetching from the backend API, also try to fetch on-chain data via getPool()                                                                                        │
│ - Use on-chain option_a_stakes / option_b_stakes for live prices (more up-to-date than backend)                                                                             │
│ - Use on-chain total_no_of_stakes as trader count                                                                                                                           │
│ - Keep backend API as the primary source for title/description (since on-chain stores field hashes, not readable strings)                                                   │
│                                                                                                                                                                             │
│ Step 5: Update trading-panel.tsx                                                                                                                                            │
│                                                                                                                                                                             │
│ - Import and use useOnChainPool to get live staking data                                                                                                                    │
│ - Show a "Pool Stats" section with:                                                                                                                                         │
│   - Total staked (in ALEO)                                                                                                                                                  │
│   - Yes pool / No pool stakes                                                                                                                                               │
│   - Number of predictions                                                                                                                                                   │
│ - Update the order summary to show:                                                                                                                                         │
│   - Odds multiplier (e.g., "1.67x")                                                                                                                                         │
│   - Potential return based on real odds                                                                                                                                     │
│   - Implied probability                                                                                                                                                     │
│                                                                                                                                                                             │
│ Step 6: Update event-detail.tsx                                                                                                                                             │
│                                                                                                                                                                             │
│ - Use on-chain trader count (total_no_of_stakes) instead of hardcoded 0                                                                                                     │
│ - Show real volume from on-chain total_staked                                                                                                                               │
│                                                                                                                                                                             │
│ Odds System Summary                                                                                                                                                         │
│                                                                                                                                                                             │
│ Pool: 1000 ALEO total (600 on Yes, 400 on No)                                                                                                                               │
│                                                                                                                                                                             │
│ Yes price: 60¢  (600/1000 = 60% implied probability)                                                                                                                        │
│ No price:  40¢  (400/1000 = 40% implied probability)                                                                                                                        │
│                                                                                                                                                                             │
│ If you bet 10 ALEO on Yes:                                                                                                                                                  │
│   Odds:            1.67x (1000/600)                                                                                                                                         │
│   Shares:          16.67 (10/0.60)                                                                                                                                          │
│   Potential return: 16.67 ALEO (if Yes wins)                                                                                                                                │
│   Profit:          6.67 ALEO                                                                                                                                                │
│                                                                                                                                                                             │
│ If you bet 10 ALEO on No:                                                                                                                                                   │
│   Odds:            2.50x (1000/400)                                                                                                                                         │
│   Shares:          25.00 (10/0.40)                                                                                                                                          │
│   Potential return: 25.00 ALEO (if No wins)                                                                                                                                 │
│   Profit:          15.00 ALEO                                                                                                                                               │
│                                                                                                                                                                             │
│ This matches the contract's calculate_winnings function:                                                                                                                    │
│ winnings = (amount_staked * total_staked) / total_winning_stakes                                                                                                            │
│                                                                                                                                                                             │
│ Verification                                                                                                                                                                │
│                                                                                                                                                                             │
│ 1. Open a market detail page                                                                                                                                                │
│ 2. Check that the trading panel shows real on-chain stakes (not zeros)                                                                                                      │
│ 3. Enter an amount and verify the odds/return math matches the formula above                                                                                                │
│ 4. Verify trader count and volume update from on-chain data                                                                                                                 │
│ 5. Check browser console for successful aleo-client.ts API calls  