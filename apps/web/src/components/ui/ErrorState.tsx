import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'Une erreur est survenue.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-terracotta/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-terracotta" />
      </div>
      <p className="font-display font-bold text-charcoal text-base">Erreur de chargement</p>
      <p className="text-charcoal/50 text-sm mt-1.5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-4 py-2 bg-green-deep text-cream text-sm font-medium rounded-lg hover:bg-forest-green transition-colors"
        >
          Réessayer
        </button>
      )}
    </div>
  )
}
