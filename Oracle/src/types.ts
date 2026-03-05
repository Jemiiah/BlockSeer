/** Database row for a market */
export interface MarketRow {
  market_id: string;
  title: string;
  deadline: string; // BIGINT comes back as string from pg
  threshold: string; // DECIMAL comes back as string from pg
  status: 'pending' | 'locked' | 'resolved' | 'disputed' | 'cancelled';
  metric_type: string;
  description: string;
  option_a_label: string;
  option_b_label: string;
  total_staked: string;
  option_a_stakes: string;
  option_b_stakes: string;
  on_chain: boolean;
  reveal_window_end: string | null;
  token_id: string;
  dispute_window_end: string | null;
  winning_option: number | null;
  cancelled: boolean;
}

/** Database row for a prediction */
export interface PredictionRow {
  prediction_id: string;
  market_id: string;
  option: number;
  amount: string; // BIGINT
  tx_id: string | null;
  reported_at: string;
}

/** Aggregate stakes for a market */
export interface AggregateStakes {
  total_staked: number;
  option_a_stakes: number;
  option_b_stakes: number;
}

/** PostgreSQL pool configuration */
export interface DbPoolConfig {
  connectionString?: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: { rejectUnauthorized: boolean };
}
