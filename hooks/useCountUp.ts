'use client';

import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number; // ms
  decimals?: number;
  delay?: number; // ms before starting
  enabled?: boolean;
}

/**
 * Animasyonlu sayı artış hook'u.
 * Dashboard KPI kartlarında sayıların yukarı doğru animasyonla gelmesini sağlar.
 */
export function useCountUp({
  start = 0,
  end,
  duration = 1200,
  decimals = 0,
  delay = 0,
  enabled = true,
}: UseCountUpOptions): number {
  const [value, setValue] = useState(enabled ? start : end);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const prevEndRef = useRef(end);

  useEffect(() => {
    if (!enabled) {
      setValue(end);
      return;
    }

    // If the target value changed, animate from current value
    const animStart = prevEndRef.current !== end ? value : start;
    prevEndRef.current = end;

    const startAnimation = () => {
      startTimeRef.current = null;

      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Easing: easeOutExpo for a snappy feel
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = animStart + (end - animStart) * eased;

        setValue(Number(current.toFixed(decimals)));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    const delayTimer = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(delayTimer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, enabled]);

  return value;
}
