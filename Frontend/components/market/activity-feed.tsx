'use client';

import { Activity } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight, Zap, TrendingUp } from 'lucide-react';

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const [displayedActivities, setDisplayedActivities] = useState<(Activity & { _id: number })[]>([]);
  const [newItemIds, setNewItemIds] = useState<Set<number>>(new Set());
  const [containerPulse, setContainerPulse] = useState(false);
  const idCounter = useRef(0);
  const isInitialMount = useRef(true);

  // Initialize activities on mount
  useEffect(() => {
    const initial = activities.map((a) => ({ ...a, _id: idCounter.current++ }));
    setDisplayedActivities(initial);
    isInitialMount.current = false;
  }, []);

  // Detect new activities added after initial mount
  useEffect(() => {
    if (isInitialMount.current) return;

    const currentCount = displayedActivities.length;
    if (activities.length > currentCount) {
      const newActivities = activities.slice(currentCount).map((a) => ({
        ...a,
        _id: idCounter.current++,
      }));

      const newIdList = newActivities.map((a) => a._id);
      setNewItemIds((prev) => {
        const next = new Set(prev);
        newIdList.forEach((id) => next.add(id));
        return next;
      });
      setDisplayedActivities((prev) => [...newActivities, ...prev]);

      // Container pulse effect on new items
      setContainerPulse(true);
      setTimeout(() => setContainerPulse(false), 600);

      // Clear new item highlight after animation
      setTimeout(() => {
        setNewItemIds((prev) => {
          const next = new Set(prev);
          newIdList.forEach((id) => next.delete(id));
          return next;
        });
      }, 1200);
    }
  }, [activities.length]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-[hsl(230,15%,8%)]/90 backdrop-blur-xl',
        'border border-white/[0.08]',
        'transition-all duration-300',
        containerPulse && 'activity-feed-pulse'
      )}
    >
      {/* Grid pattern background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Zap className="w-4 h-4 text-cyan-400" />
              <div className="absolute inset-0 animate-ping opacity-30">
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <h2 className="text-base font-semibold text-white tracking-tight">Live Activity</h2>
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <TrendingUp className="w-3 h-3" />
            <span>{activities.length} trades</span>
          </div>
        </div>

        {/* Activity list */}
        <div className="space-y-1">
          {displayedActivities.map((activity, i) => (
            <ActivityItem
              key={activity._id}
              activity={activity}
              index={i}
              isNew={newItemIds.has(activity._id)}
            />
          ))}

          {displayedActivities.length === 0 && (
            <div className="flex items-center justify-center py-8 text-white/20 text-sm">
              No activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  activity,
  index,
  isNew,
}: {
  activity: Activity;
  index: number;
  isNew: boolean;
}) {
  const isBuy = activity.action === 'bought';
  const isYes = activity.type === 'yes';
  const [showTooltip, setShowTooltip] = useState(false);
  const [isVisible, setIsVisible] = useState(!isNew);
  const [countUpValue, setCountUpValue] = useState(isNew ? '0' : activity.amount);

  // Parse amount for size-based styling
  const numericAmount = parseFloat(activity.amount.replace(/[^0-9.]/g, ''));
  const isLargeTrade = numericAmount >= 100;

  // Entrance animation for new items
  useEffect(() => {
    if (isNew) {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [isNew]);

  // Count-up animation for new items
  useEffect(() => {
    if (!isNew) return;

    const prefix = activity.amount.replace(/[0-9.]/g, '').charAt(0) || '';
    const suffix = activity.amount.replace(/^[^0-9]*[0-9.]+/, '') || '';
    const target = numericAmount;
    const duration = 600;
    const steps = 15;
    const stepTime = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = (target * eased).toFixed(target % 1 === 0 ? 0 : 2);
      setCountUpValue(`${prefix}${current}${suffix}`);
      if (step >= steps) {
        clearInterval(interval);
        setCountUpValue(activity.amount);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [isNew]);

  // Generate a deterministic hue from the user string for avatar gradient
  const userHash = activity.user.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = userHash % 360;
  const hue2 = (hue1 + 60) % 360;

  return (
    <div
      className={cn(
        'group relative flex items-center justify-between py-3 px-3 -mx-3 rounded-xl',
        'transition-all duration-300 ease-out',
        'hover:bg-white/[0.03] hover:scale-[1.01]',
        'hover:shadow-[0_0_20px_-5px_rgba(100,200,255,0.08)]',
        isNew && 'activity-item-enter',
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      )}
      style={{
        animationDelay: isNew ? '0ms' : `${index * 50}ms`,
        transitionDelay: isNew ? '0ms' : `${index * 30}ms`,
      }}
    >
      {/* Electric flash overlay for new items */}
      {isNew && (
        <div className="absolute inset-0 rounded-xl activity-electric-flash pointer-events-none" />
      )}

      <div className="flex items-center gap-3">
        {/* Avatar with gradient border + pulse rings */}
        <div className="relative">
          {/* Pulse rings for recent activity */}
          {index < 3 && (
            <>
              <div
                className="absolute inset-0 rounded-full opacity-20 animate-ping"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 60%))`,
                  animationDuration: '2s',
                }}
              />
              <div
                className="absolute -inset-1 rounded-full opacity-10"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 60%))`,
                  animation: 'pulse-ring 2.5s ease-out infinite',
                }}
              />
            </>
          )}

          {/* Avatar with animated gradient border */}
          <div
            className={cn(
              'relative w-9 h-9 rounded-full p-[2px]',
              'group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300'
            )}
            style={{
              background: `linear-gradient(135deg, hsl(${hue1}, 70%, 55%), hsl(${hue2}, 70%, 55%))`,
            }}
          >
            <div className="w-full h-full rounded-full bg-[hsl(230,15%,10%)] flex items-center justify-center">
              <span
                className="text-[10px] font-bold tracking-wide"
                style={{ color: `hsl(${hue1}, 60%, 70%)` }}
              >
                {activity.user.slice(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Action info */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            {/* Action indicator with icon */}
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider',
                isBuy
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              )}
            >
              {isBuy ? (
                <ArrowUpRight className="w-2.5 h-2.5 activity-icon-bounce" />
              ) : (
                <ArrowDownRight className="w-2.5 h-2.5 activity-icon-bounce" />
              )}
              {isBuy ? 'Buy' : 'Sell'}
            </div>

            {/* Outcome type */}
            <span
              className={cn(
                'text-sm font-medium',
                isYes ? 'text-blue-400' : 'text-white/50'
              )}
            >
              {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
            </span>
          </div>

          {/* Timestamp with hover tooltip */}
          <div className="relative">
            <span
              className="text-[11px] text-white/25 cursor-default activity-time-fade"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {activity.time}
            </span>
            {showTooltip && (
              <div className="absolute bottom-full left-0 mb-1.5 px-2.5 py-1.5 rounded-lg bg-[hsl(230,15%,12%)]/95 backdrop-blur-md border border-white/[0.08] shadow-xl z-10 whitespace-nowrap activity-tooltip-enter">
                <span className="text-[10px] text-white/60">{activity.time}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Amount with size-based styling */}
      <div className="flex items-center">
        <span
          className={cn(
            'text-sm font-semibold tabular-nums transition-all duration-300',
            isLargeTrade
              ? 'text-amber-300 activity-large-trade px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/15'
              : 'text-white/80',
            numericAmount >= 50 && numericAmount < 100 && 'text-white/90',
            numericAmount >= 10 && numericAmount < 50 && 'text-white/70'
          )}
        >
          {countUpValue}
        </span>
      </div>
    </div>
  );
}
