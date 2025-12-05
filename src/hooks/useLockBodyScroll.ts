import { useEffect } from 'react';

export const useLockBodyScroll = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;

    const scrollY = window.scrollY;

    // 1. Bloque le body
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    // 2. Bloque tous les scrolls globaux
    const block = (e: Event) => e.preventDefault();
    window.addEventListener('scroll', block, { capture: true });
    window.addEventListener('wheel', block, { passive: false });
    window.addEventListener('touchmove', block, { passive: false });

    return () => {
      // Restaure
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);

      window.removeEventListener('scroll', block, { capture: true });
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchmove', block);
    };
  }, [isLocked]);
};
