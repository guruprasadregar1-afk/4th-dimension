interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md';
}

export function LoadingSpinner({
  label,
  size = 'md',
}: LoadingSpinnerProps) {
  const dimension = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8';

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`${dimension} animate-spin rounded-full border-2 border-surface-border border-t-accent`}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label ? <p className="text-xs text-muted">{label}</p> : null}
    </div>
  );
}
