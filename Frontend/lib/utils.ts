import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Market, MarketFilter, OddsInfo, OrderSummary, OutcomeType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function filterMarkets(markets: Market[], filter: MarketFilter): Market[] {
  if (filter === 'all') return markets;
  return markets.filter((m) => m.status === filter);
}

export function countMarketsByStatus(markets: Market[]) {
  return {
    live: markets.filter((m) => m.status === 'live').length,
    upcoming: markets.filter((m) => m.status === 'upcoming').length,
  };
}

// Pari-mutuel odds calculation from on-chain stakes
export function calculateOdds(optionAStakes: number, optionBStakes: number): OddsInfo {
  const totalStaked = optionAStakes + optionBStakes;

  if (totalStaked === 0) {
    return { yesPrice: 50, noPrice: 50, yesOdds: 2, noOdds: 2 };
  }

  const yesPrice = Math.round((optionAStakes / totalStaked) * 100);
  const noPrice = 100 - yesPrice;
  const yesOdds = optionAStakes > 0 ? totalStaked / optionAStakes : 0;
  const noOdds = optionBStakes > 0 ? totalStaked / optionBStakes : 0;

  return { yesPrice, noPrice, yesOdds, noOdds };
}

export function calculateOrderSummary(
  amount: string,
  selectedOutcome: OutcomeType,
  market: Market,
  onChainStakes?: { optionAStakes: number; optionBStakes: number }
): OrderSummary {
  const amountNum = parseFloat(amount) || 0;

  // Use on-chain stakes for odds if available, otherwise fall back to market prices
  let price: number;
  let odds: number;

  if (onChainStakes) {
    const oddsInfo = calculateOdds(onChainStakes.optionAStakes, onChainStakes.optionBStakes);
    price = selectedOutcome === 'yes' ? oddsInfo.yesPrice : oddsInfo.noPrice;
    odds = selectedOutcome === 'yes' ? oddsInfo.yesOdds : oddsInfo.noOdds;
  } else {
    price = selectedOutcome === 'yes' ? market.yesPrice : market.noPrice;
    const totalImplied = market.yesPrice + market.noPrice;
    odds = totalImplied > 0 && price > 0 ? totalImplied / price : 0;
  }

  // shares = amount / (price in ALEO, i.e. price/100)
  // Each share pays 1 ALEO if it wins
  const priceDecimal = price / 100;
  const shares = amountNum && priceDecimal > 0 ? (amountNum / priceDecimal).toFixed(2) : '0.00';
  const potentialReturn = amountNum && priceDecimal > 0 ? (parseFloat(shares) * 1).toFixed(2) : '0.00';
  const profit = (parseFloat(potentialReturn) - amountNum).toFixed(2);

  return {
    shares,
    avgPrice: price,
    potentialReturn,
    odds: odds > 0 ? odds.toFixed(2) : '0.00',
    profit,
  };
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
