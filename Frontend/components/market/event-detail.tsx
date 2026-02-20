'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  BarChart3,
  Activity as ActivityIcon,
  ChevronDown,
  Zap,
  Eye,
} from 'lucide-react';
import { Market, Activity } from '@/types';
import { Badge } from '@/components/ui';
import { TradingPanel } from './trading-panel';
import { ActivityFeed } from './activity-feed';
import { formatNumber } from '@/lib/utils';
import { useOnChainPool } from '@/hooks/use-on-chain-pool';

interface EventDetailProps {
  market: Market;
  activities: Activity[];
  onBack: () => void;
}

// Animated count-up hook
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    let rafId: number;

    function tick(timestamp: number) {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}

export function EventDetail({ market, activities, onBack }: EventDetailProps) {
  const isPositive = market.change >= 0;
  const { pool: onChainPool } = useOnChainPool(market.id);
  const [activeTab, setActiveTab] = useState<'chart' | 'activity' | 'about'>('chart');
  const [heroReady, setHeroReady] = useState(false);
  const tabIndicatorRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const traderCount = onChainPool ? onChainPool.total_no_of_stakes : market.traders;
  const volume = onChainPool
    ? `${(onChainPool.total_staked / 1_000_000).toFixed(2)} ALEO`
    : market.volume;

  const animatedTraders = useCountUp(traderCount);

  useEffect(() => {
    const timer = setTimeout(() => setHeroReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animate tab indicator to follow active tab
  const setTabRef = useCallback((key: string) => (el: HTMLButtonElement | null) => {
    if (el) tabsRef.current.set(key, el);
  }, []);

  useEffect(() => {
    const activeEl = tabsRef.current.get(activeTab);
    const indicator = tabIndicatorRef.current;
    if (activeEl && indicator) {
      const parent = activeEl.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();
        indicator.style.left = `${elRect.left - parentRect.left}px`;
        indicator.style.width = `${elRect.width}px`;
      }
    }
  }, [activeTab]);

  return (
    <div className="animate-fade-in">
      {/* Back Button with hover slide + glow */}
      <button
        onClick={onBack}
        className="group flex items-center gap-2 text-[hsl(230,10%,50%)] hover:text-white mb-8 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]"
      >
        <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1.5" />
        <span className="text-sm font-medium">Back to Markets</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Glass Card with Holographic Border */}
          <div
            className={`relative overflow-hidden rounded-2xl transition-all duration-700 ${
              heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Holographic border effect */}
            <div className="absolute inset-0 rounded-2xl p-[1px] overflow-hidden">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.3), rgba(236,72,153,0.2), rgba(34,211,238,0.3), rgba(99,102,241,0.4))',
                  backgroundSize: '300% 300%',
                  animation: 'holoBorder 6s ease-in-out infinite',
                }}
              />
            </div>

            {/* Card interior */}
            <div className="relative bg-[hsl(230,15%,8%)]/95 backdrop-blur-xl m-[1px] rounded-2xl p-6 md:p-8">
              {/* Animated background gradient */}
              <div
                className="absolute inset-0 rounded-2xl opacity-30"
                style={{
                  background: isPositive
                    ? 'radial-gradient(ellipse at 20% 50%, rgba(34,197,94,0.08), transparent 60%)'
                    : 'radial-gradient(ellipse at 20% 50%, rgba(239,68,68,0.08), transparent 60%)',
                }}
              />

              {/* Top gradient accent line */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <Badge>{market.category}</Badge>
                  <div className="flex items-center gap-4">
                    {market.status === 'live' && <PulseRingIndicator />}
                    <span
                      className={`text-sm font-medium flex items-center gap-1 ${
                        isPositive ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {isPositive ? '+' : ''}
                      {market.change}% today
                    </span>
                  </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                  {market.title}
                </h1>
                <p className="text-[hsl(230,10%,50%)] text-lg mb-6">{market.subtitle}</p>

                {/* Stats Row with Animated Count-up + Glow */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <StatPill
                    icon={<Clock className="w-4 h-4" />}
                    label={`Ends ${market.endDate}`}
                  />
                  <StatPill
                    icon={<Users className="w-4 h-4" />}
                    label={`${formatNumber(animatedTraders)} traders`}
                    glow
                  />
                  <StatPill
                    icon={<BarChart3 className="w-4 h-4" />}
                    label={`${volume} volume`}
                    glow
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs with Neon Underline + Magnetic Easing */}
          <div className="relative">
            <div className="flex gap-1 relative border-b border-white/[0.06] pb-[1px]">
              {(['chart', 'activity', 'about'] as const).map((tab) => (
                <button
                  key={tab}
                  ref={setTabRef(tab)}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-3 text-sm font-medium capitalize transition-colors duration-300 ${
                    activeTab === tab
                      ? 'text-white'
                      : 'text-[hsl(230,10%,45%)] hover:text-[hsl(230,10%,65%)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {tab === 'chart' && <BarChart3 className="w-4 h-4" />}
                    {tab === 'activity' && <ActivityIcon className="w-4 h-4" />}
                    {tab === 'about' && <Eye className="w-4 h-4" />}
                    {tab === 'chart' ? 'Price Chart' : tab === 'activity' ? 'Activity' : 'About'}
                  </span>
                </button>
              ))}

              {/* Neon underline indicator */}
              <div
                ref={tabIndicatorRef}
                className="absolute bottom-0 h-[2px] transition-all duration-500"
                style={{
                  transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              >
                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full blur-sm opacity-60" />
              </div>
            </div>

            {/* Tab Content with Cross-fade */}
            <div className="mt-6 relative">
              <TabContent active={activeTab === 'chart'}>
                <AnimatedPriceChart data={market.history} isPositive={isPositive} />
              </TabContent>
              <TabContent active={activeTab === 'activity'}>
                <ActivityFeed activities={activities} />
              </TabContent>
              <TabContent active={activeTab === 'about'}>
                <AboutSection description={market.description} resolution={market.resolution} />
              </TabContent>
            </div>
          </div>

          {/* Social Proof Bar */}
          <SocialProofBar
            traderCount={animatedTraders}
            activities={activities}
            yesPrice={market.yesPrice}
            noPrice={market.noPrice}
          />
        </div>

        {/* Trading Panel */}
        <div className="lg:col-span-1">
          <TradingPanel market={market} />
        </div>
      </div>

      {/* Keyframe styles for holographic border */}
      <style jsx>{`
        @keyframes holoBorder {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
}

// -- Sub-components --

function PulseRingIndicator() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
      </span>
      Live Market
    </span>
  );
}

function StatPill({
  icon,
  label,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  glow?: boolean;
}) {
  return (
    <span
      className={`flex items-center gap-2 text-[hsl(230,10%,45%)] transition-all duration-300 ${
        glow ? 'hover:text-[hsl(230,10%,70%)] hover:drop-shadow-[0_0_6px_rgba(99,102,241,0.3)]' : ''
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

function TabContent({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`transition-all duration-400 ${
        active
          ? 'opacity-100 translate-y-0 scale-100 relative'
          : 'opacity-0 translate-y-2 scale-[0.98] absolute inset-0 pointer-events-none'
      }`}
    >
      {children}
    </div>
  );
}

function AnimatedPriceChart({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const [drawn, setDrawn] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDrawn(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 100;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${padding},${height - padding} ${linePoints} ${width - padding},${height - padding}`;

  const strokeColor = isPositive ? '#4ade80' : '#f87171';
  const gradientId = `chartGrad-${isPositive ? 'pos' : 'neg'}`;

  // Calculate the total path length for animation
  const pathLength = points.reduce((acc, point, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    return acc + Math.sqrt((point.x - prev.x) ** 2 + (point.y - prev.y) ** 2);
  }, 0);

  // Price axis labels
  const priceLabels = [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max].map(
    (v) => v.toFixed(0)
  );

  return (
    <div className="bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-violet-500 rounded-full" />
          Price History
        </h3>
        <span className="text-xs text-[hsl(230,10%,40%)]">Last 30 days</span>
      </div>

      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-[hsl(230,10%,35%)] font-mono pr-2 py-1">
          {priceLabels.reverse().map((label, i) => (
            <span key={i}>{label}%</span>
          ))}
        </div>

        <div className="ml-8">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-48"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
              </linearGradient>
              <filter id="chartGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((frac) => (
              <line
                key={frac}
                x1={padding}
                x2={width - padding}
                y1={padding + frac * (height - padding * 2)}
                y2={padding + frac * (height - padding * 2)}
                stroke="white"
                strokeOpacity="0.04"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* Area fill with shimmer */}
            <polygon
              points={areaPoints}
              fill={`url(#${gradientId})`}
              className={`transition-opacity duration-1000 ${drawn ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Animated chart line with glow */}
            <polyline
              points={linePoints}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              filter="url(#chartGlow)"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: pathLength,
                strokeDashoffset: drawn ? 0 : pathLength,
                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </svg>
        </div>
      </div>

      {/* Current Price Indicator */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-[hsl(230,10%,45%)]">Current Price</span>
        </div>
        <span className="text-sm font-mono font-semibold text-white">
          {data[data.length - 1]}%
        </span>
      </div>
    </div>
  );
}

function AboutSection({ description, resolution }: { description: string; resolution: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 hover:border-white/[0.1]">
      <p
        className={`text-[hsl(230,10%,50%)] leading-relaxed mb-6 transition-all duration-500 ${
          expanded ? '' : 'line-clamp-3'
        }`}
      >
        {description}
      </p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors mb-6 flex items-center gap-1"
      >
        {expanded ? 'Show less' : 'Read more'}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-violet-500 rounded-full" />
        Resolution Criteria
      </h3>
      <p className="text-[hsl(230,10%,40%)] text-sm leading-relaxed">{resolution}</p>
    </div>
  );
}

function SocialProofBar({
  traderCount,
  activities,
  yesPrice,
  noPrice,
}: {
  traderCount: number;
  activities: Activity[];
  yesPrice: number;
  noPrice: number;
}) {
  const totalSentiment = yesPrice + noPrice;
  const bullishPct = totalSentiment > 0 ? (yesPrice / totalSentiment) * 100 : 50;

  return (
    <div className="bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Trader Count with Pulse */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-blue-500/10 animate-ping opacity-30" />
          </div>
          <div>
            <p className="text-xs text-[hsl(230,10%,45%)]">Active Traders</p>
            <p className="text-lg font-bold text-white font-mono">
              {formatNumber(traderCount)}
            </p>
          </div>
        </div>

        {/* Recent Activity Ticker */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-[hsl(230,10%,45%)]">Recent Trades</p>
            <p className="text-lg font-bold text-white font-mono">{activities.length}</p>
          </div>
        </div>

        {/* Sentiment Liquid Fill */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[hsl(230,10%,45%)]">Market Sentiment</span>
            <span className="text-xs font-mono text-white">{bullishPct.toFixed(0)}% Bullish</span>
          </div>
          <div className="relative h-3 bg-[hsl(230,15%,12%)] rounded-full overflow-hidden">
            {/* Bullish fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${bullishPct}%`,
                background: 'linear-gradient(90deg, #22c55e, #4ade80)',
              }}
            />
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmerSlide 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmerSlide {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
