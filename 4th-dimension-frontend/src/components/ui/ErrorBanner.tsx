interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Retry',
}: ErrorBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hyperplane-x/40 bg-hyperplane-x/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-hyperplane-x">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md border border-hyperplane-x/40 px-3 py-1.5 text-xs text-hyperplane-x hover:bg-hyperplane-x/10"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
