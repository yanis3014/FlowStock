'use client';
import type { Emplacement, EmplacementType } from '@/types/onboarding';

interface EmplacementChipProps {
  emp: Emplacement;
  onUpdate: (e: Emplacement) => void;
  onDelete: () => void;
}

const TYPE_ICONS: Record<EmplacementType, React.ReactNode> = {
  froid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5l-5 5-5-5" />
      <path d="M17 19l-5-5-5 5" />
      <path d="M2 12l5-5 5 5-5 5z" />
      <path d="M22 12l-5-5-5 5 5 5z" />
    </svg>
  ),
  sec: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    </svg>
  ),
  cave: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h8l1 9H7L8 2z" />
      <path d="M7 11l-2 11h14l-2-11" />
    </svg>
  ),
  cuisine: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  ),
  autre: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
};

export function EmplacementChip({ emp, onUpdate, onDelete }: EmplacementChipProps) {
  return (
    <div className="bg-white border border-charcoal/15 rounded-lg px-3 py-2 flex items-center gap-2 min-w-0">
      <span className="text-charcoal/50 flex-shrink-0">
        {TYPE_ICONS[emp.type]}
      </span>
      <input
        className="flex-1 text-sm text-charcoal bg-transparent focus:outline-none min-w-0"
        value={emp.nom}
        onChange={(e) => onUpdate({ ...emp, nom: e.target.value })}
        placeholder="Nom de l'emplacement"
      />
      <button
        type="button"
        onClick={onDelete}
        className="text-charcoal/30 hover:text-red-alert flex-shrink-0 text-base leading-none"
        aria-label="Supprimer l'emplacement"
      >
        ×
      </button>
    </div>
  );
}
