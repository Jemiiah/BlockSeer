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
  status: 'pending' | 'locked' | 'resolved';
  deadline: string;
  threshold: string;
  metric_type: string;
  total_staked: string;
  option_a_stakes: string;
  option_b_stakes: string;
  option_a_label: string;
  option_b_label: string;
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
