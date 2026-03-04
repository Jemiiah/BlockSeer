import { MarketCategory } from '@/types';

const METRIC_TYPE_MAP: Record<string, MarketCategory> = {
  eth_price: 'Crypto',
  btc_dominance: 'Crypto',
  eth_staking_rate: 'DeFi',
  eth_gas_price: 'Crypto',
  stablecoin_peg: 'DeFi',
  fear_greed: 'Crypto',
};

const KEYWORD_MAP: [RegExp, MarketCategory][] = [
  [/\b(defi|tvl|uniswap|aave|lido|staking|swap|liquidity|yield|amm)\b/i, 'DeFi'],
  [/\b(ai|artificial intelligence|machine learning|gpt|llm|neural)\b/i, 'AI'],
  [/\b(bitcoin|btc|ethereum|eth|solana|sol|aleo|token|chain|l2|layer\s*2|zk|blockchain|crypto|nft|web3)\b/i, 'Crypto'],
  [/\b(tech|software|hardware|computing|quantum|proof|proving)\b/i, 'Tech'],
];

export function inferCategory(metricType: string, title: string): MarketCategory {
  if (metricType && METRIC_TYPE_MAP[metricType]) {
    return METRIC_TYPE_MAP[metricType];
  }

  for (const [pattern, category] of KEYWORD_MAP) {
    if (pattern.test(title)) {
      return category;
    }
  }

  return 'Crypto';
}

export const ALL_CATEGORIES: MarketCategory[] = ['Crypto', 'DeFi', 'Tech', 'AI'];
