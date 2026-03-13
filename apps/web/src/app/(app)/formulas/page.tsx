'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { StandardFormulasContent } from './_components/StandardFormulasContent';
import { CustomFormulasContent } from './_components/CustomFormulasContent';
import { PageHeader } from '@/components/ui/PageHeader';

type Tab = 'standard' | 'custom';

export default function FormulasPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => (searchParams.get('tab') as Tab) || 'standard');

  useEffect(() => {
    const tab = (searchParams.get('tab') as Tab) || 'standard';
    setActiveTab(tab);
  }, [searchParams]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'standard', label: 'Formules standard' },
    { id: 'custom', label: 'Formules personnalisées' },
  ];

  return (
    <div className="min-h-full bg-cream font-body p-6">
      <PageHeader title="Formules" />

      <div className="flex gap-2 border-b border-charcoal/10 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-green-deep text-green-deep'
                : 'border-transparent text-charcoal/60 hover:text-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'standard' && <StandardFormulasContent />}
      {activeTab === 'custom' && <CustomFormulasContent />}
    </div>
  );
}
