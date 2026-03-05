export interface Market {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  resolution: string;
  category: MarketCategory;
  status: MarketStatus;
  endDate: string;
  volume: string;
  traders: number;
  yesPrice: number;
  noPrice: number;
  change: number;
  history: number[];
  oddsRevealed: boolean;
  isInRevealWindow: boolean;
  revealWindowEnd: number | null; // Unix timestamp
  volumeRaw: number;
  endTimestamp: number;
  // v5 fields
  tokenId: string; // '0' = ALEO, else ARC-21 token_id
  tokenSymbol: string; // 'ALEO', 'USDCx', 'USAD'
  winningOption: number | null; // 1 or 2, null if unresolved
  disputeWindowEnd: number | null; // Unix timestamp
  isInDisputeWindow: boolean;
  isCancelled: boolean;
  isClaimable: boolean; // resolved + dispute window passed + not cancelled
}

export type MarketCategory = 'Crypto' | 'Tech' | 'AI' | 'DeFi';

export type MarketStatus = 'live' | 'upcoming' | 'resolved';

export type MarketFilter = 'all' | 'live' | 'upcoming' | 'resolved';

export type MarketSort = 'volume' | 'ending_soon' | 'newest' | 'needs_resolution';

export type OutcomeType = 'yes' | 'no';

export interface Activity {
  user: string;
  action: 'bought' | 'sold';
  type: OutcomeType;
  amount: string;
  time: string;
}

export interface OrderSummary {
  shares: string;
  avgPrice: number;
  potentialReturn: string;
  odds: string;
  profit: string;
}

export interface OddsInfo {
  yesPrice: number;
  noPrice: number;
  yesOdds: number;
  noOdds: number;
}
