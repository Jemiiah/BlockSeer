'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Market } from '@/types';
import { cn } from '@/lib/utils';

interface MarketCardProps {
  market: Market;
  index?: number;
}

export function MarketCard({ market, index = 0 }: MarketCardProps) {
  const isPositive = market.change >= 0;
  const isLive = market.status === 'live';

  return (
    <Link
      href={`/market/${market.id}`}
      className="group block w-full h-full min-h-[272px] cursor-pointer"
    >
      <div
        className={cn(
          'flex flex-col h-full rounded-2xl p-6 overflow-hidden',
          'bg-[hsl(230,15%,8%)] border border-white/[0.06]',
          'transition-colors duration-200 hover:border-white/[0.12]'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
            {market.category}
          </span>
          {isLive && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
              <span className="block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Live
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-base mb-1">{market.title}</h3>
        <p className="text-[hsl(230,10%,45%)] text-sm mb-5">{market.subtitle}</p>

        {/* Volume */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04]">
            <DollarSign className="w-3.5 h-3.5 text-[hsl(230,10%,45%)]" />
            <span className="text-sm font-semibold text-white">{market.volume}</span>
            <span className="text-xs text-[hsl(230,10%,45%)]">Vol</span>
          </div>
          <span
            className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              isPositive ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositive ? '+' : ''}{market.change}%
          </span>
        </div>

        {/* Outcome Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            className="rounded-full py-2 px-3 border border-blue-500/30 bg-blue-500/[0.08] text-center"
            onClick={(e) => e.preventDefault()}
          >
            <div className="text-[10px] text-blue-400/70 mb-0.5">Yes</div>
            <div className="text-sm font-bold text-blue-400">{market.yesPrice}¢</div>
          </button>
          <button
            className="rounded-full py-2 px-3 border border-white/[0.08] bg-white/[0.04] text-center"
            onClick={(e) => e.preventDefault()}
          >
            <div className="text-[10px] text-white/40 mb-0.5">No</div>
            <div className="text-sm font-bold text-white/70">{market.noPrice}¢</div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[hsl(230,10%,40%)] pt-3 border-t border-white/[0.06]">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {market.endDate}
          </span>
        </div>
      </div>
    </Link>
  );
}
