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
      <div className="rounded-xl bg-[#161820] border border-[#23262f] p-5">
        <h3 className="text-xs font-semibold text-[#5a5c66] mb-4">
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
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#4b8cff]/10 text-[#4b8cff] border border-[#4b8cff]/25'
                    : 'text-[#8b8d97] hover:text-[#e8e9ed] hover:bg-[#1c1f2a] border border-transparent'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-[#4b8cff]')} />
                <span className="flex-1 text-left">{label}</span>
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full min-w-[24px] text-center',
                    isActive
                      ? 'bg-[#4b8cff]/20 text-[#4b8cff]'
                      : 'bg-[#1c1f2a] text-[#5a5c66]'
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
      <div className="rounded-xl bg-[#161820] border border-[#23262f] p-5">
        <h3 className="text-xs font-semibold text-[#5a5c66] mb-4">
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
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#00c278]/10 text-[#00c278] border border-[#00c278]/25'
                    : 'text-[#8b8d97] hover:text-[#e8e9ed] hover:bg-[#1c1f2a] border border-transparent'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-[#00c278]')} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PRIVACY STATUS */}
      <div className="rounded-xl bg-[#161820] border border-[#23262f] p-5">
        <h3 className="text-xs font-semibold text-[#5a5c66] mb-4">
          Privacy Status
        </h3>
        <div className="space-y-3">
          {PRIVACY_ITEMS.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#1c1f2a] border border-[#23262f]"
            >
              <Icon className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="flex-1 text-sm text-[#8b8d97]">{label}</span>
              <span className="text-sm font-semibold text-[#00c278]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
