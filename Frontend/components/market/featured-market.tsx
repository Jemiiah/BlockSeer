'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Market } from '@/types';
import { cn } from '@/lib/utils';

interface FeaturedMarketProps {
  markets: Market[];
}

export function FeaturedMarket({ markets }: FeaturedMarketProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>();

  const trendingMarkets = markets.slice(0, 5);
  const SLIDE_DURATION = 6000;

  // Validate activeIndex
  useEffect(() => {
    if (activeIndex >= trendingMarkets.length) {
      setActiveIndex(0);
    }
  }, [trendingMarkets.length, activeIndex]);

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === activeIndex) return;
      setIsTransitioning(true);
      setProgress(0);
      setTimeout(() => {
        setActiveIndex(index);
        setTimeout(() => setIsTransitioning(false), 300);
      }, 50);
    },
    [activeIndex, isTransitioning]
  );

  const goNext = useCallback(() => {
    const next = (activeIndex + 1) % trendingMarkets.length;
    goToSlide(next);
  }, [activeIndex, trendingMarkets.length, goToSlide]);

  const goPrev = useCallback(() => {
    const prev = (activeIndex - 1 + trendingMarkets.length) % trendingMarkets.length;
    goToSlide(prev);
  }, [activeIndex, trendingMarkets.length, goToSlide]);

  // Auto-advance with progress tracking
  useEffect(() => {
    if (trendingMarkets.length === 0 || isPaused) return;

    const startTime = performance.now();
    function tick() {
      const elapsed = performance.now() - startTime;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        goNext();
      } else {
        progressRef.current = requestAnimationFrame(tick);
      }
    }

    progressRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [activeIndex, isPaused, trendingMarkets.length, goNext]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  if (trendingMarkets.length === 0) return null;

  const market = trendingMarkets[activeIndex];

  return (
    <div
      ref={containerRef}
      className="mb-10 relative select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Trending markets"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold uppercase tracking-wider text-amber-400">
            Trending
          </span>
        </div>

        {/* Arrow navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors"
            aria-label="Previous market"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors"
            aria-label="Next market"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Progress ring */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 13}`}
                strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`}
                className="transition-all duration-100"
                style={{ opacity: isPaused ? 0.3 : 0.7 }}
              />
            </svg>
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-3 border-l-2 border-r-2 border-white/40" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Hero Card */}
      <Link
        href={`/market/${market.id}`}
        className={cn(
          'block relative rounded-3xl p-8 cursor-pointer overflow-hidden min-h-[300px]',
          'bg-[hsl(230,15%,8%)]/90 backdrop-blur-sm border border-white/[0.08]',
          'transition-opacity duration-300',
          isTransitioning ? 'opacity-0' : 'opacity-100'
        )}
        draggable={false}
        aria-roledescription="slide"
        aria-label={`${activeIndex + 1} of ${trendingMarkets.length}: ${market.title}`}
      >
        <div className="relative z-10 flex flex-col h-full">
          {/* Category badge */}
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-500/30 bg-blue-500/[0.1] text-blue-400">
              {market.category}
            </span>
            <span className="text-xs text-white/30 font-medium">
              {activeIndex + 1} / {trendingMarkets.length}
            </span>
          </div>

          {/* Title and description */}
          <div className="flex-1 mb-6">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
              {market.title}
            </h2>
            <p className="text-white/40 text-base md:text-lg leading-relaxed max-w-2xl">
              {market.description}
            </p>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-end gap-6">
            {/* Yes price */}
            <div className="flex flex-col items-center px-6 py-3 rounded-xl border bg-emerald-500/[0.08] border-emerald-500/20">
              <span className="text-3xl font-bold text-emerald-400">{market.yesPrice}¢</span>
              <span className="text-xs text-emerald-400/70 font-medium">Yes</span>
            </div>

            {/* No price */}
            <div className="flex flex-col items-center px-6 py-3 rounded-xl border bg-red-500/[0.08] border-red-500/20">
              <span className="text-3xl font-bold text-red-400">{market.noPrice}¢</span>
              <span className="text-xs text-red-400/70 font-medium">No</span>
            </div>

            {/* Volume and traders */}
            <div className="flex items-center gap-5 text-white/40 ml-auto">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">{market.volume} vol</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {market.traders.toLocaleString()} traders
                </span>
              </div>
            </div>

            {/* Change indicator */}
            <div
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-bold',
                market.change >= 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              )}
            >
              {market.change >= 0 ? '+' : ''}
              {market.change}%
            </div>
          </div>
        </div>
      </Link>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-3 mt-5">
        {trendingMarkets.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(index);
            }}
            className={cn(
              'rounded-full transition-all duration-300',
              index === activeIndex
                ? 'w-8 h-2.5 bg-blue-500'
                : 'w-2.5 h-2.5 bg-white/15 hover:bg-white/30'
            )}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
}
