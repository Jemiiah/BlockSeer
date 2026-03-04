'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock, DollarSign, Lock, Timer } from 'lucide-react';
import { Market } from '@/types';
import { cn } from '@/lib/utils';

export function MarketCardSkeleton() {
  return (
    <div className="block w-full h-full min-h-[272px]">
      <div className="flex flex-col h-full rounded-2xl p-6 overflow-hidden bg-[hsl(230,15%,8%)] border border-white/[0.06] animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <div className="h-4 w-10 rounded bg-white/[0.06]" />
        </div>
        <div className="h-5 w-3/4 rounded bg-white/[0.06] mb-2" />
        <div className="h-4 w-1/2 rounded bg-white/[0.06] mb-5" />
        <div className="flex items-center justify-between mb-5">
          <div className="h-7 w-28 rounded-lg bg-white/[0.04]" />
          <div className="h-4 w-12 rounded bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-14 rounded-full bg-blue-500/[0.05] border border-blue-500/10" />
          <div className="h-14 rounded-full bg-white/[0.03] border border-white/[0.06]" />
        </div>
        <div className="pt-3 border-t border-white/[0.06]">
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

interface MarketCardProps {
  market: Market;
  index?: number;
}

export function MarketCard({ market, index = 0 }: MarketCardProps) {
  const isPositive = market.change >= 0;
  const isLive = market.status === 'live';
  const isResolved = market.status === 'resolved';

  return (
    <Link
      href={`/market/${market.id}`}
      className="group block w-full h-full min-h-[272px] cursor-pointer"
    >
      <div
        className={cn(
          'flex flex-col h-full rounded-2xl p-6 overflow-hidden',
          'bg-[hsl(230,15%,8%)] border border-white/[0.06]',
          'transition-colors duration-200 hover:border-white/[0.12]',
          isResolved && 'opacity-60'
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
          {isResolved && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
              Ended
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
          {market.oddsRevealed ? (
            <>
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
            </>
          ) : market.isInRevealWindow ? (
            <div className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-full border border-violet-500/20 bg-violet-500/[0.06] text-violet-400 text-xs font-medium">
              <Timer className="w-3 h-3" />
              Reveal window open
            </div>
          ) : (
            <div className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-full border border-amber-500/20 bg-amber-500/[0.06] text-amber-400 text-xs font-medium">
              <Lock className="w-3 h-3" />
              Odds revealed at deadline
            </div>
          )}
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
