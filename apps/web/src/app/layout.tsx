import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowStock',
  description: 'SaaS Gestion de stocks pour PME',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen bg-gray-50">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#F7F2E8',
              color: '#1C2B2A',
              border: '1px solid #1E4A3A20',
              fontFamily: 'DM Sans, sans-serif',
            },
            classNames: {
              success: 'border-l-4 border-l-[#1E4A3A]',
              error: 'border-l-4 border-l-[#C1440E]',
              warning: 'border-l-4 border-l-[#D4A843]',
            },
          }}
        />
      </body>
    </html>
  );
}
