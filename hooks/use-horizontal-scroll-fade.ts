import { useEffect, useState, type RefObject } from 'react';

export function useHorizontalScrollFade(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setShowLeftFade(el.scrollLeft > 2);
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };

    update();
    const raf = requestAnimationFrame(update);
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);

  return { showLeftFade, showRightFade };
}
