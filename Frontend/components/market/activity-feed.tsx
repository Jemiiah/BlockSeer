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
    <div className="rounded-2xl bg-[#161820] border border-[#23262f] overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-cyan-400" />
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
          {displayedActivities.map((activity) => (
            <ActivityItem
              key={activity._id}
              activity={activity}
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
  isNew,
}: {
  activity: Activity;
  isNew: boolean;
}) {
  const isBuy = activity.action === 'bought';
  const isYes = activity.type === 'yes';

  const userHash = activity.user.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = userHash % 360;

  return (
    <div
      className={cn(
        'group flex items-center justify-between py-3 px-3 -mx-3 rounded-xl',
        'transition-colors duration-200 hover:bg-[#1c1f2a]',
        isNew && 'bg-[#161820]'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full p-[2px]"
          style={{
            background: `linear-gradient(135deg, hsl(${hue1}, 70%, 55%), hsl(${(hue1 + 60) % 360}, 70%, 55%))`,
          }}
        >
          <div className="w-full h-full rounded-full bg-[#161820] flex items-center justify-center">
            <span
              className="text-[10px] font-bold tracking-wide"
              style={{ color: `hsl(${hue1}, 60%, 70%)` }}
            >
              {activity.user.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Action info */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider',
                isBuy
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              )}
            >
              {isBuy ? (
                <ArrowUpRight className="w-2.5 h-2.5" />
              ) : (
                <ArrowDownRight className="w-2.5 h-2.5" />
              )}
              {isBuy ? 'Buy' : 'Sell'}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                isYes ? 'text-blue-400' : 'text-white/50'
              )}
            >
              {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
            </span>
          </div>
          <span className="text-[11px] text-white/25">{activity.time}</span>
        </div>
      </div>

      {/* Amount */}
      <span className="text-sm font-semibold tabular-nums text-white/80">
        {activity.amount}
      </span>
    </div>
  );
}
