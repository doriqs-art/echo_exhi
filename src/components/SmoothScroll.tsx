'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {

    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    const lenis = new Lenis({
      lerp: 0.075,
      wheelMultiplier: 0.85,
      syncTouch: true,
    });
    lenisRef.current = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const tickerCb = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerCb);
    gsap.ticker.lagSmoothing(0);

    const onAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href) return;

      const url = new URL(target.href, window.location.href);
      const samePage = url.pathname === window.location.pathname && url.hash;
      if (!samePage) return;

      const el = document.querySelector(url.hash) as HTMLElement | null;
      if (!el) return;

      e.preventDefault();
      lenis.scrollTo(el, {
        offset: 0,
        duration: 1.8,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    };
    document.addEventListener('click', onAnchorClick, { capture: true });

    const blockMiddleClickAutoscroll = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };
    document.addEventListener('mousedown', blockMiddleClickAutoscroll);

    lenis.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();

    return () => {
      document.removeEventListener('click', onAnchorClick, { capture: true });
      document.removeEventListener('mousedown', blockMiddleClickAutoscroll);
      gsap.ticker.remove(tickerCb);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);

  return null;
}
