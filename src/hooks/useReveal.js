import { useEffect, useRef, useState } from 'react';

// Adds the 'revealed' class once the element scrolls into view (threshold 0.12).
export function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('revealed');
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

// Animated integer counter with ease-out. Respects prefers-reduced-motion.
export function useCountUp(target, durationMs = 1200, started = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started) return undefined;
    const finalTarget = Math.max(0, Math.round(Number(target) || 0));

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setValue(finalTarget);
      return undefined;
    }

    let rafId = 0;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(finalTarget * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, started]);

  return value;
}
