'use client';

import { useEffect } from 'react';
import * as sound from '@/lib/sound';

export default function SoundFx() {
  useEffect(() => {
    sound.armAutoStart();

    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(
        'a, button, [role="button"], input[type="file"], [data-click]',
      );
      if (el) sound.click();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (!typing) return;
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') sound.key();
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return null;
}
