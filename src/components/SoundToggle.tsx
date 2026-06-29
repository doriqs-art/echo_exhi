'use client';

import { useEffect, useState } from 'react';
import * as sound from '@/lib/sound';

export default function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => sound.subscribe(setOn), []);

  return (
    <button
      type="button"
      data-sound-toggle
      onClick={() => sound.toggle()}
      aria-label={on ? 'Mute sound' : 'Turn sound on'}
      aria-pressed={on}
      title={on ? 'Mute' : 'Sound on'}
      className="echo-cta grid place-items-center"
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.35)',
        color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
        {on ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 5a9 9 0 0 1 0 14" />
          </>
        ) : (
          <>
            <path d="M22 9l-6 6" />
            <path d="M16 9l6 6" />
          </>
        )}
      </svg>
    </button>
  );
}
