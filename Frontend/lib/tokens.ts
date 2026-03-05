// Token configuration for supported pool denominations
// Maps on-chain token_id (field) to display metadata

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number; // microcredits for ALEO (6), varies for ARC-21
}

// Known token IDs on Aleo testnet
const TOKEN_MAP: Record<string, TokenConfig> = {
  '0': { symbol: 'ALEO', name: 'Aleo Credits', decimals: 6 },
  // Add known USDCx/USAD token_ids when deployed on testnet
  // Example: '12345field': { symbol: 'USDCx', name: 'USD Coin (Bridged)', decimals: 6 },
};

/**
 * Look up token config by on-chain token_id.
 * Returns ALEO config for unknown tokens (safe fallback).
 */
export function getTokenConfig(tokenId: string): TokenConfig {
  // Normalize: strip 'field' suffix if present
  const normalized = tokenId.replace('field', '').trim();
  return TOKEN_MAP[normalized] || TOKEN_MAP['0'];
}

/**
 * Get display symbol for a token_id.
 */
export function getTokenSymbol(tokenId: string): string {
  return getTokenConfig(tokenId).symbol;
}

/**
 * Convert raw on-chain amount to human-readable value.
 */
export function formatTokenAmount(amount: number, tokenId: string): number {
  const config = getTokenConfig(tokenId);
  return amount / Math.pow(10, config.decimals);
}
