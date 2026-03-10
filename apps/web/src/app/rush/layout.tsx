import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mode Rush — FlowStock',
  description: 'Alertes stock en service',
};

export default function RushLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="fixed left-4 top-4 z-10">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-warm hover:text-cream transition-colors"
        >
          ← Retour
        </Link>
      </div>
      {children}
    </>
  );
}
