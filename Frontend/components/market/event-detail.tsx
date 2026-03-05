'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  BarChart3,
  ChevronDown,
  Zap,
  Eye,
} from 'lucide-react';
import { Market } from '@/types';
import { Badge } from '@/components/ui';
import { TradingPanel } from './trading-panel';
import { formatNumber } from '@/lib/utils';
import { useOnChainPool } from '@/hooks/use-on-chain-pool';

interface EventDetailProps {
  market: Market;
  onBack: () => void;
}

export function EventDetail({ market, onBack }: EventDetailProps) {
  const isPositive = market.change >= 0;
  const { pool: onChainPool } = useOnChainPool(market.id);
  const [activeTab, setActiveTab] = useState<'chart' | 'about'>('chart');
  const tabIndicatorRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const traderCount = onChainPool ? onChainPool.total_no_of_stakes : market.traders;
  const volume = onChainPool
    ? `${(onChainPool.total_staked / 1_000_000).toFixed(2)} ALEO`
    : market.volume;

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
      {/* Back Button */}
      <button
        onClick={onBack}
        className="group flex items-center gap-2 text-[hsl(230,10%,50%)] hover:text-white mb-8 transition-colors duration-200"
      >
        <ArrowLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1" />
        <span className="text-sm font-medium">Back to Markets</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Card */}
          <div className="relative overflow-hidden rounded-2xl bg-[hsl(230,15%,8%)]/95 backdrop-blur-xl border border-white/[0.06] p-6 md:p-8">
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <Badge>{market.category}</Badge>
                <div className="flex items-center gap-4">
                  {market.status === 'live' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                      </span>
                      Live Market
                    </span>
                  )}
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

              {/* Stats Row */}
              <div className="flex flex-wrap gap-6 text-sm">
                <span className="flex items-center gap-2 text-[hsl(230,10%,45%)]">
                  <Clock className="w-4 h-4" />
                  Ends {market.endDate}
                </span>
                <span className="flex items-center gap-2 text-[hsl(230,10%,45%)]">
                  <Users className="w-4 h-4" />
                  {formatNumber(traderCount)} traders
                </span>
                <span className="flex items-center gap-2 text-[hsl(230,10%,45%)]">
                  <BarChart3 className="w-4 h-4" />
                  {volume} volume
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="relative">
            <div className="flex gap-1 relative border-b border-white/[0.06] pb-[1px]">
              {(['chart', 'about'] as const).map((tab) => (
                <button
                  key={tab}
                  ref={setTabRef(tab)}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-3 text-sm font-medium capitalize transition-colors duration-200 ${
                    activeTab === tab
                      ? 'text-white'
                      : 'text-[hsl(230,10%,45%)] hover:text-[hsl(230,10%,65%)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {tab === 'chart' && <BarChart3 className="w-4 h-4" />}
                    {tab === 'about' && <Eye className="w-4 h-4" />}
                    {tab === 'chart' ? 'Price Chart' : 'About'}
                  </span>
                </button>
              ))}

              {/* Tab indicator */}
              <div
                ref={tabIndicatorRef}
                className="absolute bottom-0 h-[2px] transition-all duration-300 bg-blue-500 rounded-full"
              />
            </div>

            {/* Tab Content */}
            <div className="mt-6 relative">
              <TabContent active={activeTab === 'chart'}>
                <PriceChart data={market.history} isPositive={isPositive} />
              </TabContent>
              <TabContent active={activeTab === 'about'}>
                <AboutSection description={market.description} resolution={market.resolution} />
              </TabContent>
            </div>
          </div>

          {/* Social Proof Bar */}
          <SocialProofBar
            traderCount={traderCount}
            yesPrice={market.yesPrice}
            noPrice={market.noPrice}
            oddsRevealed={market.oddsRevealed}
          />
        </div>

        {/* Trading Panel */}
        <div className="lg:col-span-1">
          <TradingPanel market={market} />
        </div>
      </div>
    </div>
  );
}

// -- Sub-components --

function TabContent({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`transition-opacity duration-300 ${
        active
          ? 'opacity-100 relative'
          : 'opacity-0 absolute inset-0 pointer-events-none'
      }`}
    >
      {children}
    </div>
  );
}

function PriceChart({ data, isPositive }: { data: number[]; isPositive: boolean }) {
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
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-48"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
              </linearGradient>
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

            {/* Area fill */}
            <polygon points={areaPoints} fill={`url(#${gradientId})`} />

            {/* Chart line */}
            <polyline
              points={linePoints}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
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
    <div className="bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
      <p
        className={`text-[hsl(230,10%,50%)] leading-relaxed mb-6 ${
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
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
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
  yesPrice,
  noPrice,
  oddsRevealed,
}: {
  traderCount: number;
  yesPrice: number;
  noPrice: number;
  oddsRevealed: boolean;
}) {
  const totalSentiment = yesPrice + noPrice;
  const bullishPct = totalSentiment > 0 ? (yesPrice / totalSentiment) * 100 : 50;

  return (
    <div className="bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Trader Count */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-[hsl(230,10%,45%)]">Total Predictions</p>
            <p className="text-lg font-bold text-white font-mono">
              {formatNumber(traderCount)}
            </p>
          </div>
        </div>

        {/* Sentiment Bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[hsl(230,10%,45%)]">Market Sentiment</span>
            {oddsRevealed ? (
              <span className="text-xs font-mono text-white">{bullishPct.toFixed(0)}% Bullish</span>
            ) : (
              <span className="text-xs font-mono text-amber-400/70">Hidden</span>
            )}
          </div>
          <div className="relative h-3 bg-[hsl(230,15%,12%)] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: oddsRevealed ? `${bullishPct}%` : '50%',
                background: oddsRevealed
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, #78716c, #a8a29e)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
