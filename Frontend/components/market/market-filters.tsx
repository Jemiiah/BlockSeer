'use client';

import { LayoutGrid, Clock, CheckCircle2 } from 'lucide-react';
import { MarketFilter, MarketCategory } from '@/types';
import { ALL_CATEGORIES } from '@/lib/category-map';
import { cn } from '@/lib/utils';

interface MarketFiltersProps {
  activeFilter: MarketFilter;
  onFilterChange: (filter: MarketFilter) => void;
  liveCount: number;
  upcomingCount: number;
  resolvedCount: number;
  categoryFilter: MarketCategory | 'all';
  onCategoryChange: (category: MarketCategory | 'all') => void;
}

export function MarketFilters({
  activeFilter,
  onFilterChange,
  liveCount,
  upcomingCount,
  resolvedCount,
  categoryFilter,
  onCategoryChange,
}: MarketFiltersProps) {
  return (
    <div className="space-y-4 mb-8">
      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterButton
          isActive={activeFilter === 'all'}
          onClick={() => onFilterChange('all')}
          icon={<LayoutGrid className="w-4 h-4" />}
          label="All Markets"
        />
        <FilterButton
          isActive={activeFilter === 'live'}
          onClick={() => onFilterChange('live')}
          variant="success"
          icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          label="Live Markets"
          count={liveCount}
        />
        <FilterButton
          isActive={activeFilter === 'upcoming'}
          onClick={() => onFilterChange('upcoming')}
          variant="warning"
          icon={<Clock className="w-4 h-4" />}
          label="Upcoming"
          count={upcomingCount}
        />
        <FilterButton
          isActive={activeFilter === 'resolved'}
          onClick={() => onFilterChange('resolved')}
          variant="muted"
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Ended"
          count={resolvedCount}
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip
          label="All"
          isActive={categoryFilter === 'all'}
          onClick={() => onCategoryChange('all')}
        />
        {ALL_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            label={cat}
            isActive={categoryFilter === cat}
            onClick={() => onCategoryChange(cat)}
          />
        ))}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  variant?: 'default' | 'success' | 'warning' | 'muted';
}

function FilterButton({ isActive, onClick, icon, label, count, variant = 'default' }: FilterButtonProps) {
  const activeStyles = {
    default: 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-[0_0_12px_hsla(217,91%,60%,0.15)]',
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_hsla(160,84%,39%,0.15)]',
    warning: 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_12px_hsla(38,92%,50%,0.15)]',
    muted: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-400 shadow-[0_0_12px_hsla(0,0%,50%,0.1)]',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border',
        isActive ? activeStyles[variant] : 'bg-white/[0.03] border-white/[0.06] text-[hsl(230,10%,50%)] hover:text-white hover:border-white/[0.1]'
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded-full">{count}</span>
      )}
    </button>
  );
}

interface CategoryChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function CategoryChip({ label, isActive, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border',
        isActive
          ? 'bg-white/10 border-white/20 text-white'
          : 'bg-white/[0.02] border-white/[0.06] text-[hsl(230,10%,45%)] hover:text-white/70 hover:border-white/[0.1]'
      )}
    >
      {label}
    </button>
  );
}
