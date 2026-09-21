import type { Metadata } from 'next';
import { ImportPanel } from '@/components/imports/ImportPanel';
import { SceneLibrary } from '@/components/scenes/SceneLibrary';

export const metadata: Metadata = {
  title: 'Scene Library',
};

export default function ScenesPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Scene Library</h1>
        <p className="mt-1 text-sm text-muted">
          Import Gaussian models, browse your library, and open scenes in the 4D
          viewer.
        </p>
      </div>
      <ImportPanel />
      <SceneLibrary />
    </div>
  );
}
