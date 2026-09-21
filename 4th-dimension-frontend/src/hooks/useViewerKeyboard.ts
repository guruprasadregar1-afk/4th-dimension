'use client';

import { useEffect } from 'react';
import { useSceneInteractionStore } from '@/stores/sceneInteractionStore';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

/** Space toggles play/pause when focus is not in a form control. */
export function useViewerKeyboard(enabled = true): void {
  const togglePlay = useSceneInteractionStore((s) => s.togglePlay);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      togglePlay();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, togglePlay]);
}
