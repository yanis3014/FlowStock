'use client';

interface PosCardProps {
  name: string;
  description: string;
  href: string;
}

export function PosCard({ name, description, href }: PosCardProps) {
  return (
    <div className="bg-white border border-charcoal/10 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
      <span className="font-semibold text-charcoal">{name}</span>
      <span className="text-sm text-charcoal/60">{description}</span>
      <a href={href} className="text-sm text-green-deep underline">
        Configurer dans les paramètres
      </a>
    </div>
  );
}
