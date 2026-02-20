'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Market } from '@/types';
import { cn } from '@/lib/utils';

interface FeaturedMarketProps {
  markets: Market[];
}

// Aurora color palettes for each slide
const AURORA_PALETTES = [
  ['#0ea5e9', '#6366f1', '#a855f7'], // blue → indigo → purple
  ['#10b981', '#06b6d4', '#3b82f6'], // emerald → cyan → blue
  ['#f59e0b', '#ef4444', '#ec4899'], // amber → red → pink
  ['#8b5cf6', '#d946ef', '#f43f5e'], // violet → fuchsia → rose
  ['#06b6d4', '#22d3ee', '#a78bfa'], // cyan → sky → violet
];

// Sparkline mini chart
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-fill-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-fill-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hero-sparkline-path"
      />
    </svg>
  );
}

// Animated counter for numbers
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef<number>();

  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value]);

  return (
    <span className="hero-number-glow">
      {display}
      {suffix}
    </span>
  );
}

// Liquid progress bar
function LiquidProgress({ value, color }: { value: number; color: string }) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="hero-liquid-track">
      <div
        className="hero-liquid-fill"
        style={{
          width: `${clampedValue}%`,
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
        }}
      >
        <div className="hero-liquid-wave" />
      </div>
    </div>
  );
}

