'use client';

import { useRef, useState, useCallback } from 'react';
import { ImageIcon, Upload, X } from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface ImageDropZoneProps {
  onImageSelected: (file: File, dataUrl: string) => void;
  disabled?: boolean;
}

export function ImageDropZone({ onImageSelected, disabled = false }: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; size: number; dataUrl: string } | null>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError(`Format non supporté. Utilisez : ${ACCEPTED_EXTENSIONS.join(', ')}`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`Le fichier dépasse la taille maximale de 15 Mo (actuel : ${formatFileSize(file.size)})`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview({ name: file.name, size: file.size, dataUrl });
        onImageSelected(file, dataUrl);
      };
      reader.onerror = () => setError('Impossible de lire le fichier.');
      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [disabled, processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled]
  );

  const clearPreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
  }, []);

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-green-deep/20 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.dataUrl}
          alt={preview.name}
          className="h-64 w-full object-contain bg-cream/50"
        />
        <div className="flex items-center justify-between px-4 py-3 border-t border-green-deep/10">
          <div>
            <p className="font-display font-bold text-charcoal text-sm truncate max-w-xs">{preview.name}</p>
            <p className="text-xs text-charcoal/50">{formatFileSize(preview.size)}</p>
          </div>
          <button
            type="button"
            onClick={clearPreview}
            className="rounded-lg border border-charcoal/15 px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-cream transition-colors"
            aria-label="Supprimer l'image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Zone de dépôt d'image — cliquer ou glisser une photo de menu"
        aria-disabled={disabled}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer select-none ${
          disabled
            ? 'border-charcoal/10 bg-charcoal/3 cursor-not-allowed'
            : isDragging
            ? 'border-green-deep bg-green-deep/5'
            : 'border-charcoal/20 bg-white hover:border-green-deep/40 hover:bg-green-deep/3'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={handleKeyDown}
      >
        <div className={`rounded-full p-4 ${isDragging ? 'bg-green-deep/10' : 'bg-cream'}`}>
          {isDragging ? (
            <Upload className="h-8 w-8 text-green-deep" />
          ) : (
            <ImageIcon className="h-8 w-8 text-charcoal/40" />
          )}
        </div>
        <div>
          <p className="font-display font-bold text-charcoal">
            {isDragging ? 'Relâchez pour analyser' : 'Déposez votre photo de menu'}
          </p>
          <p className="mt-1 text-sm text-charcoal/50">
            ou <span className="text-green-deep underline">parcourez vos fichiers</span>
          </p>
          <p className="mt-2 text-xs text-charcoal/40">
            JPG, PNG, WebP · max 15 Mo
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-alert font-medium">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  );
}
