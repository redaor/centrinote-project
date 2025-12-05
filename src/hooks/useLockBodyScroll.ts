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

    // 2. Détecte si l'événement vient d'une zone scrollable autorisée
    const isInsideModalScrollable = (e: Event) => {
      const target = e.target as HTMLElement;
      return target.closest('.modal-scrollable') !== null;
    };

    // 3. Bloque uniquement les scrolls en dehors des zones autorisées
    const onWheel = (e: WheelEvent) => {
      if (!isInsideModalScrollable(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isInsideModalScrollable(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });

    return () => {
      // Restaure
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);

      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [isLocked]);
};
