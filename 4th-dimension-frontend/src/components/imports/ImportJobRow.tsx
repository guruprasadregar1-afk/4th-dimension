'use client';

import Link from 'next/link';
import {
  formatImportFormat,
  isImportInProgress,
  type ImportJob,
} from '@/types/import';
import { formatBytes } from '@/types/scene';

interface ImportJobRowProps {
  job: ImportJob;
}

function statusColor(status: ImportJob['status']): string {
  switch (status) {
    case 'complete':
      return 'text-hyperplane-y';
    case 'failed':
      return 'text-hyperplane-x';
    case 'processing':
      return 'text-hyperplane-z';
    default:
      return 'text-muted';
  }
}

export function ImportJobRow({ job }: ImportJobRowProps) {
  const inProgress = isImportInProgress(job.status);

  return (
    <div className="rounded-lg border border-surface-border bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {job.metadata.title ?? job.originalFileName}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {formatImportFormat(job.detectedFormat)} ·{' '}
            {formatBytes(job.fileSizeBytes)} ·{' '}
            {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium capitalize ${statusColor(job.status)}`}
        >
          {job.status}
        </span>
      </div>

      {inProgress ? (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${Math.max(job.progress, 4)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{job.statusMessage}</p>
        </div>
      ) : null}

      {job.status === 'failed' && job.errorMessage ? (
        <p className="mt-2 text-xs text-hyperplane-x">{job.errorMessage}</p>
      ) : null}

      {job.status === 'complete' && job.sceneId ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">
            {job.primitiveCount.toLocaleString()} primitives imported
          </span>
          <Link
            href={`/viewer?scene=${job.sceneId}`}
            className="rounded-md border border-accent bg-accent/10 px-2 py-1 text-accent hover:bg-accent/20"
          >
            Open in viewer
          </Link>
        </div>
      ) : null}
    </div>
  );
}
