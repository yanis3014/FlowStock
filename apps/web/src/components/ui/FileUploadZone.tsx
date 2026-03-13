'use client';

import { useRef, useState, useCallback } from 'react';
import { ImageIcon, Upload, X, FileText } from 'lucide-react';

export interface FileUploadZoneProps {
  onFileSelected: (file: File, content: string) => void;
  accept?: string[];
  maxSizeMb?: number;
  readAs?: 'text' | 'dataUrl';
  disabled?: boolean;
  label?: string;
  hint?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const DEFAULT_TEXT_ACCEPT = ['.csv', '.txt'];
const DEFAULT_IMAGE_ACCEPT = ['.jpg', '.jpeg', '.png', '.webp'];
const DEFAULT_MAX_MB = 5;

export function FileUploadZone({
  onFileSelected,
  accept,
  maxSizeMb = DEFAULT_MAX_MB,
  readAs = 'text',
  disabled = false,
  label,
  hint,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; size: number; dataUrl: string } | null>(null);

  const acceptedExtensions = accept ?? (readAs === 'dataUrl' ? DEFAULT_IMAGE_ACCEPT : DEFAULT_TEXT_ACCEPT);
  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const acceptStr = acceptedExtensions.join(',');

  const isImage = readAs === 'dataUrl';

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
      if (!acceptedExtensions.includes(ext)) {
        setError(`Format non accepté. Utilisez : ${acceptedExtensions.join(', ')}`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setError(`Fichier trop volumineux (max ${maxSizeMb} Mo).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (isImage) setPreview({ name: file.name, size: file.size, dataUrl: content });
        onFileSelected(file, content);
      };
      reader.onerror = () => setError('Impossible de lire le fichier.');
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file, 'UTF-8');
      }
    },
    [acceptedExtensions, isImage, maxSizeBytes, maxSizeMb, onFileSelected]
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

  const handleChange = useCallback(
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

  if (isImage && preview) {
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
            aria-label="Supprimer le fichier"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const defaultLabel = isImage ? 'Déposez votre fichier ici' : 'Glissez un fichier ici ou cliquez pour parcourir';
  const defaultHint = isImage
    ? `${acceptedExtensions.join(', ')} · max ${maxSizeMb} Mo`
    : `${acceptedExtensions.join(', ')} — max ${maxSizeMb} Mo`;

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label ?? defaultLabel}
        aria-disabled={disabled}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-10 text-center transition-colors select-none ${
          disabled
            ? 'cursor-not-allowed border-charcoal/10 bg-charcoal/5'
            : isDragging
            ? 'border-green-deep/50 bg-green-deep/5'
            : 'border-charcoal/15 bg-cream/50 hover:border-green-deep/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          className="sr-only"
          onChange={handleChange}
          aria-hidden="true"
          tabIndex={-1}
          disabled={disabled}
        />
        {isImage ? (
          <div className={`rounded-full p-4 ${isDragging ? 'bg-green-deep/10' : 'bg-cream'}`}>
            {isDragging ? (
              <Upload className="h-8 w-8 text-green-deep" />
            ) : (
              <ImageIcon className="h-8 w-8 text-charcoal/40" />
            )}
          </div>
        ) : (
          <FileText className="h-8 w-8 text-charcoal/40" />
        )}
        <div>
          <p className="font-display text-sm font-semibold text-charcoal">
            {isDragging && isImage ? 'Relâchez pour analyser' : (label ?? defaultLabel)}
          </p>
          {isImage && !isDragging && (
            <p className="mt-1 text-sm text-charcoal/50">
              ou <span className="text-green-deep underline">parcourez vos fichiers</span>
            </p>
          )}
          <p className="mt-1 text-xs text-charcoal/50">{hint ?? defaultHint}</p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-terracotta" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
