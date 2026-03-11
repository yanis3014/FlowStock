import Link from 'next/link';
import { AdminGuard } from '@/components/auth/AdminGuard';

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminGuard>
    <div className="min-h-screen bg-gray-100 font-body">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="font-display text-lg font-bold text-green-deep">Back-Office Fondateur</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="font-medium text-green-deep hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/clients" className="text-gray-warm hover:text-green-deep">
              Clients
            </Link>
            <Link href="/admin/moniteur" className="text-gray-warm hover:text-green-deep">
              Moniteur
            </Link>
            <Link href="/admin/abonnements" className="text-gray-warm hover:text-green-deep">
              Abonnements
            </Link>
            <Link href="/admin/feedback" className="text-gray-warm hover:text-green-deep">
              Feedback
            </Link>
            <Link href="/dashboard" className="text-gray-warm hover:text-green-deep">
              Retour app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
    </AdminGuard>
  );
}