export function FeaturedMarket({ markets }: FeaturedMarketProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
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

  // Navigate to a specific slide
  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === activeIndex) return;
      setIsTransitioning(true);
      setProgress(0);
      setTimeout(() => {
        setActiveIndex(index);
        setTimeout(() => setIsTransitioning(false), 600);
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

  // Mouse parallax for orbs
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setMousePos({ x, y });

      // Drag-to-swipe
      if (isDragging) {
        const dragDelta = e.clientX - dragStartX;
        if (Math.abs(dragDelta) > 80) {
          if (dragDelta > 0) goPrev();
          else goNext();
          setIsDragging(false);
        }
      }
    },
    [isDragging, dragStartX, goNext, goPrev]
  );

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
  const palette = AURORA_PALETTES[activeIndex % AURORA_PALETTES.length];

  return (
    <>
      {/* Self-contained styles */}
      <style>{`
        /* Aurora background */
        @keyframes hero-aurora-shift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        /* Orb floating */
        @keyframes hero-orb-float-1 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -30px) scale(1.05);
          }
          50% {
            transform: translate(-10px, -50px) scale(0.95);
          }
          75% {
            transform: translate(-30px, -20px) scale(1.02);
          }
        }

        @keyframes hero-orb-float-2 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-25px, 20px) scale(1.08);
          }
          66% {
            transform: translate(15px, -25px) scale(0.92);
          }
        }

        @keyframes hero-orb-float-3 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          20% {
            transform: translate(30px, 10px) scale(0.97);
          }
          60% {
            transform: translate(-20px, -35px) scale(1.06);
          }
        }

        /* Card flip transition */
        @keyframes hero-flip-in {
          0% {
            opacity: 0;
            transform: perspective(1200px) rotateY(-30deg) scale(0.9);
            filter: blur(8px);
          }
          60% {
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: perspective(1200px) rotateY(0deg) scale(1);
            filter: blur(0px);
          }
        }

        @keyframes hero-flip-out {
          0% {
            opacity: 1;
            transform: perspective(1200px) rotateY(0deg) scale(1);
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            transform: perspective(1200px) rotateY(30deg) scale(0.9);
            filter: blur(8px);
          }
        }

        /* Neon border pulse */
        @keyframes hero-neon-pulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        /* Liquid wave */
        @keyframes hero-liquid-wave {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Number glow flash on change */
        @keyframes hero-number-flash {
          0% {
            text-shadow: 0 0 20px currentColor;
          }
          100% {
            text-shadow: 0 0 0px currentColor;
          }
        }

        /* Sparkline draw */
        @keyframes hero-sparkline-draw {
          from {
            stroke-dashoffset: 200;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        /* Progress ring */
        @keyframes hero-progress-spin {
          from {
            transform: rotate(-90deg);
          }
          to {
            transform: rotate(270deg);
          }
        }

        /* Dot expand ring */
        @keyframes hero-dot-ring {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        /* Particle burst */
        @keyframes hero-particle {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--px), var(--py)) scale(0);
          }
        }

        /* Magnetic hover effect */
        @keyframes hero-magnetic-pull {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
          }
        }

        .hero-aurora {
          background-size: 400% 400%;
          animation: hero-aurora-shift 8s ease-in-out infinite;
          transition: background 1s ease-in-out;
        }

        .hero-orb-1 {
          animation: hero-orb-float-1 12s ease-in-out infinite;
        }
        .hero-orb-2 {
          animation: hero-orb-float-2 10s ease-in-out infinite;
        }
        .hero-orb-3 {
          animation: hero-orb-float-3 14s ease-in-out infinite;
        }

        .hero-card-enter {
          animation: hero-flip-in 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        .hero-card-exit {
          animation: hero-flip-out 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        .hero-neon-border {
          position: relative;
        }
        .hero-neon-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(
            135deg,
            var(--neon-1) 0%,
            var(--neon-2) 50%,
            var(--neon-3) 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: hero-neon-pulse 3s ease-in-out infinite;
          pointer-events: none;
        }

        .hero-glass {
          background: rgba(15, 15, 30, 0.6);
          backdrop-filter: blur(24px) saturate(1.5);
          -webkit-backdrop-filter: blur(24px) saturate(1.5);
        }

        .hero-number-glow {
          animation: hero-number-flash 1.2s ease-out;
        }

        .hero-sparkline-path {
          stroke-dasharray: 200;
          animation: hero-sparkline-draw 1.5s ease-out forwards;
        }

        .hero-liquid-track {
          position: relative;
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }

        .hero-liquid-fill {
          position: relative;
          height: 100%;
          border-radius: 3px;
          transition: width 1s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .hero-liquid-wave {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          animation: hero-liquid-wave 2s ease-in-out infinite;
        }

        .hero-dot-active::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          animation: hero-dot-ring 1.5s ease-out infinite;
        }

        .hero-arrow-btn {
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .hero-arrow-btn:hover {
          transform: scale(1.15);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }
        .hero-arrow-btn:active {
          transform: scale(0.95);
        }

        /* Floating shadow under card */
        .hero-floating-shadow {
          filter: blur(40px);
          transition: all 1s ease-in-out;
        }

        /* Particle burst container */
        .hero-particle-burst span {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          animation: hero-particle 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        /* Prefers reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .hero-aurora,
          .hero-orb-1,
          .hero-orb-2,
          .hero-orb-3,
          .hero-liquid-wave,
          .hero-sparkline-path,
          .hero-neon-border::before {
            animation: none !important;
          }
          .hero-card-enter,
          .hero-card-exit {
            animation-duration: 0.01s !important;
          }
        }
      `}</style>

      <div
        ref={containerRef}
        className="mb-10 relative select-none"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          setIsDragging(false);
        }}
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragStartX(e.clientX);
        }}
        onMouseUp={() => setIsDragging(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Trending markets"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Flame className="w-5 h-5 text-amber-400" />
              <div className="absolute inset-0 w-5 h-5 text-amber-400 blur-sm opacity-60">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Trending
            </span>
          </div>

          {/* Arrow navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="hero-arrow-btn w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1]"
              aria-label="Previous market"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              className="hero-arrow-btn w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1]"
              aria-label="Next market"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Pause indicator with progress ring */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="2"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke={palette[1]}
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
        <div className="relative">
          {/* Aurora background */}
          <div
            className="hero-aurora absolute inset-0 rounded-3xl opacity-20 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${palette[0]}40, ${palette[1]}30, ${palette[2]}20, transparent)`,
            }}
          />

          {/* Floating 3D orbs with parallax */}
          <div
            className="hero-orb-1 absolute -top-12 -right-12 w-56 h-56 rounded-full blur-[80px] pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${palette[0]}25, transparent 70%)`,
              transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)`,
              transition: 'transform 0.3s ease-out',
            }}
          />
          <div
            className="hero-orb-2 absolute -bottom-8 -left-8 w-44 h-44 rounded-full blur-[60px] pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${palette[1]}20, transparent 70%)`,
              transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)`,
              transition: 'transform 0.3s ease-out',
            }}
          />
          <div
            className="hero-orb-3 absolute top-1/3 right-1/4 w-32 h-32 rounded-full blur-[50px] pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${palette[2]}18, transparent 70%)`,
              transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
              transition: 'transform 0.3s ease-out',
            }}
          />

          {/* Floating shadow beneath card */}
          <div
            className="hero-floating-shadow absolute -bottom-6 left-[10%] right-[10%] h-16 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(90deg, ${palette[0]}15, ${palette[1]}20, ${palette[2]}15)`,
            }}
          />

          {/* Card with glassmorphism + neon border */}
          <Link
            href={`/market/${market.id}`}
            className={cn(
              'hero-glass hero-neon-border block relative rounded-3xl p-8 cursor-pointer overflow-hidden min-h-[300px]',
              isTransitioning ? 'hero-card-enter' : ''
            )}
            style={
              {
                '--neon-1': palette[0],
                '--neon-2': palette[1],
                '--neon-3': palette[2],
              } as React.CSSProperties
            }
            draggable={false}
            aria-roledescription="slide"
            aria-label={`${activeIndex + 1} of ${trendingMarkets.length}: ${market.title}`}
          >
            {/* Particle burst on transition */}
            {isTransitioning && (
              <div className="hero-particle-burst absolute inset-0 pointer-events-none z-20">
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i / 12) * Math.PI * 2;
                  const distance = 60 + Math.random() * 40;
                  return (
                    <span
                      key={i}
                      style={
                        {
                          left: '50%',
                          top: '50%',
                          '--px': `${Math.cos(angle) * distance}px`,
                          '--py': `${Math.sin(angle) * distance}px`,
                          background: palette[i % 3],
                          animationDelay: `${Math.random() * 0.2}s`,
                        } as React.CSSProperties
                      }
                    />
                  );
                })}
              </div>
            )}

            <div className="relative z-10 flex flex-col h-full">
              {/* Category badge */}
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border"
                  style={{
                    background: `${palette[0]}15`,
                    borderColor: `${palette[0]}30`,
                    color: palette[0],
                  }}
                >
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

              {/* Stats row with animated elements */}
              <div className="flex flex-wrap items-end gap-6">
                {/* Yes price with liquid progress */}
                <div className="flex flex-col gap-2">
                  <div
                    className="flex flex-col items-center px-6 py-3 rounded-xl border"
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      borderColor: 'rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <span className="text-3xl font-bold text-emerald-400">
                      <AnimatedNumber value={market.yesPrice} suffix="¢" />
                    </span>
                    <span className="text-xs text-emerald-400/70 font-medium mb-1.5">Yes</span>
                    <div className="w-full min-w-[80px]">
                      <LiquidProgress value={market.yesPrice} color="#10b981" />
                    </div>
                  </div>
                </div>

                {/* No price with liquid progress */}
                <div className="flex flex-col gap-2">
                  <div
                    className="flex flex-col items-center px-6 py-3 rounded-xl border"
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <span className="text-3xl font-bold text-red-400">
                      <AnimatedNumber value={market.noPrice} suffix="¢" />
                    </span>
                    <span className="text-xs text-red-400/70 font-medium mb-1.5">No</span>
                    <div className="w-full min-w-[80px]">
                      <LiquidProgress value={market.noPrice} color="#ef4444" />
                    </div>
                  </div>
                </div>

                {/* Sparkline chart */}
                {market.history && market.history.length > 1 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-white/25 font-medium">
                      Price History
                    </span>
                    <Sparkline
                      data={market.history}
                      color={market.change >= 0 ? '#10b981' : '#ef4444'}
                    />
                  </div>
                )}

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

                {/* Change indicator with glow */}
                <div
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-bold',
                    market.change >= 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  )}
                  style={{
                    boxShadow:
                      market.change >= 0
                        ? '0 0 15px rgba(16, 185, 129, 0.15)'
                        : '0 0 15px rgba(239, 68, 68, 0.15)',
                  }}
                >
                  {market.change >= 0 ? '+' : ''}
                  {market.change}%
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Pagination dots with expanding rings and glow */}
        <div className="flex items-center justify-center gap-3 mt-5">
          {trendingMarkets.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={cn(
                'relative rounded-full transition-all duration-500 cursor-pointer',
                index === activeIndex
                  ? 'w-8 h-2.5'
                  : 'w-2.5 h-2.5 hover:scale-125'
              )}
              style={
                index === activeIndex
                  ? {
                      background: `linear-gradient(90deg, ${palette[0]}, ${palette[2]})`,
                      boxShadow: `0 0 12px ${palette[1]}60`,
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.15)',
                    }
              }
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            >
              {index === activeIndex && (
                <span
                  className="hero-dot-active absolute inset-0 rounded-full"
                  style={{ color: palette[1] }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
