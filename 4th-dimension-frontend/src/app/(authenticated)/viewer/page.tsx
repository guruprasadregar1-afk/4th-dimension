import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '4D Viewer',
};

const ViewerPageClient = dynamic(
  () => import('@/components/viewer/ViewerPageClient'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Loading 4D viewer…
      </div>
    ),
  },
);

export default function ViewerPage() {
  return <ViewerPageClient />;
}
