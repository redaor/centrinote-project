/**
 * Composant bouton d'enregistrement audio long (cours)
 * - S'intègre dans la barre d'outils des notes
 * - Affiche progress bar pendant l'enregistrement
 * - Bouton "Arrêter" et "➕ Nouvelle note" après chaque chunk
 */

import React, { useEffect, useRef } from 'react';
import { Mic, Square, Plus } from 'lucide-react';
import { useLongRecording } from '../../hooks/useLongRecording';
import { Button } from '../ui/Button';
import { AudioLevelIndicator } from './AudioLevelIndicator';

// Durée d'un chunk en millisecondes (30 minutes)
const CHUNK_DURATION_MS = 30 * 60 * 1000;

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
  // Vérifier si Supabase est configuré (nécessaire pour l'Edge Function)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey);

  const {
    isRecording,
    isTranscribing,
    currentChunk,
    elapsedTime,
    startRecording,
    stopRecording,
    transcribedText,
    error,
    audioStream,
    mergeTranscriptionChunks,
    isWakeLockActive, // ✅ Indicateur wake lock
  } = useLongRecording();
  
  // 🎯 Stocker les transcriptions précédentes pour fusion
  const previousTranscriptionsRef = useRef<Array<{ chunkNumber: number; text: string }>>([]);

  // Insérer le texte transcrit à la fin de la note avec horodatage (une seule fois par chunk)
  const lastProcessedChunkRef = useRef<number>(0);
  
  useEffect(() => {
    // Ne traiter que si on a un nouveau texte transcrit ET un nouveau chunk
    if (transcribedText && currentChunk > 0 && currentChunk !== lastProcessedChunkRef.current) {
      // 🎯 Vérifier s'il y a un chunk précédent à fusionner
      const previousTranscription = previousTranscriptionsRef.current.find(t => t.chunkNumber === currentChunk - 1);
      let finalText = transcribedText;
      
      if (previousTranscription && mergeTranscriptionChunks) {
        console.log(`🔄 Fusion transcription chunks ${currentChunk - 1} et ${currentChunk} dans LongRecButton...`);
        finalText = mergeTranscriptionChunks(previousTranscription.text, transcribedText);
        console.log(`✅ Fusion transcription chunk ${currentChunk - 1} et chunk ${currentChunk} terminée (${previousTranscription.text.length} + ${transcribedText.length} → ${finalText.length} caractères)`);
      }
      
      // Stocker cette transcription pour la fusion avec le prochain chunk
      const existingIndex = previousTranscriptionsRef.current.findIndex(t => t.chunkNumber === currentChunk);
      if (existingIndex >= 0) {
        previousTranscriptionsRef.current[existingIndex].text = finalText;
      } else {
        previousTranscriptionsRef.current.push({ chunkNumber: currentChunk, text: finalText });
      }
      
      const now = new Date();
      const timestamp = now.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const separator = noteContent.trim() ? '\n\n' : '';
      const chunkText = `${separator}--- Transcription chunk ${currentChunk} (${timestamp}) ---\n${finalText}`;

      onContentAppend(chunkText);
      lastProcessedChunkRef.current = currentChunk; // Marquer ce chunk comme traité
      console.log(`✅ Texte transcrit inséré dans la note ${noteId} (chunk ${currentChunk}${previousTranscription ? ', fusionné' : ''})`);
    }
  }, [transcribedText, currentChunk, noteId, onContentAppend, noteContent, mergeTranscriptionChunks]);

  // Formater le temps écoulé (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculer le pourcentage de progression (chunk duration = 100%)
  const CHUNK_DURATION_SECONDS = CHUNK_DURATION_MS / 1000;
  const progressPercent = Math.min((elapsedTime / CHUNK_DURATION_SECONDS) * 100, 100);

  // Si pas de configuration Supabase, afficher un message d'avertissement
  if (!hasSupabaseConfig) {
    return (
      <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
        Configuration Supabase manquante
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Bouton principal */}
      {!isRecording ? (
        <Button
          variant="ghost"
          onClick={startRecording}
          className="gap-2 focus-visible:ring-2 focus-visible:ring-blue-400"
          disabled={isTranscribing}
          title="Enregistrer ce cours"
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

          {/* Infos : temps écoulé, chunk et indicateur audio */}
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <span>
                Chunk {currentChunk + 1} • {formatTime(elapsedTime)}
              </span>
              {/* Indicateur de niveau audio */}
              <AudioLevelIndicator 
                stream={audioStream} 
                isRecording={isRecording}
                darkMode={darkMode}
              />
              {/* 🔋 Indicateur Wake Lock (écran allumé) */}
              {isWakeLockActive && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400" title="Écran maintenu allumé pendant l'enregistrement">
                  <Monitor className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            {isTranscribing && (
              <span className="text-blue-600 dark:text-blue-400 animate-pulse">
                Transcription en cours...
              </span>
            )}
          </div>
        </div>
      )}

      {/* 🎯 Indicateur de transcription (visible après l'arrêt de l'enregistrement) */}
      {!isRecording && isTranscribing && (
        <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="relative">
            <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Transcription en cours...
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {currentChunk > 0 ? `Chunk ${currentChunk}` : 'Traitement de l\'audio'} • Votre fichier est en cours de traitement
            </p>
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

