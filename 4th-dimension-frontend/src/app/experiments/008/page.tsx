import type { Metadata } from 'next';
import { CompactDimensionExplorer } from '@/components/compact-dimension/CompactDimensionExplorer';

export const metadata: Metadata = {
  title: 'Experiment 008: Compact Extra Dimension Force Law | 4D Platform',
  description:
    'Interactive visualization and analytical verification of gravitational potential and force modifications in 3+n spatial dimensions on a compact torus.',
};

export default function Experiment008Page() {
  return <CompactDimensionExplorer />;
}
