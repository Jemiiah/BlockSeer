'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, Users } from 'lucide-react';
import { Market } from '@/types';

interface FeaturedMarketProps {
  markets: Market[];
}

export function FeaturedMarket({ markets }: FeaturedMarketProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trendingMarkets = markets.slice(0, 5);

  useEffect(() => {
    if (trendingMarkets.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % trendingMarkets.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [trendingMarkets.length]);

  // Don't render if no markets
  if (trendingMarkets.length === 0) {
    return null;
  }

  const market = trendingMarkets[activeIndex];

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-amber-400" />
        <span className="text-sm font-semibold uppercase tracking-wider text-amber-400">Trending</span>
      </div>

      {/* Main Card */}
      <Link
        href={`/market/${market.id}`}
        className="block relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-3xl p-8 cursor-pointer hover:border-zinc-600 transition-all duration-300 overflow-hidden min-h-[280px]"
      >
        {/* Background gradient accent */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Category badge */}
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
              {market.category}
            </span>
          </div>

          {/* Title and description */}
          <div className="flex-1 mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
              {market.title}
            </h2>
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
              {market.description}
            </p>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-8">
            {/* Yes/No prices */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center px-6 py-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <span className="text-3xl font-bold text-emerald-400">{market.yesPrice}¢</span>
                <span className="text-xs text-emerald-400/70 font-medium">Yes</span>
              </div>
              <div className="flex flex-col items-center px-6 py-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <span className="text-3xl font-bold text-red-400">{market.noPrice}¢</span>
                <span className="text-xs text-red-400/70 font-medium">No</span>
              </div>
            </div>

            {/* Volume and traders */}
            <div className="flex items-center gap-6 text-zinc-400">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">{market.volume} vol</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{market.traders.toLocaleString()} traders</span>
              </div>
            </div>

            {/* Change indicator */}
            <div className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${
              market.change >= 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {market.change >= 0 ? '+' : ''}{market.change}%
            </div>
          </div>
        </div>
      </Link>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {trendingMarkets.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(index);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? 'bg-white w-6'
                : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
