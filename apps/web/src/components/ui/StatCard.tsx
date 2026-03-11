import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  sub?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

const variantStyles = {
  default: 'bg-green-deep/8 text-green-deep',
  success: 'bg-green-deep/8 text-green-deep',
  warning: 'bg-gold/10 text-gold',
  danger:  'bg-terracotta/10 text-terracotta',
}

export function StatCard({ title, value, sub, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <div className="bg-white border border-charcoal/8 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${variantStyles[variant]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            trend.value >= 0 ? 'bg-green-deep/8 text-green-deep' : 'bg-terracotta/10 text-terracotta'
          }`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-bold text-charcoal">{value}</p>
      <p className="text-charcoal/50 text-sm mt-0.5">{title}</p>
      {sub && <p className="text-charcoal/35 text-xs mt-1">{sub}</p>}
    </div>
  )
}
