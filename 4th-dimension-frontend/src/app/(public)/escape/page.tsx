import type { Metadata } from 'next';
import { ImpossibleEscapeClient } from '@/components/escape/ImpossibleEscapeClient';

export const metadata: Metadata = {
  title: 'The Impossible Escape | 4D Interactive Learning Puzzle',
  description: 'Experience an impossible 2D and 3D escape, then solve it by stepping into the 4th dimension.',
};

export default function PublicEscapePage() {
  return <ImpossibleEscapeClient />;
}
