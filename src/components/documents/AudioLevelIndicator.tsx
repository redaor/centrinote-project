/**
 * Indicateur de niveau audio en temps réel (VU meter)
 * Affiche un indicateur visuel qui réagit au niveau audio capté par le microphone
 */

import React, { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

interface AudioLevelIndicatorProps {
  stream: MediaStream | null;
  isRecording: boolean;
  darkMode?: boolean;
}

export function AudioLevelIndicator({ stream, isRecording, darkMode = false }: AudioLevelIndicatorProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!stream || !isRecording) {
      setAudioLevel(0);
      return;
    }

    // Créer l'audio context et analyser
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    // Fonction pour analyser le niveau audio
    const analyzeAudio = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Calculer le niveau moyen
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
      
      // Normaliser entre 0 et 100 (avec amplification pour meilleure visibilité)
      const normalizedLevel = Math.min((average / 255) * 100 * 2, 100);
      setAudioLevel(normalizedLevel);

      if (isRecording && stream) {
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      }
    };

    analyzeAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stream, isRecording]);

  if (!isRecording) {
    return null;
  }

  // Couleur basée sur le niveau audio
  const getLevelColor = (level: number) => {
    if (level < 20) return darkMode ? 'bg-gray-600' : 'bg-gray-300';
    if (level < 50) return 'bg-green-500';
    if (level < 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Nombre de barres à afficher (5 barres)
  const bars = 5;
  const barHeight = 4;
  const barSpacing = 2;

  return (
    <div className="flex items-center gap-2">
      {/* Icône micro */}
      <Mic 
        className={`w-4 h-4 transition-colors ${
          audioLevel > 20 
            ? 'text-red-500 animate-pulse' 
            : darkMode ? 'text-gray-400' : 'text-gray-500'
        }`} 
      />
      
      {/* Barres de niveau audio */}
      <div className="flex items-center gap-1">
        {Array.from({ length: bars }).map((_, index) => {
          const threshold = ((index + 1) / bars) * 100;
          const isActive = audioLevel >= threshold;
          const intensity = isActive ? Math.min((audioLevel - threshold) / (100 / bars), 1) : 0;
          
          return (
            <div
              key={index}
              className={`transition-all duration-75 rounded-full ${
                isActive 
                  ? getLevelColor(audioLevel) 
                  : darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
              style={{
                width: `${barHeight}px`,
                height: `${barHeight}px`,
                opacity: isActive ? 0.5 + (intensity * 0.5) : 0.3,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}


