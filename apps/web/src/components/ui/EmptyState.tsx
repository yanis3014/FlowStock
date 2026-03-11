import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-charcoal/5 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-charcoal/25" />
      </div>
      <p className="font-display font-bold text-charcoal text-base">{title}</p>
      {description && (
        <p className="text-charcoal/50 text-sm mt-1.5 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
