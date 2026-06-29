'use client';

import { useEffect, useRef } from 'react';

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(pointer: coarse)').matches) return;

    document.documentElement.classList.add('has-custom-cursor');

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let cx = x;
    let cy = y;
    let raf = 0;

    el.style.opacity = '1';

    const show = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.style.opacity = '1';
      const interactive = (e.target as Element | null)?.closest?.(
        'a, button, input, label, [role="button"], [data-cursor]',
      );
      el.classList.toggle('cursor-hover', !!interactive);
    };
    const hide = () => {
      el.style.opacity = '0';
    };
    const onDown = (e: PointerEvent) => {
      el.classList.add('cursor-down');
      show(e);
    };
    const onUp = () => el.classList.remove('cursor-down');

    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) hide();
    };

    window.addEventListener('pointermove', show);
    window.addEventListener('pointerover', show);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointerout', onOut);
    window.addEventListener('blur', hide);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', show);
      window.removeEventListener('pointerover', show);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', hide);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  return <div ref={ref} aria-hidden className="echo-cursor" style={{ opacity: 0 }} />;
}
