'use client';

import { LayoutGrid, Clock } from 'lucide-react';
import { MarketFilter } from '@/types';
import { cn } from '@/lib/utils';

interface MarketFiltersProps {
  activeFilter: MarketFilter;
  onFilterChange: (filter: MarketFilter) => void;
  liveCount: number;
  upcomingCount: number;
}

export function MarketFilters({ activeFilter, onFilterChange, liveCount, upcomingCount }: MarketFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
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
    </div>
  );
}

interface FilterButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  variant?: 'default' | 'success' | 'warning';
}

function FilterButton({ isActive, onClick, icon, label, count, variant = 'default' }: FilterButtonProps) {
  const activeStyles = {
    default: 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-[0_0_12px_hsla(217,91%,60%,0.15)]',
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_hsla(160,84%,39%,0.15)]',
    warning: 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_12px_hsla(38,92%,50%,0.15)]',
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
