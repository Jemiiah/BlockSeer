// Backend API client for fetching markets
const API_BASE_URL = 'https://blockseer.onrender.com';

// API response types
export interface ApiMarket {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'locked' | 'resolved';
  deadline?: number;
  total_staked?: number;
  option_a_stakes?: number;
  option_b_stakes?: number;
  total_predictions?: number;
  winning_option?: number;
}

// Fetch all markets
export async function fetchAllMarkets(): Promise<ApiMarket[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/markets`);
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

// Fetch pending markets only
export async function fetchPendingMarkets(): Promise<ApiMarket[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/markets/pending`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pending markets: ${response.statusText}`);
    }
    const data = await response.json();
    return data.markets || data || [];
  } catch (error) {
    console.error('Error fetching pending markets:', error);
    return [];
  }
}

// Fetch locked markets only
export async function fetchLockedMarkets(): Promise<ApiMarket[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/markets/locked`);
    if (!response.ok) {
      throw new Error(`Failed to fetch locked markets: ${response.statusText}`);
    }
    const data = await response.json();
    return data.markets || data || [];
  } catch (error) {
    console.error('Error fetching locked markets:', error);
    return [];
  }
}
