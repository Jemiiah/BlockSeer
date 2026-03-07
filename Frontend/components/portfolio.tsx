'use client';

import { useState, useMemo, useCallback } from 'react';
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
  tokenSymbol: string;
  isCancelled: boolean;
  isClaimable: boolean;
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
  return predictions.map((pred) => {
    const isResolved = pred.marketStatus === 'resolved';
    const status: 'active' | 'closed' = isResolved ? 'closed' : 'active';

    let result: 'won' | 'lost' | 'pending';
    if (!isResolved) {
      result = 'pending';
    } else if (pred.profit > 0) {
      result = 'won';
    } else {
      result = 'lost';
    }

    const value = isResolved
      ? Math.max(0, pred.amount + pred.profit)
      : pred.amount;

    return {
      id: pred.id,
      marketId: pred.poolId,
      market: pred.marketTitle,
      outcome: pred.outcome,
      shares: 0,
      avgPrice: 0.5,
      currentPrice: 0.5,
      value,
      pl: pred.profit,
      plPercent: pred.profitPercent,
      status,
      result,
      tokenSymbol: pred.tokenSymbol,
      isCancelled: pred.isCancelled,
      isClaimable: pred.isClaimable,
    };
  });
}

// ─── Stat Card Configs ────────────────────────────────────────────────────────

