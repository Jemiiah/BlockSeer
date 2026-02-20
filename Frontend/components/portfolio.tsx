'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Search, X, Trophy, DollarSign, Hash, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPredictions } from '@/hooks/use-user-predictions';

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

type TabType = 'active' | 'closed';

// Convert user predictions to Position format
function predictionsToPositions(predictions: ReturnType<typeof useUserPredictions>['predictions']): Position[] {
  return predictions.map((pred, index) => ({
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
    result: pred.status === 'won' ? 'won' : pred.status === 'lost' ? 'lost' : 'pending',
  }));
}

const statCardStyles = [
  { icon: Wallet, iconColor: 'text-blue-400', bg: 'bg-blue-500/[0.04]' },
  { icon: TrendingUp, iconColor: 'text-emerald-400', bg: 'bg-emerald-500/[0.04]' },
  { icon: Trophy, iconColor: 'text-yellow-400', bg: 'bg-yellow-500/[0.04]' },
  { icon: DollarSign, iconColor: 'text-violet-400', bg: 'bg-violet-500/[0.04]' },
  { icon: Hash, iconColor: 'text-blue-400', bg: 'bg-blue-500/[0.04]' },
  { icon: BarChart3, iconColor: 'text-blue-400', bg: 'bg-blue-500/[0.04]' },
];

