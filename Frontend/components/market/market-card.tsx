'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock, DollarSign, Lock, Timer, ShieldAlert, XCircle } from 'lucide-react';
import { Market } from '@/types';
import { cn } from '@/lib/utils';

export function MarketCardSkeleton() {
  return (
    <div className="block w-full h-full min-h-[272px]">
      <div className="flex flex-col h-full rounded-xl p-6 overflow-hidden bg-[#161820] border border-[#23262f] animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-5 w-16 rounded-full bg-[#1c1f2a]" />
          <div className="h-4 w-10 rounded bg-[#1c1f2a]" />
        </div>
        <div className="h-5 w-3/4 rounded bg-[#1c1f2a] mb-2" />
        <div className="h-4 w-1/2 rounded bg-[#1c1f2a] mb-5" />
        <div className="flex items-center justify-between mb-5">
          <div className="h-7 w-28 rounded-lg bg-[#1c1f2a]" />
          <div className="h-4 w-12 rounded bg-[#1c1f2a]" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-14 rounded-lg bg-[#00c278]/5 border border-[#00c278]/10" />
          <div className="h-14 rounded-lg bg-[#1c1f2a] border border-[#23262f]" />
        </div>
        <div className="pt-3 border-t border-[#23262f]">
          <div className="h-4 w-24 rounded bg-[#1c1f2a]" />
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
  const isDisputed = market.isInDisputeWindow;
  const isCancelled = market.isCancelled;

  return (
    <Link
      href={`/market/${market.id}`}
      className="group block w-full h-full min-h-[272px] cursor-pointer"
    >
      <div
        className={cn(
          'flex flex-col h-full rounded-xl p-6 overflow-hidden',
          'bg-[#161820] border border-[#23262f]',
          'transition-colors duration-200 hover:border-[#2f3340]',
          isResolved && 'opacity-60'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border border-[#23262f] bg-[#1c1f2a] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8b8d97]">
              {market.category}
            </span>
            {market.tokenSymbol && market.tokenSymbol !== 'ALEO' && (
              <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                {market.tokenSymbol}
              </span>
            )}
          </div>
          {isCancelled ? (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#ff4d4d]">
              <XCircle className="w-3 h-3" />
              Cancelled
            </span>
          ) : isDisputed ? (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-amber-400">
              <ShieldAlert className="w-3 h-3" />
              Disputed
            </span>
          ) : isLive ? (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#00c278]">
              <span className="block w-1.5 h-1.5 bg-[#00c278] rounded-full" />
              Live
            </span>
          ) : isResolved ? (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
              Ended
            </span>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="text-[#e8e9ed] font-semibold text-base mb-1">{market.title}</h3>
        <p className="text-[#8b8d97] text-sm mb-5">{market.subtitle}</p>

        {/* Volume */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1c1f2a]">
            <DollarSign className="w-3.5 h-3.5 text-[#8b8d97]" />
            <span className="text-sm font-semibold text-white">{market.volume}</span>
            <span className="text-xs text-[#8b8d97]">Vol</span>
          </div>
          <span
            className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              isPositive ? 'text-[#00c278]' : 'text-[#ff4d4d]'
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
                className="rounded-lg py-2 px-3 border border-[#00c278]/25 bg-[#00c278]/10 text-center"
                onClick={(e) => e.preventDefault()}
              >
                <div className="text-[10px] text-[#00c278]/70 mb-0.5">Yes</div>
                <div className="text-sm font-bold text-[#00c278]">{market.yesPrice}¢</div>
              </button>
              <button
                className="rounded-lg py-2 px-3 border border-[#ff4d4d]/25 bg-[#ff4d4d]/10 text-center"
                onClick={(e) => e.preventDefault()}
              >
                <div className="text-[10px] text-[#ff4d4d]/70 mb-0.5">No</div>
                <div className="text-sm font-bold text-[#ff4d4d]">{market.noPrice}¢</div>
              </button>
            </>
          ) : market.isInRevealWindow ? (
            <div className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-400 text-xs font-medium">
              <Timer className="w-3 h-3" />
              Reveal window open
            </div>
          ) : (
            <div className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-medium">
              <Lock className="w-3 h-3" />
              Sealed until market close
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[#5a5c66] pt-3 border-t border-[#23262f]">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {market.endDate}
          </span>
        </div>
      </div>
    </Link>
  );
}
