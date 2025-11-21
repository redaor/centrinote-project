import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizAnswer {
  wordId: string;
  word: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
}

interface QuizResultsScreenProps {
  answers: QuizAnswer[];
  onRestart: () => void;
  onClose: () => void;
}

export function QuizResultsScreen({ answers, onRestart, onClose }: QuizResultsScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const correctCount = answers.filter(a => a.correct).length;
  const totalCount = answers.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

  // Messages encourageants selon le score
  const getMessage = () => {
    if (percentage >= 90) return "Excellent travail ! 🎉";
    if (percentage >= 70) return "Très bien ! Continue comme ça ! 💪";
    if (percentage >= 50) return "Bon début ! On progresse ! 📚";
    return "C'est en forgeant qu'on devient forgeron ! 🔥";
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // SVG Progress Ring
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Header avec Progress Ring */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg width="80" height="80" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="#E5E7EB"
                strokeWidth="6"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke={percentage >= 70 ? "#10B981" : percentage >= 50 ? "#F59E0B" : "#EF4444"}
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-[#111827]">
                {correctCount}/{totalCount}
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#111827] mb-2">Résultat</h2>
          <p className="text-sm text-gray-600">{getMessage()}</p>
        </div>

        {/* Liste des mots */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 space-y-3">
          <AnimatePresence>
            {answers.map((answer) => (
              <motion.div
                key={answer.wordId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="overflow-hidden"
              >
                {/* Chip cliquable */}
                <button
                  onClick={() => !answer.correct && toggleExpand(answer.wordId)}
                  disabled={answer.correct}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl
                    transition-all duration-200
                    ${answer.correct
                      ? 'bg-green-50 cursor-default'
                      : 'bg-red-50 hover:bg-red-100 cursor-pointer active:scale-[0.98]'
                    }
                  `}
                >
                  <span className="text-sm font-medium text-[#111827] text-left">
                    {answer.word}
                  </span>
                  <span className="flex-shrink-0 ml-3">
                    {answer.correct ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="10" fill="#10B981"/>
                        <path d="M6 10l2.5 2.5L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="10" fill="#EF4444"/>
                        <path d="M7 7l6 6M13 7l-6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </span>
                </button>

                {/* Correction dépliante (uniquement pour les erreurs) */}
                {!answer.correct && (
                  <motion.div
                    initial={false}
                    animate={{
                      height: expandedId === answer.wordId ? 'auto' : 0,
                      opacity: expandedId === answer.wordId ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 pb-1 px-4 space-y-2">
                      <div className="text-xs">
                        <span className="text-gray-500">Ta réponse : </span>
                        <span className="text-red-600 font-medium">
                          {answer.userAnswer.length > 60
                            ? answer.userAnswer.substring(0, 60) + '...'
                            : answer.userAnswer}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Bonne réponse : </span>
                        <span className="text-green-600 font-medium">
                          {answer.correctAnswer.length > 60
                            ? answer.correctAnswer.substring(0, 60) + '...'
                            : answer.correctAnswer}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Boutons d'action */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onRestart}
            className="w-full py-4 bg-[#3B82F6] text-white font-semibold rounded-xl shadow-sm hover:bg-[#2563EB] transition-colors duration-200"
          >
            Recommencer le quiz
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-4 bg-white text-gray-700 font-semibold rounded-xl shadow-sm hover:bg-gray-50 transition-colors duration-200 border border-gray-200"
          >
            Retour au vocabulaire
          </motion.button>
        </div>

        {/* Stats supplémentaires */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {percentage >= 80
              ? "Continue à réviser pour maintenir ce niveau !"
              : "Révise les mots marqués en rouge pour progresser."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