const statCardConfigs = [
  { icon: Wallet, iconColor: 'text-[#4b8cff]' },
  { icon: TrendingUp, iconColor: 'text-[#00c278]' },
  { icon: Trophy, iconColor: 'text-yellow-400' },
  { icon: DollarSign, iconColor: 'text-violet-400' },
  { icon: Hash, iconColor: 'text-cyan-400' },
  { icon: Activity, iconColor: 'text-pink-400' },
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

    const totalStaked = userPredictions.reduce((sum, p) => sum + p.amount, 0);
    const totalValue = realPositions.reduce((sum, p) => sum + p.value, 0);
    const netPL = realPositions.reduce((sum, p) => sum + p.pl, 0);
    const netPLPercent = totalStaked > 0 ? (netPL / totalStaked) * 100 : 0;
    const biggestWin = realPositions.reduce(
      (max, p) => (p.pl > max ? p.pl : max),
      0
    );

    return {
      totalValue,
      netPL,
      netPLPercent,
      totalVolume: totalStaked,
      biggestWin,
      totalTrades: realPositions.length,
      activePositions: activePositions.length,
      closedPositions: closedPositions.length,
    };
  }, [hasPredictions, userPredictions, realPositions, activePositions.length, closedPositions.length]);

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

  const handleSync = useCallback(() => {
    setSyncSuccess(false);
    refetchPredictions();
    setTimeout(() => setSyncSuccess(true), 1500);
  }, [refetchPredictions]);

  const primaryToken = userPredictions.length > 0 ? userPredictions[0].tokenSymbol : 'ALEO';

  const statCards = [
    { label: 'Total Staked', value: `${stats.totalValue.toFixed(2)} ${primaryToken}`, valueClass: 'text-white' },
    {
      label: 'Net P&L',
      value: `${stats.netPL >= 0 ? '+' : ''}${stats.netPL.toFixed(2)} ${primaryToken}`,
      valueClass: stats.netPL >= 0 ? 'text-[#00c278]' : 'text-[#ff4d4d]',
      sub: `(${stats.netPLPercent >= 0 ? '+' : ''}${stats.netPLPercent.toFixed(1)}%)`,
      subClass: stats.netPL >= 0 ? 'text-[#00c278]/70' : 'text-[#ff4d4d]/70',
    },
    { label: 'Biggest Win', value: `+${stats.biggestWin.toFixed(2)} ${primaryToken}`, valueClass: 'text-yellow-400' },
    { label: 'Volume Traded', value: `${stats.totalVolume.toFixed(2)} ${primaryToken}`, valueClass: 'text-white' },
    { label: 'Total Trades', value: `${stats.totalTrades}`, valueClass: 'text-white' },
    {
      label: 'Active',
      value: `${stats.activePositions}`,
      valueClass: 'text-white',
      sub: 'positions',
      subClass: 'text-[#5a5c66]',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Portfolio</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#4b8cff]/10 border border-[#4b8cff]/20">
              <Zap className="w-3 h-3 text-[#4b8cff]" />
              <span className="text-xs font-medium text-[#4b8cff]">Live</span>
            </div>
          </div>
          <p className="text-[#8b8d97] text-lg">
            Track your predictions and performance across all markets.
          </p>
          {!hasPredictions && isConnected && !isLoadingPredictions && (
            <p className="text-[#5a5c66] text-sm mt-2">
              Sync your wallet to load your predictions.
            </p>
          )}
        </div>

        {isConnected && (
          <button
            onClick={handleSync}
            disabled={isLoadingPredictions}
            className={cn(
              'flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200',
              syncSuccess
                ? 'bg-[#00c278]/20 border border-[#00c278]/30 text-[#00c278]'
                : isLoadingPredictions
                  ? 'bg-[#1c1f2a] border border-[#23262f] text-[#8b8d97]'
                  : 'bg-[#4b8cff]/20 border border-[#4b8cff]/20 text-white hover:border-[#4b8cff]/40'
            )}
          >
            {isLoadingPredictions ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : syncSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-[#00c278]" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncSuccess ? 'Synced' : isLoadingPredictions ? 'Syncing...' : 'Sync Wallet'}
          </button>
        )}
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((card, i) => {
          const cfg = statCardConfigs[i];
          const IconComponent =
            i === 1 ? (stats.netPL >= 0 ? TrendingUp : TrendingDown) : cfg.icon;
          const iconColor =
            i === 1
              ? stats.netPL >= 0
                ? 'text-[#00c278]'
                : 'text-[#ff4d4d]'
              : cfg.iconColor;

          return (
            <div
              key={card.label}
              className="border border-[#23262f] rounded-xl p-4 bg-[#161820]"
            >
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className={cn('w-5 h-5', iconColor)} />
                <span className="text-xs font-medium text-[#8b8d97]">
                  {card.label}
                </span>
              </div>
              <div className={cn('text-xl font-bold font-mono tracking-tight', card.valueClass)}>
                {card.value}
              </div>
              {card.sub && (
                <div className="flex items-center gap-1 mt-1">
                  {i === 1 && (
                    stats.netPL >= 0
                      ? <ArrowUpRight className="w-3 h-3 text-[#00c278]" />
                      : <ArrowDownRight className="w-3 h-3 text-[#ff4d4d]" />
                  )}
                  <span className={cn('text-xs', card.subClass)}>{card.sub}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Positions Section */}
      <div className="border border-[#23262f] rounded-xl overflow-hidden bg-[#161820]">
        {/* Tabs and Search */}
        <div className="px-6 py-4 border-b border-[#23262f]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-1 bg-[#1c1f2a] rounded-lg p-1">
              {(['active', 'closed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                    activeTab === tab
                      ? 'bg-[#23262f] text-white shadow-sm'
                      : 'text-[#8b8d97] hover:text-white'
                  )}
                >
                  {tab === 'active' ? 'Active' : 'Closed'}
                  <span
                    className={cn(
                      'ml-2 px-1.5 py-0.5 rounded text-xs',
                      activeTab === tab
                        ? tab === 'active'
                          ? 'bg-[#4b8cff]/20 text-[#4b8cff]'
                          : 'bg-[#23262f] text-[#8b8d97]'
                        : 'bg-[#1c1f2a] text-[#5a5c66]'
                    )}
                  >
                    {tab === 'active' ? stats.activePositions : stats.closedPositions}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72 sm:mx-auto group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5c66] transition-colors group-focus-within:text-[#4b8cff]" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1c1f2a] border border-[#23262f] rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder:text-[#5a5c66] focus:outline-none focus:border-[#4b8cff]/30 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5c66] hover:text-[#8b8d97] transition-colors"
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
            <div className="w-16 h-16 rounded-xl bg-[#1c1f2a] flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-[#5a5c66]" />
            </div>
            <p className="text-[#8b8d97] mb-2">
              Connect your wallet to view positions
            </p>
            <p className="text-sm text-[#5a5c66]">
              Your portfolio data will appear here
            </p>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-xl bg-[#1c1f2a] flex items-center justify-center mx-auto mb-4">
              {!hasPredictions && !searchQuery ? (
                <RefreshCw className="w-8 h-8 text-[#5a5c66]" />
              ) : (
                <BarChart3 className="w-8 h-8 text-[#5a5c66]" />
              )}
            </div>
            <p className="text-[#8b8d97] mb-2">
              {searchQuery
                ? 'No positions match your search'
                : !hasPredictions
                  ? 'No predictions loaded yet'
                  : `No ${activeTab} positions`}
            </p>
            <p className="text-sm text-[#5a5c66] mb-4">
              {searchQuery
                ? 'Try a different search term'
                : !hasPredictions
                  ? 'Sync your wallet to load your on-chain predictions.'
                  : 'Start trading to see your positions here'}
            </p>
            {!hasPredictions && !searchQuery && (
              <button
                onClick={handleSync}
                disabled={isLoadingPredictions}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold mx-auto transition-colors',
                  isLoadingPredictions
                    ? 'bg-[#1c1f2a] border border-[#23262f] text-[#8b8d97]'
                    : 'bg-[#4b8cff]/20 border border-[#4b8cff]/20 text-white hover:border-[#4b8cff]/40'
                )}
              >
                {isLoadingPredictions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isLoadingPredictions ? 'Syncing...' : 'Sync Wallet'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto scroll-hint">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-[#5a5c66] uppercase tracking-wider bg-[#1c1f2a]">
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
              <tbody className="divide-y divide-[#23262f]">
                {filteredPositions.map((position) => (
                  <tr
                    key={position.id}
                    className="group transition-colors duration-200 hover:bg-[#1c1f2a]"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/market/${position.marketId}`}
                        className="flex items-center gap-2 text-sm text-white font-medium max-w-xs hover:text-[#4b8cff] transition-colors"
                      >
                        <span className="truncate">{position.market}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </Link>
                      {activeTab === 'closed' && position.closedAt && (
                        <div className="text-xs text-[#5a5c66] mt-1">
                          Closed {position.closedAt}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-semibold',
                          position.outcome === 'Yes'
                            ? 'bg-[#00c278]/10 text-[#00c278] border border-[#00c278]/20'
                            : 'bg-[#ff4d4d]/10 text-[#ff4d4d] border border-[#ff4d4d]/20'
                        )}
                      >
                        {position.outcome}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8b8d97] text-right font-mono">
                      {(position.avgPrice * 100).toFixed(0)}&cent;
                    </td>
                    {activeTab === 'active' && (
                      <td className="px-6 py-4 text-sm text-white text-right font-mono">
                        {(position.currentPrice * 100).toFixed(0)}&cent;
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-white text-right font-mono font-medium">
                      {position.value.toFixed(2)} {position.tokenSymbol}
                    </td>
                    <td
                      className={cn(
                        'px-6 py-4 text-sm text-right font-mono font-medium',
                        position.pl >= 0 ? 'text-[#00c278]' : 'text-[#ff4d4d]'
                      )}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {position.pl > 0 && <ArrowUpRight className="w-3 h-3" />}
                        {position.pl < 0 && <ArrowDownRight className="w-3 h-3" />}
                        <span>
                          {position.pl >= 0 ? '+' : ''}{position.pl.toFixed(2)} {position.tokenSymbol}
                        </span>
                      </div>
                      <div className="text-xs opacity-70">
                        ({position.plPercent >= 0 ? '+' : ''}
                        {position.plPercent.toFixed(1)}%)
                      </div>
                    </td>
                    {activeTab === 'closed' && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold',
                              position.isCancelled
                                ? 'bg-[#ff4d4d]/10 text-[#ff4d4d] border border-[#ff4d4d]/20'
                                : position.result === 'won'
                                  ? 'bg-[#00c278]/10 text-[#00c278] border border-[#00c278]/20'
                                  : position.result === 'lost'
                                    ? 'bg-[#ff4d4d]/10 text-[#ff4d4d] border border-[#ff4d4d]/20'
                                    : 'bg-[#1c1f2a] text-[#8b8d97] border border-[#23262f]'
                            )}
                          >
                            {position.isCancelled
                              ? 'Cancelled'
                              : position.result === 'won'
                                ? <><CheckCircle2 className="w-3 h-3" /> Won</>
                                : position.result === 'lost'
                                  ? 'Lost'
                                  : 'Pending'}
                          </span>
                          {position.isClaimable && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#00c278]/20 text-[#00c278] border border-[#00c278]/30">
                              Claimable
                            </span>
                          )}
                          {position.isCancelled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Refundable
                            </span>
                          )}
                        </div>
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
  );
}
