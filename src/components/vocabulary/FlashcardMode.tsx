import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react';
import { VocabularyEntry } from '../../types';

interface FlashcardModeProps {
  vocabulary: VocabularyEntry[];
  darkMode: boolean;
  onClose: () => void;
  onUpdateMastery: (word: VocabularyEntry, mastery: number) => Promise<void>;
}

// ✅ Mémoïser le composant pour éviter les re-renders non nécessaires
export const FlashcardMode = React.memo(function FlashcardMode({ vocabulary, darkMode, onClose, onUpdateMastery }: FlashcardModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCards, setReviewedCards] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [toReviewCount, setToReviewCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // ✅ Suivi de l'état de chaque carte (pas encore répondu / je sais / à revoir)
  const [cardAnswers, setCardAnswers] = useState<Map<string, 'known' | 'review' | null>>(new Map());

  // ✅ Créer un snapshot du vocabulaire au montage pour éviter les changements pendant la session
  const [sortedVocabulary] = useState(() => {
    const sorted = [...vocabulary].sort((a, b) => a.mastery - b.mastery);
    console.log('📚 [FlashcardMode] Snapshot créé avec', sorted.length, 'mots');
    return sorted;
  });

  const currentCard = sortedVocabulary[currentIndex];
  const progress = ((reviewedCards / sortedVocabulary.length) * 100).toFixed(0);

  // Debug: Logger l'état actuel
  useEffect(() => {
    console.log('📍 [FlashcardMode] État actuel:', {
      currentIndex,
      totalCards: sortedVocabulary.length,
      hasCurrentCard: !!currentCard,
      currentWord: currentCard?.word,
      knownCount,
      toReviewCount,
      reviewedCards,
      isComplete
    });
  }, [currentIndex, knownCount, toReviewCount, reviewedCards, isComplete, currentCard, sortedVocabulary.length]);

  useEffect(() => {
    // Réinitialiser le flip quand on change de carte
    setIsFlipped(false);
  }, [currentIndex]);

  const handleFlip = () => {
    console.log('🎴 Flip clicked! Current state:', isFlipped);
    setIsFlipped(!isFlipped);
  };

  const handleKnown = async () => {
    if (!currentCard) return;

    console.log('✅ Je sais clicked - Before:', {
      knownCount,
      reviewedCards,
      currentIndex,
      totalCards: sortedVocabulary.length,
      currentCardId: currentCard.id,
      currentCardWord: currentCard.word
    });

    // ✅ Vérifier l'état précédent de cette carte
    const previousAnswer = cardAnswers.get(currentCard.id);

    // Mettre à jour les compteurs en fonction de l'état précédent
    setKnownCount(prev => {
      if (previousAnswer === 'known') {
        // Déjà marqué comme "Je sais", ne rien changer
        console.log('✅ Carte déjà marquée comme "Je sais"');
        return prev;
      } else if (previousAnswer === 'review') {
        // Était "À revoir", transférer vers "Je sais"
        console.log('✅ Transfert de "À revoir" vers "Je sais"');
        return prev + 1;
      } else {
        // Première réponse, ajouter à "Je sais"
        console.log('✅ Première réponse: "Je sais"');
        return prev + 1;
      }
    });

    setToReviewCount(prev => {
      if (previousAnswer === 'review') {
        // Retirer de "À revoir"
        return prev - 1;
      }
      return prev;
    });

    // ✅ Enregistrer l'état de cette carte
    setCardAnswers(prev => new Map(prev).set(currentCard.id, 'known'));

    // Augmenter la maîtrise de 20 points (max 100)
    const newMastery = Math.min(currentCard.mastery + 20, 100);
    console.log(`✅ Updating mastery for "${currentCard.word}": ${currentCard.mastery} → ${newMastery}`);
    await onUpdateMastery(currentCard, newMastery);

    // ✅ NE PLUS AVANCER AUTOMATIQUEMENT - laisser l'utilisateur contrôler
    console.log('✅ Réponse enregistrée - utilisateur peut maintenant naviguer manuellement');
  };

  const handleToReview = async () => {
    if (!currentCard) return;

    console.log('❌ À revoir clicked - Before:', { toReviewCount, reviewedCards });

    // ✅ Vérifier l'état précédent de cette carte
    const previousAnswer = cardAnswers.get(currentCard.id);

    // Mettre à jour les compteurs en fonction de l'état précédent
    setToReviewCount(prev => {
      if (previousAnswer === 'review') {
        // Déjà marqué comme "À revoir", ne rien changer
        console.log('❌ Carte déjà marquée comme "À revoir"');
        return prev;
      } else if (previousAnswer === 'known') {
        // Était "Je sais", transférer vers "À revoir"
        console.log('❌ Transfert de "Je sais" vers "À revoir"');
        return prev + 1;
      } else {
        // Première réponse, ajouter à "À revoir"
        console.log('❌ Première réponse: "À revoir"');
        return prev + 1;
      }
    });

    setKnownCount(prev => {
      if (previousAnswer === 'known') {
        // Retirer de "Je sais"
        return prev - 1;
      }
      return prev;
    });

    // ✅ Enregistrer l'état de cette carte
    setCardAnswers(prev => new Map(prev).set(currentCard.id, 'review'));

    // Diminuer la maîtrise de 10 points (min 0)
    const newMastery = Math.max(currentCard.mastery - 10, 0);
    console.log(`❌ Updating mastery for "${currentCard.word}": ${currentCard.mastery} → ${newMastery}`);
    await onUpdateMastery(currentCard, newMastery);

    // ✅ NE PLUS AVANCER AUTOMATIQUEMENT - laisser l'utilisateur contrôler
    console.log('❌ Réponse enregistrée - utilisateur peut maintenant naviguer manuellement');
  };

  const goToNextCard = () => {
    console.log('➡️ Going to next card. Current index:', currentIndex, '/', sortedVocabulary.length - 1);

    setReviewedCards(prev => {
      const newCount = prev + 1;
      console.log('📊 Reviewed cards updated:', newCount);
      return newCount;
    });

    if (currentIndex < sortedVocabulary.length - 1) {
      setCurrentIndex(prev => prev + 1);
      console.log('➡️ Moving to next card');
    } else {
      // Fin de la session
      console.log('🏁 Session complete!');
      setIsComplete(true);
    }
  };

  const goToPreviousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setReviewedCards(prev => Math.max(prev - 1, 0));
    }
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setReviewedCards(0);
    setKnownCount(0);
    setToReviewCount(0);
    setIsComplete(false);
    setIsFlipped(false);
    setCardAnswers(new Map()); // ✅ Réinitialiser l'état des cartes
  };

  if (sortedVocabulary.length === 0) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${
        darkMode ? 'bg-gray-900/95' : 'bg-gray-100/95'
      } backdrop-blur-sm`}>
        <div className={`p-8 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-2xl max-w-md text-center`}>
          <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Aucun mot à réviser
          </h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Ajoute des mots de vocabulaire pour commencer tes révisions !
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    // ✅ Calculer les stats basées sur les cartes qui ont reçu une réponse
    const answeredCards = sortedVocabulary.filter(card => cardAnswers.get(card.id));
    const totalAnsweredCards = answeredCards.length;
    const masteryPercentage = totalAnsweredCards > 0
      ? ((knownCount / totalAnsweredCards) * 100).toFixed(0)
      : '0';
    const isPerfect = knownCount === totalAnsweredCards && totalAnsweredCards > 0;
    const isGood = parseFloat(masteryPercentage) >= 70;

    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${
        darkMode ? 'bg-gray-900/95' : 'bg-gray-100/95'
      } backdrop-blur-sm`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-8 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-2xl max-w-2xl w-full mx-4`}
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-6xl mb-6"
            >
              {isPerfect ? '🏆' : isGood ? '✨' : '💪'}
            </motion.div>

            <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Session terminée !
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cartes révisées</p>
                <p className="text-3xl font-bold text-blue-500">{reviewedCards}</p>
              </div>
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Je sais</p>
                <p className="text-3xl font-bold text-green-500">{knownCount}</p>
              </div>
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>À revoir</p>
                <p className="text-3xl font-bold text-red-500">{toReviewCount}</p>
              </div>
            </div>

            <p className={`text-lg mb-8 ${
              isPerfect ? 'text-green-500' : isGood ? 'text-blue-500' : darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {isPerfect
                ? '🎉 Parfait ! Tu maîtrises tous ces mots !'
                : isGood
                  ? '👏 Excellent travail ! Continue comme ça !'
                  : '💡 Continue à réviser, tu progresses !'}
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={restartSession}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Recommencer
              </button>
              <button
                onClick={onClose}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Retour au vocabulaire
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${
      darkMode ? 'bg-gray-900/95' : 'bg-gray-100/95'
    } backdrop-blur-sm`}>
      {/* Header */}
      <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🎴 Mode Révision
            </h2>
            <button
              onClick={onClose}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              <X className="w-4 h-4" />
              <span>Quitter</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                Carte {currentIndex + 1} / {sortedVocabulary.length}
              </span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {progress}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-blue-500 to-teal-500"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-700 dark:text-green-300">
                Je sais: <span className="font-bold text-xl">{knownCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="font-medium text-red-700 dark:text-red-300">
                À revoir: <span className="font-bold text-xl">{toReviewCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 overflow-y-auto">
        <div className="w-full max-w-2xl flex flex-col items-center gap-3 my-auto">
          <div
            className="relative w-full cursor-pointer hover:scale-102 transition-transform duration-200"
            style={{ perspective: '1000px', maxHeight: '320px', aspectRatio: '3/2' }}
            onClick={handleFlip}
          >
            <motion.div
              className="relative w-full h-full"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring' }}
            >
              {/* Front (Mot) */}
              <div
                className={`absolute inset-0 rounded-2xl shadow-2xl p-5 flex flex-col items-center justify-center ${
                  // Feedback visuel après réponse
                  cardAnswers.get(currentCard.id) === 'known'
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                    : cardAnswers.get(currentCard.id) === 'review'
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500'
                      : darkMode ? 'bg-gray-800 border-2 border-gray-700' : 'bg-white border-2 border-gray-200'
                }`}
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <p className={`text-xs uppercase tracking-wide mb-1.5 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Devine la définition
                </p>
                <h3 className={`text-2xl md:text-3xl font-bold text-center mb-2.5 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {currentCard.word}
                </h3>
                {currentCard.category && (
                  <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium">
                    {currentCard.category}
                  </span>
                )}
                <div className="mt-2.5 flex flex-col items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlip();
                    }}
                    className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl text-sm"
                  >
                    📖 Voir la définition
                  </button>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    ou clique sur la carte
                  </p>
                </div>
              </div>

              {/* Back (Définition) */}
              <div
                className={`absolute inset-0 rounded-2xl shadow-2xl p-5 flex flex-col items-center justify-center text-white ${
                  // Feedback visuel après réponse
                  cardAnswers.get(currentCard.id) === 'known'
                    ? 'bg-gradient-to-br from-green-600 to-emerald-600 border-2 border-green-400'
                    : cardAnswers.get(currentCard.id) === 'review'
                      ? 'bg-gradient-to-br from-orange-600 to-red-600 border-2 border-orange-400'
                      : darkMode
                        ? 'bg-gradient-to-br from-blue-900 to-purple-900 border-2 border-transparent'
                        : 'bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-transparent'
                }`}
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className="text-xs uppercase tracking-wide mb-1.5 opacity-80">
                  Définition
                </p>
                <p className="text-base md:text-lg text-center leading-relaxed mb-2.5">
                  {currentCard.definition}
                </p>
                {currentCard.examples && currentCard.examples.length > 0 && (
                  <div className="mt-1.5 p-2.5 rounded-lg bg-white/10 backdrop-blur-sm">
                    <p className="text-xs opacity-80 mb-0.5">Exemple :</p>
                    <p className="text-xs italic">{currentCard.examples[0]}</p>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFlip();
                  }}
                  className="mt-3 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs transition-all"
                >
                  Retourner la carte
                </button>
              </div>
            </motion.div>
          </div>

          {/* Action buttons */}
          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex gap-3 w-full justify-center"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToReview();
                  }}
                  className={`flex-1 max-w-xs px-6 py-3 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${
                    cardAnswers.get(currentCard.id) === 'review'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white ring-4 ring-red-300 dark:ring-red-800'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  À revoir
                  {cardAnswers.get(currentCard.id) === 'review' && (
                    <span className="ml-1 text-xs">✓</span>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKnown();
                  }}
                  className={`flex-1 max-w-xs px-6 py-3 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${
                    cardAnswers.get(currentCard.id) === 'known'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white ring-4 ring-green-300 dark:ring-green-800'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  Je sais
                  {cardAnswers.get(currentCard.id) === 'known' && (
                    <span className="ml-1 text-xs">✓</span>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation - Boutons avec texte pour plus de clarté */}
          <div className="flex gap-3 w-full justify-center items-center mt-2">
            <button
              onClick={goToPreviousCard}
              disabled={currentIndex === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                currentIndex === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : darkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-900'
              } shadow-md`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Carte précédente</span>
            </button>

            <button
              onClick={goToNextCard}
              disabled={!cardAnswers.has(currentCard.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                !cardAnswers.has(currentCard.id)
                  ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-700 text-gray-500'
                  : 'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl'
              }`}
              title={!cardAnswers.has(currentCard.id) ? 'Réponds d\'abord à cette carte' : 'Passer à la carte suivante'}
            >
              <span className="text-sm">Carte suivante</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
