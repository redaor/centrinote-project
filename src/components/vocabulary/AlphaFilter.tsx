import { FC, useEffect, useRef } from 'react';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface AlphaFilterProps {
  current: string | null; // null = "toutes"
  onSelect: (letter: string | null) => void;
  darkMode?: boolean;
  wordCounts?: Map<string, number>; // Compteur de mots par lettre
}

export const AlphaFilter: FC<AlphaFilterProps> = ({ 
  current, 
  onSelect, 
  darkMode = false,
  wordCounts = new Map()
}) => {
  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Scroll automatique vers la lettre sélectionnée avec snap fluide
  useEffect(() => {
    if (!navRef.current) return;
    
    if (current && navRef.current) {
      const button = buttonRefs.current.get(current);
      if (button && navRef.current) {
        const nav = navRef.current;
        const buttonLeft = button.offsetLeft;
        const buttonWidth = button.offsetWidth;
        const navWidth = nav.offsetWidth;
        
        // Calculer la position pour centrer la lettre sélectionnée
        // Ajuster pour que la lettre soit visible dans la fenêtre de 3-4 lettres
        const targetScroll = buttonLeft + buttonWidth / 2 - navWidth / 2;
        
        // Utiliser requestAnimationFrame pour un scroll plus fluide
        requestAnimationFrame(() => {
          if (navRef.current) {
            navRef.current.scrollTo({
              left: Math.max(0, targetScroll),
              behavior: 'smooth'
            });
          }
        });
      }
    } else if (current === null && navRef.current) {
      // Si "Tous" est sélectionné, scroll vers le début
      navRef.current.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    }
  }, [current]);

  return (
    <nav
      ref={navRef}
      className={`
        relative flex items-center gap-1.5 px-2 py-1.5 border-b overflow-x-auto scrollbar-hide
        ${darkMode ? 'border-gray-700' : 'border-gray-200'}
      `}
      aria-label="Filtrer par lettre"
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Toutes - compact */}
      <button
        onClick={() => onSelect(null)}
        className={`
          flex-shrink-0 px-2.5 py-1 text-xs rounded-md transition-all font-medium whitespace-nowrap
          scroll-snap-align-start
          ${current === null
            ? 'bg-blue-600 text-white shadow-sm'
            : darkMode
              ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }
        `}
        aria-current={current === null ? 'page' : undefined}
        aria-label="Afficher tous les mots"
      >
        Tous
      </button>

      {alphabet.map((letter) => {
        const count = wordCounts.get(letter) || 0;
        const hasWords = count > 0;
        
        return (
          <button
            key={letter}
            ref={(el) => {
              if (el) {
                buttonRefs.current.set(letter, el);
              } else {
                buttonRefs.current.delete(letter);
              }
            }}
            onClick={() => onSelect(letter)}
            disabled={!hasWords}
            className={`
              flex-shrink-0 w-8 h-8 flex items-center justify-center text-xs rounded-md 
              transition-all select-none font-semibold relative
              scroll-snap-align-center
              ${current === letter
                ? 'bg-blue-600 text-white shadow-md scale-110'
                : hasWords
                  ? darkMode
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white hover:scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                  : darkMode
                    ? 'text-gray-600 cursor-not-allowed opacity-40'
                    : 'text-gray-400 cursor-not-allowed opacity-40'
              }
            `}
            aria-current={current === letter ? 'page' : undefined}
            aria-label={`Filtrer par lettre ${letter}${hasWords ? ` (${count} mot${count > 1 ? 's' : ''})` : ' (aucun mot)'}`}
            title={hasWords ? `${count} mot${count > 1 ? 's' : ''} commençant par ${letter}` : `Aucun mot commençant par ${letter}`}
          >
            <span className="text-xs font-bold leading-none">{letter}</span>
            {hasWords && count > 0 && (
              <span className={`
                absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center
                text-[9px] leading-none rounded-full font-bold
                ${current === letter 
                  ? 'bg-blue-500 text-white' 
                  : darkMode 
                    ? 'bg-gray-600 text-gray-200' 
                    : 'bg-gray-300 text-gray-700'
                }
              `}>
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

