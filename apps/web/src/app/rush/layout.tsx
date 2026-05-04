import type { Metadata } from 'next';
import RushLayoutClient from './RushLayoutClient';

export const metadata: Metadata = {
  title: 'Mode Rush — FlowStock',
  description: 'Alertes stock en service',
};

export default function RushLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RushLayoutClient>
      {children}
    </RushLayoutClient>
  );
}
