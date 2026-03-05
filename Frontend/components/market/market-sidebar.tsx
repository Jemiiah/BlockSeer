'use client';

import { MarketCategory, MarketSort } from '@/types';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Bitcoin,
  Link2,
  Cpu,
  Brain,
  TrendingUp,
  Clock,
  Flame,
  Rocket,
  ShieldCheck,
  Lock,
  Eye,
} from 'lucide-react';

interface CategoryCounts {
  all: number;
  Crypto: number;
  DeFi: number;
  Tech: number;
  AI: number;
}

interface MarketSidebarProps {
  categoryFilter: MarketCategory | 'all';
  onCategoryChange: (category: MarketCategory | 'all') => void;
  sort: MarketSort;
  onSortChange: (sort: MarketSort) => void;
  categoryCounts: CategoryCounts;
  className?: string;
}

const CATEGORIES: { key: MarketCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All Markets', icon: LayoutGrid },
  { key: 'Crypto', label: 'Crypto', icon: Bitcoin },
  { key: 'DeFi', label: 'DeFi', icon: Link2 },
  { key: 'Tech', label: 'Tech', icon: Cpu },
  { key: 'AI', label: 'AI', icon: Brain },
];

const SORT_OPTIONS: { key: MarketSort; label: string; icon: React.ElementType }[] = [
  { key: 'volume', label: 'Highest Volume', icon: TrendingUp },
  { key: 'ending_soon', label: 'Ending Soon', icon: Clock },
  { key: 'newest', label: 'Newest', icon: Flame },
  { key: 'needs_resolution', label: 'Needs Resolution', icon: Rocket },
];

const PRIVACY_ITEMS = [
  { label: 'ZK Proofs', value: 'Active', icon: ShieldCheck },
  { label: 'Encryption', value: 'Enabled', icon: Lock },
  { label: 'MEV Protection', value: 'On', icon: Eye },
];

export function MarketSidebar({
  categoryFilter,
  onCategoryChange,
  sort,
  onSortChange,
  categoryCounts,
  className,
}: MarketSidebarProps) {
  return (
    <aside className={cn('w-[280px] shrink-0 space-y-5', className)}>
      {/* CATEGORIES */}
      <div className="rounded-2xl bg-[hsl(230,15%,8%)] border border-white/[0.06] p-5">
        <h3 className="text-xs font-semibold text-white/40 mb-4 tracking-wide">
          Categories
        </h3>
        <div className="space-y-1.5">
          {CATEGORIES.map(({ key, label, icon: Icon }) => {
            const isActive = categoryFilter === key;
            const count = key === 'all' ? categoryCounts.all : categoryCounts[key];
            return (
              <button
                key={key}
                onClick={() => onCategoryChange(key)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-500/[0.1] text-blue-400 border border-blue-500/25'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-blue-400')} />
                <span className="flex-1 text-left">{label}</span>
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full min-w-[24px] text-center',
                    isActive
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-white/[0.06] text-white/30'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SORT BY */}
      <div className="rounded-2xl bg-[hsl(230,15%,8%)] border border-white/[0.06] p-5">
        <h3 className="text-xs font-semibold text-white/40 mb-4 tracking-wide">
          Sort By
        </h3>
        <div className="space-y-1.5">
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => {
            const isActive = sort === key;
            return (
              <button
                key={key}
                onClick={() => onSortChange(key)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-500/[0.1] text-emerald-400 border border-emerald-500/25'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-emerald-400')} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PRIVACY STATUS */}
      <div className="rounded-2xl bg-[hsl(230,15%,8%)] border border-white/[0.06] p-5 relative overflow-hidden">
        {/* Subtle gradient glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[radial-gradient(circle,hsla(263,70%,50%,0.08),transparent_70%)] pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[radial-gradient(circle,hsla(217,91%,60%,0.06),transparent_70%)] pointer-events-none" />

        <h3 className="text-xs font-semibold text-white/40 mb-4 tracking-wide relative">
          Privacy Status
        </h3>
        <div className="space-y-3 relative">
          {PRIVACY_ITEMS.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <Icon className="w-4 h-4 text-violet-400/70 shrink-0" />
              <span className="flex-1 text-sm text-white/50">{label}</span>
              <span className="text-sm font-semibold text-emerald-400">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
