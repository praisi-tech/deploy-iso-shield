import { cn } from '@/lib/utils'
import type { RiskLevel, AssetCriticality } from '@/types/database'

interface BadgeProps {
  level: RiskLevel | AssetCriticality | string
  className?: string
  size?: 'sm' | 'md'
}

const badgeMap: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  negligible: 'badge-negligible',
}

const dotMap: Record<string, string> = {
  critical: 'bg-red-600',
  high: 'bg-orange-600',
  medium: 'bg-yellow-600',
  low: 'bg-green-600',
  negligible: 'bg-slate-400',
}

export default function RiskBadge({ level, className, size = 'md' }: BadgeProps) {
  const badge = badgeMap[level] || badgeMap.negligible
  const dot = dotMap[level] || dotMap.negligible

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-md font-medium',
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1',
      badge,
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}