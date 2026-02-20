'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Search,
  X,
  Trophy,
  DollarSign,
  Hash,
  ExternalLink,
  RefreshCw,
  Loader2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPredictions } from '@/hooks/use-user-predictions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioStats {
  totalValue: number;
  netPL: number;
  netPLPercent: number;
  totalVolume: number;
  biggestWin: number;
  totalTrades: number;
  activePositions: number;
  closedPositions: number;
}

interface Position {
  id: string;
  marketId: string;
  market: string;
  outcome: 'Yes' | 'No';
  shares: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pl: number;
  plPercent: number;
  status: 'active' | 'closed';
  result?: 'won' | 'lost' | 'pending';
  closedAt?: string;
}

interface PortfolioProps {
  isConnected?: boolean;
}

type TabType = 'active' | 'closed';

// ─── Empty state ──────────────────────────────────────────────────────────────

const emptyStats: PortfolioStats = {
  totalValue: 0,
  netPL: 0,
  netPLPercent: 0,
  totalVolume: 0,
  biggestWin: 0,
  totalTrades: 0,
  activePositions: 0,
  closedPositions: 0,
};

// ─── Data conversion ──────────────────────────────────────────────────────────

function predictionsToPositions(
  predictions: ReturnType<typeof useUserPredictions>['predictions']
): Position[] {
  return predictions.map((pred) => ({
    id: pred.id,
    marketId: pred.poolId,
    market: pred.poolName,
    outcome: pred.outcome,
    shares: 0,
    avgPrice: 0.5,
    currentPrice: 0.5,
    value: pred.amountUsd,
    pl: 0,
    plPercent: 0,
    status: pred.status === 'active' ? 'active' : 'closed',
    result:
      pred.status === 'won' ? 'won' : pred.status === 'lost' ? 'lost' : 'pending',
  }));
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1200) {
  const [value, setValue] = useState(0);
  const animRef = useRef<number | null>(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + (target - start) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  return value;
}

// ─── 3D Tilt Card ─────────────────────────────────────────────────────────────

function TiltCard({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(800px) rotateX(0deg) rotateY(0deg)');
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), index * 80);
    return () => clearTimeout(timer);
  }, [index]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -14;
    const rotateY = (x - 0.5) * 14;
    setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`);
    setGlarePos({ x: x * 100, y: y * 100 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTransform('perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden rounded-xl transition-opacity duration-500',
        mounted ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{
        transform,
        transition: isHovered
          ? 'transform 0.1s ease-out'
          : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease-out',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Holographic shimmer */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 0.15 : 0,
          background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(120, 200, 255, 0.5), rgba(200, 120, 255, 0.3), transparent 70%)`,
        }}
      />
      {/* Neon border glow */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          boxShadow:
            'inset 0 0 0 1px rgba(120, 180, 255, 0.25), 0 0 20px -4px rgba(100, 160, 255, 0.2)',
        }}
      />
      {children}
    </div>
  );
}

// ─── Sparkline chart ──────────────────────────────────────────────────────────

