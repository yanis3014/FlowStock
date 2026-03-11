import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
      <p className="text-6xl font-display font-bold text-charcoal/15 mb-4">404</p>
      <h1 className="text-xl font-display font-bold text-charcoal">Page introuvable</h1>
      <p className="text-charcoal/50 text-sm mt-2">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link
        href="/dashboard"
        className="mt-6 px-5 py-2.5 bg-green-deep text-cream text-sm font-medium rounded-lg hover:bg-forest-green transition-colors"
      >
        Retour au dashboard
      </Link>
    </div>
  )
}
