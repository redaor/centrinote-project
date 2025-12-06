/**
 * Mini-jeu pour débloquer le support humain
 * Trouve 3 icônes support dans une grille 3x3
 */

import React, { useState, useEffect } from 'react';
import { Target, Rocket, Lightbulb, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SupportMiniGameProps {
  onComplete: () => void;
  onSkip: () => void;
  darkMode: boolean;
}

type CellType = 'empty' | 'target' | 'bonus' | 'found';

interface Cell {
  id: number;
  type: CellType;
  icon?: 'target' | 'rocket' | 'lightbulb' | 'star';
  found: boolean;
}

const TARGET_ICONS = ['target', 'rocket', 'lightbulb'] as const;
const BONUS_ICON = 'star';

export function SupportMiniGame({ onComplete, onSkip, darkMode }: SupportMiniGameProps) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Set<number>>(new Set());

  // Initialiser la grille
  useEffect(() => {
    if (!gameStarted) return;

    const gridSize = 9;
    const newCells: Cell[] = Array.from({ length: gridSize }, (_, i) => ({
      id: i,
      type: 'empty',
      found: false
    }));

    // Placer les 3 icônes cibles
    const targetPositions = [0, 1, 2].map(() => 
      Math.floor(Math.random() * gridSize)
    ).filter((v, i, arr) => arr.indexOf(v) === i); // Éviter les doublons

    targetPositions.slice(0, 3).forEach((pos, index) => {
      newCells[pos] = {
        id: pos,
        type: 'target',
        icon: TARGET_ICONS[index],
        found: false
      };
    });

    // Placer 1 bonus (étoile) dans une position aléatoire non utilisée
    const emptyPositions = newCells
      .map((cell, idx) => cell.type === 'empty' ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (emptyPositions.length > 0) {
      const bonusPos = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
      newCells[bonusPos] = {
        id: bonusPos,
        type: 'bonus',
        icon: 'star',
        found: false
      };
    }

    setCells(newCells);
    setScore(0);
    setRevealedCells(new Set());
  }, [gameStarted]);

  const handleCellClick = (cellId: number) => {
    if (revealedCells.has(cellId) || gameComplete) return;

    const cell = cells[cellId];
    if (!cell) return;

    const newRevealed = new Set(revealedCells);
    newRevealed.add(cellId);
    setRevealedCells(newRevealed);

    if (cell.type === 'target') {
      const newScore = score + 1;
      setScore(newScore);

      // Mettre à jour la cellule comme trouvée
      setCells(prev => prev.map(c => 
        c.id === cellId ? { ...c, found: true } : c
      ));

      // Vérifier si le jeu est terminé
      if (newScore >= 3) {
        setGameComplete(true);
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    } else if (cell.type === 'bonus') {
      // Bonus : révéler une cellule aléatoire non révélée
      const hiddenCells = cells
        .map((c, idx) => !newRevealed.has(idx) && c.type === 'target' ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (hiddenCells.length > 0) {
        const bonusReveal = hiddenCells[Math.floor(Math.random() * hiddenCells.length)];
        const bonusRevealed = new Set(newRevealed);
        bonusRevealed.add(bonusReveal);
        setRevealedCells(bonusRevealed);
        
        setCells(prev => prev.map(c => 
          c.id === bonusReveal ? { ...c, found: true } : c
        ));
        
        const newScore = score + 1;
        setScore(newScore);
        
        if (newScore >= 3) {
          setGameComplete(true);
          setTimeout(() => {
            onComplete();
          }, 1500);
        }
      }
    }
  };

  const getIcon = (iconType?: string) => {
    switch (iconType) {
      case 'target':
        return <Target className="w-6 h-6" />;
      case 'rocket':
        return <Rocket className="w-6 h-6" />;
      case 'lightbulb':
        return <Lightbulb className="w-6 h-6" />;
      case 'star':
        return <Star className="w-6 h-6" />;
      default:
        return null;
    }
  };

  if (!gameStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          p-6 rounded-xl border
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        `}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🎮</div>
          <h3 className={`
            text-xl font-bold mb-2
            ${darkMode ? 'text-white' : 'text-gray-900'}
          `}>
            Challenge Support Express!
          </h3>
          <p className={`
            text-sm mb-4
            ${darkMode ? 'text-gray-400' : 'text-gray-600'}
          `}>
            Trouve 3 icônes support : 🎯 🚀 💡
          </p>
          <p className={`
            text-xs
            ${darkMode ? 'text-gray-500' : 'text-gray-500'}
          `}>
            ⭐ = Bonus (révèle une icône automatiquement)
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setGameStarted(true)}
            className={`
              flex-1 px-4 py-3 rounded-lg font-medium transition-all
              bg-gradient-to-r from-blue-500 to-purple-500 text-white
              hover:shadow-lg hover:scale-105
            `}
          >
            🎮 Jouer
          </button>
          <button
            onClick={onSkip}
            className={`
              flex-1 px-4 py-3 rounded-lg font-medium transition-all
              ${darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            Passer
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-6 rounded-xl border
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      `}
    >
      <div className="text-center mb-4">
        <h3 className={`
          text-lg font-bold mb-2
          ${darkMode ? 'text-white' : 'text-gray-900'}
        `}>
          Trouve 3 icônes support : 🎯 🚀 💡
        </h3>
        <div className="flex items-center justify-center gap-4">
          <span className={`
            text-sm font-medium
            ${darkMode ? 'text-gray-300' : 'text-gray-700'}
          `}>
            Score: {score}/3
          </span>
          <span className="text-2xl">🏆</span>
        </div>
      </div>

      {/* Grille 3x3 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {cells.map((cell) => {
          const isRevealed = revealedCells.has(cell.id);
          const isFound = cell.found;
          
          return (
            <motion.button
              key={cell.id}
              onClick={() => handleCellClick(cell.id)}
              disabled={isRevealed || gameComplete}
              whileHover={!isRevealed && !gameComplete ? { scale: 1.05 } : {}}
              whileTap={!isRevealed && !gameComplete ? { scale: 0.95 } : {}}
              className={`
                aspect-square rounded-lg border-2 transition-all
                ${isRevealed
                  ? cell.type === 'target' || isFound
                    ? 'bg-green-500 border-green-600 text-white'
                    : cell.type === 'bonus'
                    ? 'bg-yellow-500 border-yellow-600 text-white'
                    : 'bg-gray-300 border-gray-400 text-gray-600'
                  : darkMode
                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-400'
                  : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-500'
                }
                ${gameComplete ? 'cursor-default' : 'cursor-pointer'}
                flex items-center justify-center
              `}
            >
              {isRevealed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  {getIcon(cell.icon)}
                </motion.div>
              ) : (
                <span className="text-2xl">?</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {gameComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            text-center p-4 rounded-lg
            ${darkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'}
          `}
        >
          <div className="text-3xl mb-2">🎉</div>
          <p className={`
            font-bold
            ${darkMode ? 'text-green-400' : 'text-green-700'}
          `}>
            Challenge complété !
          </p>
          <p className={`
            text-sm mt-1
            ${darkMode ? 'text-green-300' : 'text-green-600'}
          `}>
            Débloquez le support avancé
          </p>
        </motion.div>
      )}

      {!gameComplete && (
        <button
          onClick={onSkip}
          className={`
            w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${darkMode 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          Passer le challenge
        </button>
      )}
    </motion.div>
  );
}

