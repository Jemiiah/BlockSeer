'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Market } from '@/types';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const isPositive = market.change >= 0;

  return (
    <Link
      href={`/market/${market.id}`}
      className="group relative bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-[24px] pt-6 px-6 pb-6 w-full h-full min-h-[252px] cursor-pointer transition-all duration-300 hover:border-white/[0.1] hover:shadow-[0_0_30px_-5px_hsla(217,91%,60%,0.15),0_0_20px_-5px_hsla(263,70%,60%,0.1)] hover:-translate-y-1 overflow-hidden flex flex-col"
    >
      {/* Gradient accent line at top (visible on hover) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Badge>{market.category}</Badge>
        {market.status === 'live' && (
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-base mb-1 group-hover:text-blue-400 transition-colors">
        {market.title}
      </h3>
      <p className="text-[hsl(230,10%,45%)] text-sm mb-5">{market.subtitle}</p>

      {/* Volume */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg">
            <DollarSign className="w-3.5 h-3.5 text-[hsl(230,10%,45%)]" />
            <span className="text-sm font-semibold text-white">{market.volume}</span>
            <span className="text-xs text-[hsl(230,10%,45%)]">Vol</span>
          </div>
        </div>
        <span className={cn('text-xs font-medium flex items-center gap-0.5', isPositive ? 'text-emerald-400' : 'text-red-400')}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isPositive ? '+' : ''}{market.change}%
        </span>
      </div>

      {/* Outcome Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button className="bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 rounded-full py-2 px-3 transition-all duration-200">
          <div className="text-[10px] text-blue-400/70 mb-0.5">Yes</div>
          <div className="text-sm font-bold">{market.yesPrice}¢</div>
        </button>
        <button className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 rounded-full py-2 px-3 transition-all duration-200">
          <div className="text-[10px] text-white/40 mb-0.5">No</div>
          <div className="text-sm font-bold">{market.noPrice}¢</div>
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[hsl(230,10%,40%)] pt-3 border-t border-white/[0.06]">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {market.endDate}
        </span>
      </div>
    </Link>
  );
}
