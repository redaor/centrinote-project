/**
 * 🎯 Hook pour déclencher un hint visuel avant d'atteindre une zone
 * Usage: const { ref, shouldShowHint } = useScrollHint({ threshold: 0.3, triggerOnce: true });
 */

import { useEffect, useRef, useState } from 'react';

interface UseScrollHintOptions {
  /** Déclencher à X% avant d'atteindre l'élément (0.3 = 30% avant) */
  threshold?: number;
  /** Ne déclencher qu'une seule fois */
  triggerOnce?: boolean;
  /** Respecter prefers-reduced-motion */
  respectReducedMotion?: boolean;
}

export function useScrollHint(options: UseScrollHintOptions = {}) {
  const {
    threshold = 0.3,
    triggerOnce = true,
    respectReducedMotion = true
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [shouldShowHint, setShouldShowHint] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    // Respecter prefers-reduced-motion
    if (respectReducedMotion) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Déclencher quand l'élément est visible à X% (avant d'y arriver complètement)
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (!hasTriggered || !triggerOnce) {
            setShouldShowHint(true);
            if (triggerOnce) setHasTriggered(true);

            // Auto-reset après 3s
            setTimeout(() => setShouldShowHint(false), 3000);
          }
        }
      },
      { threshold: [threshold] }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, triggerOnce, hasTriggered, respectReducedMotion]);

  return { ref, shouldShowHint };
}
