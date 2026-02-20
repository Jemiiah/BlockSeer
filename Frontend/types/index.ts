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
}

export type MarketCategory =
  | 'Regulation'
  | 'DeFi'
  | 'Price'
  | 'Network'
  | 'Token'
  | 'Layer 2'
  | 'Staking'
  | 'Institutional'
  | 'Technology';

export type MarketStatus = 'live' | 'upcoming' | 'resolved';

export type MarketFilter = 'all' | 'live' | 'upcoming';

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
