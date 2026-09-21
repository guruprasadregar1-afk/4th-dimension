import type { ReactNode } from 'react';

interface CanvasContainerProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/** Placeholder shell for the WebGL2 4D engine canvas (wired in a later sprint). */
export function CanvasContainer({
  title,
  description,
  children,
}: CanvasContainerProps) {
  return (
    <section className="flex min-h-[320px] flex-1 flex-col rounded-xl border border-surface-border bg-canvas shadow-inner-glow">
      <div className="border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      <div className="relative flex flex-1 items-center justify-center p-4">
        {children ?? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-32 w-full max-w-md rounded-lg border border-dashed border-surface-border bg-surface/50" />
            <p className="text-sm text-muted">
              4D Gaussian engine canvas mounts here
            </p>
            <p className="text-xs text-muted/80">
              Sprint F3+ — embed @4th-dimension/engine
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
