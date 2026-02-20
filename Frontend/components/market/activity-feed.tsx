import { Activity } from '@/types';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-[hsl(230,15%,8%)]/80 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((activity, i) => (
          <ActivityItem key={i} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const isYes = activity.type === 'yes';

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/[0.06] flex items-center justify-center text-xs text-[hsl(230,10%,55%)] font-mono">
          {activity.user.slice(0, 4)}
        </div>
        <div>
          <span className="text-white/80 text-sm">
            {activity.action === 'bought' ? 'Bought' : 'Sold'}{' '}
            <span className={cn(isYes ? 'text-blue-400' : 'text-white/50')}>
              {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
            </span>
          </span>
          <div className="text-xs text-[hsl(230,10%,35%)]">{activity.time}</div>
        </div>
      </div>
      <span className="text-sm font-medium text-white/80">{activity.amount}</span>
    </div>
  );
}
