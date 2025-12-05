import { FC, useEffect, useRef } from 'react';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface AlphaFilterVerticalProps {
  current: string | null; // null = "toutes"
  onSelect: (letter: string | null) => void;
  darkMode?: boolean;
  wordCounts?: Map<string, number>; // Compteur de mots par lettre
}

export const AlphaFilterVertical: FC<AlphaFilterVerticalProps> = ({ 
  current, 
  onSelect, 
  darkMode = false,
  wordCounts = new Map()
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Scroll automatique vers la lettre sélectionnée avec snap fluide
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (current && containerRef.current) {
      const button = buttonRefs.current.get(current);
      if (button && containerRef.current) {
        const container = containerRef.current;
        const buttonTop = button.offsetTop;
        const buttonHeight = button.offsetHeight;
        const containerHeight = container.offsetHeight;
        const containerScrollTop = container.scrollTop;
        
        // Calculer la position pour centrer la lettre sélectionnée dans la fenêtre visible
        // Afficher 2-3 lettres à la fois (chaque lettre fait h-14 = 56px + gap 6px = 62px)
        // On veut centrer la lettre dans la fenêtre visible
        const targetScroll = buttonTop + buttonHeight / 2 - containerHeight / 2;
        
        // Utiliser requestAnimationFrame pour un scroll plus fluide
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: Math.max(0, targetScroll),
              behavior: 'smooth'
            });
          }
        });
      }
    } else if (current === null && containerRef.current) {
      // Si "Tous" est sélectionné, scroll vers le début
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [current]);

  return (
    <div
      ref={containerRef}
      className={`
        relative w-16 flex flex-col gap-1 overflow-y-auto scrollbar-hide px-0.5 py-1
        ${darkMode ? 'border-r border-gray-700' : 'border-r border-gray-200'}
      `}
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        // Hauteur optimisée pour afficher exactement 2-3 lettres (h-12 * 2.5 = ~150px)
        height: 'calc(12rem + 0.5rem)', // 3 lettres + gaps
        maxHeight: 'calc(100vh - 250px)', // S'adapte à l'espace disponible
      }}
      aria-label="Filtrer par lettre"
    >
      {/* Tous - ultra compact en haut */}
      <button
        onClick={() => onSelect(null)}
        className={`
          flex-shrink-0 w-full h-12 flex flex-col items-center justify-center rounded-md transition-all
          scroll-snap-align-start border
          ${current === null
            ? 'bg-blue-600 text-white shadow-md border-blue-500 ring-2 ring-blue-400'
            : darkMode
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
          }
        `}
        aria-current={current === null ? 'page' : undefined}
        aria-label="Afficher tous les mots"
      >
        <span className="text-xs font-bold leading-none">Tous</span>
        <span className={`
          text-[9px] mt-0.5 font-semibold leading-none
          ${current === null 
            ? 'text-blue-100' 
            : darkMode 
              ? 'text-gray-400' 
              : 'text-gray-600'
          }
        `}>
          {Array.from(wordCounts.values()).reduce((sum, count) => sum + count, 0)}
        </span>
      </button>

      {alphabet.map((letter) => {
        const count = wordCounts.get(letter) || 0;
        const hasWords = count > 0;
        const isSelected = current === letter;
        
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
              flex-shrink-0 w-full h-12 flex flex-col items-center justify-center rounded-md 
              transition-all select-none relative border
              scroll-snap-align-center
              ${isSelected
                ? 'bg-blue-600 text-white shadow-lg scale-105 border-blue-500 ring-2 ring-blue-400'
                : hasWords
                  ? darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white hover:scale-102 border-gray-700'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-102 border-gray-200'
                  : darkMode
                    ? 'bg-gray-900 text-gray-600 cursor-not-allowed opacity-30 border-gray-800'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-30 border-gray-200'
              }
            `}
            aria-current={isSelected ? 'page' : undefined}
            aria-label={`Filtrer par lettre ${letter}${hasWords ? ` (${count} mot${count > 1 ? 's' : ''})` : ' (aucun mot)'}`}
            title={hasWords ? `${count} mot${count > 1 ? 's' : ''} commençant par ${letter}` : `Aucun mot commençant par ${letter}`}
          >
            {/* Lettre principale */}
            <span className={`
              text-base font-bold leading-none
              ${isSelected ? 'text-white' : ''}
            `}>
              {letter}
            </span>
            
            {/* Badge avec nombre de résultats - compact */}
            {hasWords && count > 0 && (
              <span className={`
                absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center
                text-[9px] font-bold leading-none rounded-full
                ${isSelected 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : darkMode 
                    ? 'bg-gray-600 text-gray-200' 
                    : 'bg-gray-300 text-gray-700'
                }
              `}>
                {count > 9 ? '9+' : count}
              </span>
            )}
            
            {/* Indicateur visuel si sélectionné */}
            {isSelected && (
              <span className={`
                absolute bottom-0 left-0 right-0 h-0.5
                bg-white shadow-sm
              `} />
            )}
            
            {/* Indication si pas de mots */}
            {!hasWords && (
              <span className={`
                absolute top-0.5 right-0.5 w-1 h-1 rounded-full
                ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}
              `} />
            )}
          </button>
        );
      })}
    </div>
  );
};

