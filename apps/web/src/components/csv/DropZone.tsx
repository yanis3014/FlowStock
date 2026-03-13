'use client';

import { useRef, useState, useCallback } from 'react';

export type DropZoneProps = {
  onFileSelected: (file: File, content: string) => void;
  accept?: string[];
  maxSizeMb?: number;
};

const DEFAULT_ACCEPT = ['.csv', '.txt'];
const DEFAULT_MAX_MB = 5;

export function DropZone({
  onFileSelected,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = DEFAULT_MAX_MB,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const acceptStr = accept.join(',');

  const validateAndRead = useCallback(
    (file: File): Promise<void> => {
      setError(null);
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!accept.includes(ext)) {
        setError(`Format non accepté. Utilisez : ${accept.join(', ')}`);
        return Promise.resolve();
      }
      if (file.size > maxSizeBytes) {
        setError(`Fichier trop volumineux (max ${maxSizeMb} Mo).`);
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const content = typeof reader.result === 'string' ? reader.result : '';
          onFileSelected(file, content);
          resolve();
        };
        reader.onerror = () => {
          setError('Impossible de lire le fichier.');
          reject(reader.error);
        };
        reader.readAsText(file, 'UTF-8');
      });
    },
    [accept, maxSizeBytes, maxSizeMb, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) validateAndRead(file);
    },
    [validateAndRead]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndRead(file);
      e.target.value = '';
    },
    [validateAndRead]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    []
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onClick={() => inputRef.current?.click()}
        className={`
          flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-colors
          ${error ? 'border-red-alert/50 bg-red-alert/5' : dragOver ? 'border-green-deep/50 bg-green-deep/5' : 'border-charcoal/15 bg-cream/50 hover:border-green-deep/30'}
        `}
        aria-label="Glissez un fichier CSV ou cliquez pour parcourir"
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          className="sr-only"
          onChange={handleChange}
          aria-hidden
        />
        <p className="font-display text-sm font-semibold text-charcoal">
          Glissez un fichier ici ou cliquez pour parcourir
        </p>
        <p className="mt-1 text-xs text-charcoal/50">
          {accept.join(', ')} — max {maxSizeMb} Mo
        </p>
      </div>
      {error && (
        <p className="mt-2 text-sm text-terracotta" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
