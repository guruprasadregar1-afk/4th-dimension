'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate } from 'swr';
import { clientFetch, fetchBff } from '@/lib/client-fetch';
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  isImportInProgress,
  MAX_IMPORT_FILE_BYTES,
  type ImportJob,
} from '@/types/import';
import { formatBytes } from '@/types/scene';

interface ImportUploaderProps {
  onImportComplete?: (job: ImportJob) => void;
}

function defaultTitleFromFileName(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  const base = index === -1 ? fileName : fileName.slice(0, index);
  return base.replace(/[-_]+/g, ' ').trim() || fileName;
}

function isAcceptedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED_IMPORT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function pollImportJob(
  jobId: string,
  onUpdate: (job: ImportJob) => void,
): Promise<ImportJob> {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    const response = await fetchBff(`/api/imports/${jobId}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Failed to poll import status');
    }

    const job = (await response.json()) as ImportJob;
    onUpdate(job);

    if (!isImportInProgress(job.status)) {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error('Import timed out — check recent imports for status');
}

export function ImportUploader({ onImportComplete }: ImportUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [duration, setDuration] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectFile = useCallback((next: File) => {
    setError(null);

    if (!isAcceptedFile(next)) {
      setError(
        `Unsupported file type. Accepted: ${ACCEPTED_IMPORT_EXTENSIONS.join(', ')}`,
      );
      return;
    }

    if (next.size > MAX_IMPORT_FILE_BYTES) {
      setError(`File exceeds ${formatBytes(MAX_IMPORT_FILE_BYTES)} limit`);
      return;
    }

    setFile(next);
    setTitle(defaultTitleFromFileName(next.name));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || uploading) return;

    setError(null);
    setUploading(true);
    setActiveJob(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      if (tags.trim()) formData.append('tags', tags.trim());
      if (duration.trim()) formData.append('duration', duration.trim());

      const response = await clientFetch('/api/imports', {
        method: 'POST',
        body: formData,
      });

      const body = (await response.json()) as ImportJob | { error?: string };
      if (!response.ok) {
        throw new Error(
          'error' in body && body.error ? body.error : 'Upload failed',
        );
      }

      const created = body as ImportJob;
      setActiveJob(created);

      const finalJob = await pollImportJob(created.id, setActiveJob);
      void mutate((key) => typeof key === 'string' && key.startsWith('/api/imports'));
      void mutate((key) => typeof key === 'string' && key.startsWith('/api/scenes'));

      if (finalJob.status === 'failed') {
        throw new Error(finalJob.errorMessage ?? 'Import failed');
      }

      onImportComplete?.(finalJob);
      setFile(null);
      setDescription('');
      setTags('');
      setDuration('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Import failed',
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const dropped = event.dataTransfer.files[0];
          if (dropped) selectFile(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? 'border-accent bg-accent/10'
            : 'border-surface-border bg-surface hover:border-accent/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMPORT_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            if (picked) selectFile(picked);
          }}
        />
        {file ? (
          <>
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="mt-1 text-xs text-muted">{formatBytes(file.size)}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-foreground">
              Drop a Gaussian model file here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted">
              {ACCEPTED_IMPORT_EXTENSIONS.join(', ')} · max{' '}
              {formatBytes(MAX_IMPORT_FILE_BYTES)}
            </p>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="import-title" className="mb-1 block text-xs text-muted">
            Title
          </label>
          <input
            id="import-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
            placeholder="Scene title"
          />
        </div>
        <div>
          <label htmlFor="import-tags" className="mb-1 block text-xs text-muted">
            Tags (comma-separated)
          </label>
          <input
            id="import-tags"
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
            placeholder="import, 3dgs, demo"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="import-description"
            className="mb-1 block text-xs text-muted"
          >
            Description (optional)
          </label>
          <textarea
            id="import-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
            placeholder="Imported from 3D Gaussian Splatting export"
          />
        </div>
        <div>
          <label
            htmlFor="import-duration"
            className="mb-1 block text-xs text-muted"
          >
            Duration in seconds (optional, for static 3DGS use 0)
          </label>
          <input
            id="import-duration"
            type="number"
            min={0}
            step={0.1}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
            placeholder="0"
          />
        </div>
      </div>

      {activeJob && isImportInProgress(activeJob.status) ? (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Processing import…</span>
            <span>{activeJob.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${Math.max(activeJob.progress, 4)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{activeJob.statusMessage}</p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-hyperplane-x">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={!file || uploading}
        className="rounded-lg border border-accent bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:opacity-50"
      >
        {uploading ? 'Importing…' : 'Import scene'}
      </button>
    </form>
  );
}
