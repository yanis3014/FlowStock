export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white border border-charcoal/8 rounded-xl p-5 animate-shimmer">
          <div className="h-4 bg-charcoal/8 rounded w-2/3 mb-3" />
          <div className="h-3 bg-charcoal/5 rounded w-full mb-2" />
          <div className="h-3 bg-charcoal/5 rounded w-4/5" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-charcoal/8 rounded-xl overflow-hidden">
      <div className="divide-y divide-charcoal/5">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4 animate-shimmer">
            <div className="w-8 h-8 rounded-full bg-charcoal/8 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-charcoal/8 rounded w-1/3" />
              <div className="h-2.5 bg-charcoal/5 rounded w-1/2" />
            </div>
            {[...Array(Math.max(0, cols - 2))].map((_, j) => (
              <div key={j} className="h-3 bg-charcoal/5 rounded w-16 hidden md:block" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-shimmer">
      <div className="h-7 bg-charcoal/8 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-charcoal/5 rounded-xl" />
        ))}
      </div>
      <TableSkeleton />
    </div>
  )
}
