type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium'

const variantStyles: Record<BadgeVariant, string> = {
  default:  'bg-charcoal/8 text-charcoal/60',
  success:  'bg-green-deep/10 text-green-deep',
  warning:  'bg-gold/15 text-gold',
  danger:   'bg-terracotta/10 text-terracotta',
  info:     'bg-charcoal/8 text-charcoal/70',
  premium:  'bg-gold/15 text-gold',
}

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  dot?: boolean
}

export function Badge({ label, variant = 'default', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  )
}
