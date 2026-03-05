// Backend API client for fetching markets
// Direct backend URL (used by admin POST and exported for reference)
const isDev = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
export const API_BASE_URL = isDev
    ? 'http://localhost:3001'
    : 'https://blockseer.onrender.com';

// Proxy URL (same-origin, avoids CORS issues in the browser)
const PROXY_URL = '/api/markets';

// API response types matching backend format
export interface ApiMarket {
  market_id: string;
  title: string;
  description: string;
  status: 'pending' | 'locked' | 'resolved' | 'disputed' | 'cancelled';
  deadline: string;
  threshold: string;
  metric_type: string;
  total_staked: string;
  option_a_stakes: string;
  option_b_stakes: string;
  option_a_label: string;
  option_b_label: string;
  reveal_window_end?: number | null;
  // v5 fields
  token_id?: string;
  dispute_window_end?: number | null;
  winning_option?: number | null;
  cancelled?: boolean;
}

// Fetch all markets (through Next.js proxy to avoid CORS)
export async function fetchAllMarkets(): Promise<ApiMarket[]> {
  try {
    const response = await fetch(PROXY_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.statusText}`);
    }
    const data = await response.json();
    return data.markets || data || [];
  } catch (error) {
    console.error('Error fetching all markets:', error);
    return [];
  }
}

// Submit a claim request to Oracle (for token-based claims that need relay)
export async function submitClaim(predictionId: string, marketId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prediction_id: predictionId, market_id: marketId }),
    });
    const data = await response.json();
    return { success: data.success ?? false, error: data.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit claim' };
  }
}
