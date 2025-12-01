/**
 * Composant bouton d'enregistrement audio long (cours)
 * - S'intègre dans la barre d'outils des notes
 * - Affiche progress bar pendant l'enregistrement
 * - Bouton "Arrêter" et "➕ Nouvelle note" après chaque chunk
 */

import React, { useEffect } from 'react';
import { Mic, Square, Plus } from 'lucide-react';
import { useLongRecording } from '../../hooks/useLongRecording';
import { Button } from '../ui/Button';

interface LongRecButtonProps {
  noteId: string;
  noteContent: string;
  onContentAppend: (text: string) => void;
  onCreateNewNote?: () => void;
  darkMode?: boolean;
}

export function LongRecButton({
  noteId,
  noteContent,
  onContentAppend,
  onCreateNewNote,
  darkMode = false,
}: LongRecButtonProps) {
  const {
    isRecording,
    isTranscribing,
    currentChunk,
    elapsedTime,
    startRecording,
    stopRecording,
    transcribedText,
    error,
  } = useLongRecording();

  // Insérer le texte transcrit à la fin de la note avec horodatage
  useEffect(() => {
    if (transcribedText && currentChunk > 0) {
      const now = new Date();
      const timestamp = now.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const separator = noteContent.trim() ? '\n\n' : '';
      const chunkText = `${separator}--- Transcription chunk ${currentChunk} (${timestamp}) ---\n${transcribedText}`;

      onContentAppend(chunkText);
      console.log(`✅ Texte transcrit inséré dans la note ${noteId}`);
    }
  }, [transcribedText, currentChunk, noteId, noteContent, onContentAppend]);

  // Formater le temps écoulé (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculer le pourcentage de progression (30 min = 100%)
  const progressPercent = Math.min((elapsedTime / (30 * 60)) * 100, 100);

  return (
    <div className="flex flex-col gap-2">
      {/* Bouton principal */}
      {!isRecording ? (
        <Button
          variant="ghost"
          onClick={startRecording}
          className="gap-2 focus-visible:ring-2 focus-visible:ring-blue-400"
          disabled={isTranscribing}
          title="Enregistrer ce cours (30 min par chunk)"
        >
          <Mic className="w-4 h-4" />
          Enregistrer ce cours
        </Button>
      ) : (
        <Button
          variant="ghost"
          onClick={stopRecording}
          className="gap-2 focus-visible:ring-2 focus-visible:ring-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Arrêter l'enregistrement"
        >
          <Square className="w-4 h-4" />
          Arrêter
        </Button>
      )}

      {/* Progress bar et infos (visible uniquement pendant l'enregistrement) */}
      {isRecording && (
        <div className="flex flex-col gap-2 px-2 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Infos : temps écoulé et chunk */}
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              Chunk {currentChunk + 1} • {formatTime(elapsedTime)} / 30:00
            </span>
            {isTranscribing && (
              <span className="text-blue-600 dark:text-blue-400 animate-pulse">
                Transcription en cours...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bouton "➕ Nouvelle note" (actif après chaque chunk) */}
      {currentChunk > 0 && !isRecording && !isTranscribing && onCreateNewNote && (
        <Button
          variant="ghost"
          onClick={onCreateNewNote}
          className="gap-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 focus-visible:ring-2 focus-visible:ring-green-400"
          title="Créer une nouvelle note"
        >
          <Plus className="w-4 h-4" />
          Nouvelle note
        </Button>
      )}

      {/* Affichage erreur */}
      {error && (
        <div className="px-2 py-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