function Sparkline({
  data,
  positive,
  width = 64,
  height = 28,
}: {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (1 - (val - min) / range) * (height - padding * 2),
  }));

  // Smooth curve through points
  const d = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + point.x) / 2;
    return acc + ` C ${cx} ${prev.y}, ${cx} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  // Area path
  const areaD = `${d} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [data]);

  const color = positive ? '#4ade80' : '#f87171';
  const gradId = `spark-grad-${positive ? 'p' : 'n'}-${data.length}`;
  const glowId = `spark-glow-${positive ? 'p' : 'n'}-${data.length}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
        style={{
          strokeDasharray: pathLength || 200,
          strokeDashoffset: 0,
          animation: pathLength ? 'sparkline-draw 1.2s ease-out forwards' : undefined,
        }}
      />
      {/* Glow dot at end */}
      <circle
        cx={points[points.length - 1]?.x || 0}
        cy={points[points.length - 1]?.y || 0}
        r="2.5"
        fill={color}
        style={{
          filter: `drop-shadow(0 0 4px ${color})`,
          animation: 'sparkline-dot-pulse 2s ease-in-out infinite',
        }}
      />
    </svg>
  );
}

// ─── Circular Progress Ring ───────────────────────────────────────────────────

function ProgressRing({
  value,
  max,
  size = 48,
  strokeWidth = 4,
  gradientFrom = '#3b82f6',
  gradientTo = '#8b5cf6',
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - progress);
  const gradId = `ring-grad-${gradientFrom.replace('#', '')}`;

  return (
    <svg width={size} height={size} className="overflow-visible -rotate-90">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradientFrom} />
          <stop offset="100%" stopColor={gradientTo} />
        </linearGradient>
      </defs>
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: `drop-shadow(0 0 6px ${gradientFrom}40)`,
        }}
      />
    </svg>
  );
}

// ─── Animated Icon ────────────────────────────────────────────────────────────

function AnimatedIcon({
  icon: Icon,
  colorClass,
  isActive = false,
  positive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  isActive?: boolean;
  positive?: boolean;
}) {
  const glowColor =
    positive === true
      ? 'rgba(74, 222, 128, 0.4)'
      : positive === false
        ? 'rgba(248, 113, 113, 0.4)'
        : 'rgba(100, 160, 255, 0.3)';

  return (
    <div
      className="relative"
      style={{
        animation: isActive ? 'icon-pulse 2s ease-in-out infinite' : 'icon-float 3s ease-in-out infinite',
        filter: isActive ? `drop-shadow(0 0 8px ${glowColor})` : undefined,
      }}
    >
      <Icon className={cn('w-5 h-5 transition-all duration-300', colorClass)} />
    </div>
  );
}

// ─── Sync Button ──────────────────────────────────────────────────────────────

function SyncButton({
  onClick,
  isLoading,
  success,
}: {
  onClick: () => void;
  isLoading: boolean;
  success: boolean;
}) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden',
        showSuccess
          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
          : isLoading
            ? 'bg-white/[0.06] border border-white/[0.1] text-white/70'
            : 'bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-blue-500/20 border border-blue-500/20 text-white hover:border-blue-500/40 hover:shadow-[0_0_24px_-4px_rgba(59,130,246,0.3)]'
      )}
    >
      {/* Idle shimmer */}
      {!isLoading && !showSuccess && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            animation: 'sync-shimmer 2.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="relative w-4 h-4">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 border-r-violet-400"
            style={{ animation: 'sync-spin 0.8s linear infinite' }}
          />
        </div>
      )}

      {/* Success check */}
      {showSuccess && (
        <CheckCircle2
          className="w-4 h-4 text-emerald-400"
          style={{ animation: 'sync-check 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}
        />
      )}

      {/* Default icon */}
      {!isLoading && !showSuccess && <RefreshCw className="w-4 h-4" />}

      <span className="relative z-10">
        {showSuccess ? 'Synced' : isLoading ? 'Syncing...' : 'Sync Wallet'}
      </span>

      {/* Loading shimmer wave */}
      {isLoading && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(100,160,255,0.08), transparent)',
            animation: 'sync-wave 1.2s ease-in-out infinite',
          }}
        />
      )}
    </button>
  );
}

// ─── Stat Card Configs ────────────────────────────────────────────────────────

const statCardConfigs = [
  {
    icon: Wallet,
    iconColor: 'text-blue-400',
    gradient: 'from-blue-500/10 to-cyan-500/5',
    borderGlow: 'rgba(59, 130, 246, 0.15)',
    ringFrom: '#3b82f6',
    ringTo: '#06b6d4',
  },
  {
    icon: TrendingUp,
    iconColor: 'text-emerald-400',
    gradient: 'from-emerald-500/10 to-green-500/5',
    borderGlow: 'rgba(16, 185, 129, 0.15)',
    ringFrom: '#10b981',
    ringTo: '#4ade80',
  },
  {
    icon: Trophy,
    iconColor: 'text-yellow-400',
    gradient: 'from-yellow-500/10 to-amber-500/5',
    borderGlow: 'rgba(245, 158, 11, 0.15)',
    ringFrom: '#f59e0b',
    ringTo: '#fbbf24',
  },
  {
    icon: DollarSign,
    iconColor: 'text-violet-400',
    gradient: 'from-violet-500/10 to-purple-500/5',
    borderGlow: 'rgba(139, 92, 246, 0.15)',
    ringFrom: '#8b5cf6',
    ringTo: '#a78bfa',
  },
  {
    icon: Hash,
    iconColor: 'text-cyan-400',
    gradient: 'from-cyan-500/10 to-blue-500/5',
    borderGlow: 'rgba(6, 182, 212, 0.15)',
    ringFrom: '#06b6d4',
    ringTo: '#3b82f6',
  },
  {
    icon: Activity,
    iconColor: 'text-pink-400',
    gradient: 'from-pink-500/10 to-rose-500/5',
    borderGlow: 'rgba(236, 72, 153, 0.15)',
    ringFrom: '#ec4899',
    ringTo: '#f43f5e',
  },
];

// Fake sparkline data per card
const sparklineData = [
  [40, 42, 38, 45, 50, 48, 55, 60, 58, 65],
  [10, 15, 12, 20, 18, 25, 22, 30, 28, 35],
  [5, 8, 12, 7, 15, 20, 18, 25, 22, 30],
  [30, 35, 33, 40, 38, 45, 42, 50, 48, 55],
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [3, 2, 4, 3, 5, 4, 6, 5, 7, 6],
];

// ─── Portfolio Component ──────────────────────────────────────────────────────

export function Portfolio({ isConnected = false }: PortfolioProps) {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(false);

  const {
    predictions: userPredictions,
    isLoading: isLoadingPredictions,
    hasPredictions,
    refetch: refetchPredictions,
  } = useUserPredictions();

  const realPositions = useMemo(
    () => predictionsToPositions(userPredictions),
    [userPredictions]
  );

  const activePositions = realPositions.filter((p) => p.status === 'active');
  const closedPositions = realPositions.filter((p) => p.status === 'closed');

  const stats = useMemo(() => {
    if (!hasPredictions) return emptyStats;
    const totalValue = realPositions.reduce((sum, p) => sum + p.value, 0);
    return {
      totalValue,
      netPL: 0,
      netPLPercent: 0,
      totalVolume: totalValue,
      biggestWin: 0,
      totalTrades: realPositions.length,
      activePositions: activePositions.length,
      closedPositions: closedPositions.length,
    };
  }, [hasPredictions, realPositions, activePositions.length, closedPositions.length]);

  const filteredPositions = useMemo(() => {
    const positions = activeTab === 'active' ? activePositions : closedPositions;
    if (!searchQuery.trim()) return positions;
    const query = searchQuery.toLowerCase();
    return positions.filter(
      (position) =>
        position.market.toLowerCase().includes(query) ||
        position.outcome.toLowerCase().includes(query)
    );
  }, [activeTab, searchQuery, activePositions, closedPositions]);

  // Count-up animated values
  const animTotalValue = useCountUp(stats.totalValue);
  const animNetPL = useCountUp(stats.netPL);
  const animBiggestWin = useCountUp(stats.biggestWin);
  const animVolume = useCountUp(stats.totalVolume);
  const animTrades = useCountUp(stats.totalTrades);
  const animActive = useCountUp(stats.activePositions);

  const handleSync = useCallback(() => {
    setSyncSuccess(false);
    refetchPredictions();
    // Simulate success after a short delay
    setTimeout(() => setSyncSuccess(true), 1500);
  }, [refetchPredictions]);

  const statCards = [
    {
      label: 'Portfolio Value',
      value: `$${animTotalValue.toFixed(2)}`,
      rawValue: stats.totalValue,
      maxValue: 10000,
      valueClass: 'text-white',
      positive: true,
    },
    {
      label: 'Net P&L',
      value: `${stats.netPL >= 0 ? '+' : ''}$${animNetPL.toFixed(2)}`,
      rawValue: Math.abs(stats.netPL),
      maxValue: 5000,
      valueClass: stats.netPL >= 0 ? 'text-emerald-400' : 'text-red-400',
      sub: `(${stats.netPLPercent >= 0 ? '+' : ''}${stats.netPLPercent.toFixed(1)}%)`,
      subClass: stats.netPL >= 0 ? 'text-emerald-400/70' : 'text-red-400/70',
      positive: stats.netPL >= 0,
    },
    {
      label: 'Biggest Win',
      value: `+$${animBiggestWin.toFixed(2)}`,
      rawValue: stats.biggestWin,
      maxValue: 2000,
      valueClass: 'text-yellow-400',
      positive: true,
    },
    {
      label: 'Volume Traded',
      value: `$${animVolume.toFixed(2)}`,
      rawValue: stats.totalVolume,
      maxValue: 50000,
      valueClass: 'text-white',
      positive: true,
    },
    {
      label: 'Total Trades',
      value: `${Math.round(animTrades)}`,
      rawValue: stats.totalTrades,
      maxValue: 100,
      valueClass: 'text-white',
      positive: true,
    },
    {
      label: 'Active',
      value: `${Math.round(animActive)}`,
      rawValue: stats.activePositions,
      maxValue: Math.max(stats.activePositions + stats.closedPositions, 1),
      valueClass: 'text-white',
      sub: 'positions',
      subClass: 'text-[hsl(230,10%,40%)]',
      positive: true,
    },
  ];

  return (
    <>
      {/* Keyframe animations injected inline */}
      <style jsx global>{`
        @keyframes sparkline-draw {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes sparkline-dot-pulse {
          0%, 100% { opacity: 1; r: 2.5; }
          50% { opacity: 0.6; r: 3.5; }
        }
        @keyframes icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes icon-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes sync-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes sync-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes sync-check {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes sync-wave {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes row-enter {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes header-slide {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
        }
        @keyframes pl-flash {
          0% { background-color: transparent; }
          20% { background-color: rgba(74, 222, 128, 0.08); }
          100% { background-color: transparent; }
        }
        @keyframes pl-flash-neg {
          0% { background-color: transparent; }
          20% { background-color: rgba(248, 113, 113, 0.08); }
          100% { background-color: transparent; }
        }
      `}</style>

      <div style={{ animation: 'header-slide 0.5s ease-out forwards' }}>
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Portfolio
              </h1>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20"
                style={{ animation: 'badge-pulse 2s ease-in-out infinite' }}
              >
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Live</span>
              </div>
            </div>
            <p className="text-[hsl(230,10%,50%)] text-lg">
              Track your predictions and performance across all markets.
            </p>
            {!hasPredictions && isConnected && !isLoadingPredictions && (
              <p className="text-[hsl(230,10%,35%)] text-sm mt-2">
                Sync your wallet to load your predictions.
              </p>
            )}
          </div>

          {isConnected && (
            <SyncButton
              onClick={handleSync}
              isLoading={isLoadingPredictions}
              success={syncSuccess}
            />
          )}
        </div>

        {/* ── Stat Cards Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((card, i) => {
            const cfg = statCardConfigs[i];
            const IconComponent =
              i === 1 ? (stats.netPL >= 0 ? TrendingUp : TrendingDown) : cfg.icon;
            const iconColor =
              i === 1
                ? stats.netPL >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
                : cfg.iconColor;

            return (
              <TiltCard key={card.label} index={i}>
                <div
                  className={cn(
                    'relative border border-white/[0.06] rounded-xl p-4 h-full',
                    'bg-gradient-to-br',
                    cfg.gradient,
                    'backdrop-blur-sm'
                  )}
                  style={{
                    boxShadow: `0 0 0 0 ${cfg.borderGlow}`,
                    transition: 'box-shadow 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 24px -4px ${cfg.borderGlow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 0 ${cfg.borderGlow}`;
                  }}
                >
                  {/* Top row: icon + sparkline */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AnimatedIcon
                        icon={IconComponent}
                        colorClass={iconColor}
                        isActive={card.rawValue > 0}
                        positive={card.positive}
                      />
                      <span className="text-xs font-medium text-[hsl(230,10%,45%)]">
                        {card.label}
                      </span>
                    </div>
                    <Sparkline
                      data={sparklineData[i]}
                      positive={card.positive}
                      width={48}
                      height={20}
                    />
                  </div>

                  {/* Value with count-up */}
                  <div className={cn('text-xl font-bold font-mono tracking-tight', card.valueClass)}>
                    {card.value}
                  </div>

                  {/* Sub-label or trend arrow */}
                  {card.sub ? (
                    <div className="flex items-center gap-1 mt-1">
                      {i === 1 && (
                        <span
                          style={{
                            animation: 'row-enter 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                          }}
                        >
                          {stats.netPL >= 0 ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-red-400" />
                          )}
                        </span>
                      )}
                      <span className={cn('text-xs', card.subClass)}>{card.sub}</span>
                    </div>
                  ) : null}

                  {/* Progress ring in corner */}
                  <div className="absolute top-3 right-3 opacity-40">
                    <ProgressRing
                      value={card.rawValue}
                      max={card.maxValue}
                      size={28}
                      strokeWidth={2.5}
                      gradientFrom={cfg.ringFrom}
                      gradientTo={cfg.ringTo}
                    />
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>

        {/* ── Positions Section ──────────────────────────────────────────── */}
        <div
          className="relative border border-white/[0.06] rounded-2xl overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,15,25,0.8) 0%, rgba(10,10,20,0.6) 100%)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Tabs and Search */}
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1">
                {(['active', 'closed'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                      activeTab === tab
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-[hsl(230,10%,45%)] hover:text-white'
                    )}
                  >
                    {tab === 'active' ? 'Active' : 'Closed'}
                    <span
                      className={cn(
                        'ml-2 px-1.5 py-0.5 rounded text-xs transition-colors duration-200',
                        activeTab === tab
                          ? tab === 'active'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-white/[0.08] text-white/70'
                          : 'bg-white/[0.06] text-[hsl(230,10%,40%)]'
                      )}
                      style={
                        activeTab === tab && tab === 'active'
                          ? { animation: 'badge-pulse 2s ease-in-out infinite' }
                          : undefined
                      }
                    >
                      {tab === 'active' ? stats.activePositions : stats.closedPositions}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72 sm:mx-auto group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(230,10%,40%)] transition-colors group-focus-within:text-blue-400" />
                <input
                  type="text"
                  placeholder="Search positions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder:text-[hsl(230,10%,40%)] focus:outline-none focus:border-blue-500/30 focus:shadow-[0_0_12px_-4px_rgba(59,130,246,0.2)] transition-all duration-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(230,10%,40%)] hover:text-white/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Positions Table */}
          {!isConnected ? (
            <div className="px-6 py-16 text-center">
              <div
                className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4"
                style={{
                  animation: 'icon-float 3s ease-in-out infinite',
                  boxShadow: '0 0 30px -8px rgba(59, 130, 246, 0.15)',
                }}
              >
                <Wallet className="w-8 h-8 text-[hsl(230,10%,35%)]" />
              </div>
              <p className="text-[hsl(230,10%,50%)] mb-2">
                Connect your wallet to view positions
              </p>
              <p className="text-sm text-[hsl(230,10%,35%)]">
                Your portfolio data will appear here
              </p>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div
                className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4"
                style={{ animation: 'icon-float 3s ease-in-out infinite' }}
              >
                {!hasPredictions && !searchQuery ? (
                  <RefreshCw className="w-8 h-8 text-[hsl(230,10%,35%)]" />
                ) : (
                  <BarChart3 className="w-8 h-8 text-[hsl(230,10%,35%)]" />
                )}
              </div>
              <p className="text-[hsl(230,10%,50%)] mb-2">
                {searchQuery
                  ? 'No positions match your search'
                  : !hasPredictions
                    ? 'No predictions loaded yet'
                    : `No ${activeTab} positions`}
              </p>
              <p className="text-sm text-[hsl(230,10%,35%)] mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : !hasPredictions
                    ? 'Sync your wallet to load your on-chain predictions.'
                    : 'Start trading to see your positions here'}
              </p>
              {!hasPredictions && !searchQuery && (
                <SyncButton
                  onClick={handleSync}
                  isLoading={isLoadingPredictions}
                  success={syncSuccess}
                />
              )}
            </div>
          ) : (
            <div className="overflow-x-auto scroll-hint">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-[hsl(230,10%,40%)] uppercase tracking-wider bg-white/[0.02]">
                    <th className="px-6 py-3">Market</th>
                    <th className="px-6 py-3">Outcome</th>
                    <th className="px-6 py-3 text-right">Avg Price</th>
                    {activeTab === 'active' && (
                      <th className="px-6 py-3 text-right">Current</th>
                    )}
                    <th className="px-6 py-3 text-right">Value</th>
                    <th className="px-6 py-3 text-right">P/L</th>
                    {activeTab === 'closed' && (
                      <th className="px-6 py-3 text-center">Result</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPositions.map((position, idx) => (
                    <tr
                      key={position.id}
                      className="group transition-all duration-200 hover:bg-white/[0.03]"
                      style={{
                        animation: `row-enter 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) ${idx * 50}ms both`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          '0 0 20px -8px rgba(100, 160, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/market/${position.marketId}`}
                          className="flex items-center gap-2 text-sm text-white font-medium max-w-xs hover:text-blue-400 transition-colors"
                        >
                          <span className="truncate">{position.market}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </Link>
                        {activeTab === 'closed' && position.closedAt && (
                          <div className="text-xs text-[hsl(230,10%,35%)] mt-1">
                            Closed {position.closedAt}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200',
                            position.outcome === 'Yes'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-white/[0.06] text-white/70 border border-white/[0.08]'
                          )}
                        >
                          {position.outcome}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[hsl(230,10%,50%)] text-right font-mono">
                        {(position.avgPrice * 100).toFixed(0)}&cent;
                      </td>
                      {activeTab === 'active' && (
                        <td className="px-6 py-4 text-sm text-white text-right font-mono">
                          {(position.currentPrice * 100).toFixed(0)}&cent;
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-white text-right font-mono font-medium">
                        ${position.value.toFixed(2)}
                      </td>
                      <td
                        className={cn(
                          'px-6 py-4 text-sm text-right font-mono font-medium rounded-r-lg transition-colors',
                          position.pl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}
                        style={{
                          background:
                            position.pl > 0
                              ? 'linear-gradient(90deg, transparent 0%, rgba(74, 222, 128, 0.04) 100%)'
                              : position.pl < 0
                                ? 'linear-gradient(90deg, transparent 0%, rgba(248, 113, 113, 0.04) 100%)'
                                : undefined,
                        }}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {position.pl > 0 && (
                            <ArrowUpRight
                              className="w-3 h-3"
                              style={{
                                animation:
                                  'row-enter 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                              }}
                            />
                          )}
                          {position.pl < 0 && (
                            <ArrowDownRight
                              className="w-3 h-3"
                              style={{
                                animation:
                                  'row-enter 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                              }}
                            />
                          )}
                          <span>
                            {position.pl >= 0 ? '+' : ''}${position.pl.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs opacity-70">
                          ({position.plPercent >= 0 ? '+' : ''}
                          {position.plPercent.toFixed(1)}%)
                        </div>
                      </td>
                      {activeTab === 'closed' && (
                        <td className="px-6 py-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold',
                              position.result === 'won'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : position.result === 'lost'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-white/[0.06] text-[hsl(230,10%,50%)] border border-white/[0.08]'
                            )}
                            style={
                              position.result === 'pending'
                                ? { animation: 'badge-pulse 2s ease-in-out infinite' }
                                : undefined
                            }
                          >
                            {position.result === 'won' && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {position.result === 'won'
                              ? 'Won'
                              : position.result === 'lost'
                                ? 'Lost'
                                : 'Pending'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