export function Portfolio({ isConnected = false }: PortfolioProps) {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real predictions from the user's wallet
  const {
    predictions: userPredictions,
    isLoading: isLoadingPredictions,
    hasPredictions,
    refetch: refetchPredictions,
  } = useUserPredictions();

  // Convert predictions to positions
  const realPositions = useMemo(() => predictionsToPositions(userPredictions), [userPredictions]);

  const activePositions = realPositions.filter((p) => p.status === 'active');
  const closedPositions = realPositions.filter((p) => p.status === 'closed');

  // Calculate stats from real data
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

    if (!searchQuery.trim()) {
      return positions;
    }

    const query = searchQuery.toLowerCase();
    return positions.filter(
      (position) =>
        position.market.toLowerCase().includes(query) ||
        position.outcome.toLowerCase().includes(query)
    );
  }, [activeTab, searchQuery, activePositions, closedPositions]);

  const statCards = [
    { label: 'Portfolio Value', value: `$${stats.totalValue.toFixed(2)}`, valueClass: 'text-white' },
    {
      label: 'Net P&L',
      value: `${stats.netPL >= 0 ? '+' : ''}$${stats.netPL.toFixed(2)}`,
      valueClass: stats.netPL >= 0 ? 'text-emerald-400' : 'text-red-400',
      sub: `(${stats.netPLPercent >= 0 ? '+' : ''}${stats.netPLPercent.toFixed(1)}%)`,
      subClass: stats.netPL >= 0 ? 'text-emerald-400/70' : 'text-red-400/70',
    },
    { label: 'Biggest Win', value: `+$${stats.biggestWin.toFixed(2)}`, valueClass: 'text-yellow-400' },
    { label: 'Volume Traded', value: `$${stats.totalVolume.toFixed(2)}`, valueClass: 'text-white' },
    { label: 'Total Trades', value: `${stats.totalTrades}`, valueClass: 'text-white' },
    {
      label: 'Positions',
      value: `${stats.activePositions}`,
      valueClass: 'text-white',
      sub: 'active',
      subClass: 'text-[hsl(230,10%,40%)]',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Portfolio
          </h1>
          <p className="text-[hsl(230,10%,50%)] text-lg">
            Track your predictions and performance across all markets.
          </p>
          {!hasPredictions && isConnected && !isLoadingPredictions && (
            <p className="text-[hsl(230,10%,35%)] text-sm mt-2">
              Sync your wallet to load your predictions.
            </p>
          )}
        </div>

        {/* Sync Button */}
        {isConnected && (
          <button
            onClick={() => refetchPredictions()}
            disabled={isLoadingPredictions}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((card, i) => {
          const style = statCardStyles[i];
          const IconComponent = i === 1 ? (stats.netPL >= 0 ? TrendingUp : TrendingDown) : style.icon;
          const iconColor = i === 1 ? (stats.netPL >= 0 ? 'text-emerald-400' : 'text-red-400') : style.iconColor;

          return (
            <div key={card.label} className={cn('border border-white/[0.06] rounded-xl p-4', style.bg)}>
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className={cn('w-4 h-4', iconColor)} />
                <span className="text-xs font-medium text-[hsl(230,10%,40%)]">{card.label}</span>
              </div>
              <div className={cn('text-xl font-bold font-mono', card.valueClass)}>
                {card.value}
              </div>
              {card.sub && (
                <span className={cn('text-xs', card.subClass)}>
                  {card.sub}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Positions Section */}
      <div className="bg-[hsl(230,15%,8%)]/60 border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Tabs and Search */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1">
              <button
                onClick={() => setActiveTab('active')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  activeTab === 'active'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-[hsl(230,10%,45%)] hover:text-white'
                )}
              >
                Active
                <span className={cn(
                  'ml-2 px-1.5 py-0.5 rounded text-xs',
                  activeTab === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.06] text-[hsl(230,10%,40%)]'
                )}>
                  {stats.activePositions}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('closed')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  activeTab === 'closed'
                    ? 'bg-white/[0.08] text-white'
                    : 'text-[hsl(230,10%,45%)] hover:text-white'
                )}
              >
                Closed
                <span className={cn(
                  'ml-2 px-1.5 py-0.5 rounded text-xs',
                  activeTab === 'closed' ? 'bg-white/[0.08] text-white/70' : 'bg-white/[0.06] text-[hsl(230,10%,40%)]'
                )}>
                  {stats.closedPositions}
                </span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72 sm:mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(230,10%,40%)]" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder:text-[hsl(230,10%,40%)] focus:outline-none focus:border-white/[0.12] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(230,10%,40%)] hover:text-white/70"
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
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-[hsl(230,10%,35%)]" />
            </div>
            <p className="text-[hsl(230,10%,50%)] mb-2">Connect your wallet to view positions</p>
            <p className="text-sm text-[hsl(230,10%,35%)]">Your portfolio data will appear here</p>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
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
              <button
                onClick={() => refetchPredictions()}
                disabled={isLoadingPredictions}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
                <tr className="text-left text-xs font-medium text-[hsl(230,10%,40%)] uppercase tracking-wider bg-white/[0.02]">
                  <th className="px-6 py-3">Market</th>
                  <th className="px-6 py-3">Outcome</th>
                  <th className="px-6 py-3 text-right">Avg Price</th>
                  {activeTab === 'active' && <th className="px-6 py-3 text-right">Current</th>}
                  <th className="px-6 py-3 text-right">Value</th>
                  <th className="px-6 py-3 text-right">P/L</th>
                  {activeTab === 'closed' && <th className="px-6 py-3 text-center">Result</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-white/[0.02] transition-colors group">
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
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        position.outcome === 'Yes'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-white/[0.06] text-white/70'
                      )}>
                        {position.outcome}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[hsl(230,10%,50%)] text-right font-mono">
                      {(position.avgPrice * 100).toFixed(0)}¢
                    </td>
                    {activeTab === 'active' && (
                      <td className="px-6 py-4 text-sm text-white text-right font-mono">
                        {(position.currentPrice * 100).toFixed(0)}¢
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-white text-right font-mono">
                      ${position.value.toFixed(2)}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-sm text-right font-mono font-medium",
                      position.pl >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      <div>
                        {position.pl >= 0 ? '+' : ''}${position.pl.toFixed(2)}
                      </div>
                      <div className="text-xs opacity-70">
                        ({position.plPercent >= 0 ? '+' : ''}{position.plPercent.toFixed(1)}%)
                      </div>
                    </td>
                    {activeTab === 'closed' && (
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          position.result === 'won'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : position.result === 'lost'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-white/[0.06] text-[hsl(230,10%,50%)]'
                        )}>
                          {position.result === 'won' ? 'Won' : position.result === 'lost' ? 'Lost' : 'Pending'}
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
  );
}
