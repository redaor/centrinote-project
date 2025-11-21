import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface FeedbackOptions {
  type: 'success' | 'warning' | 'error' | 'info' | 'reward';
  duration?: number;
  haptic?: boolean;
  sound?: boolean;
}

interface NeuroPulse {
  intensity: number;
  duration: number;
  pattern: 'pulse' | 'wave' | 'ripple';
}

export function useNeuroFeedback() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pulseEffect, setPulseEffect] = useState<NeuroPulse | null>(null);
  const [userPreferences] = useLocalStorage('neuro-preferences', {
    hapticEnabled: true,
    soundEnabled: true,
    animationsEnabled: true
  });

  // Trigger dopamine reward feedback
  const triggerReward = useCallback((message: string, options?: FeedbackOptions) => {
    setFeedbackMessage(message);
    setIsAnimating(true);
    
    // Neurological pulse effect
    setPulseEffect({
      intensity: options?.type === 'reward' ? 1.2 : 1,
      duration: options?.duration || 600,
      pattern: options?.type === 'reward' ? 'ripple' : 'pulse'
    });

    // Haptic feedback for mobile
    if (options?.haptic && userPreferences.hapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }

    // Sound feedback
    if (options?.sound && userPreferences.soundEnabled) {
      playFeedbackSound(options.type || 'success');
    }

    setTimeout(() => {
      setIsAnimating(false);
      setFeedbackMessage(null);
      setPulseEffect(null);
    }, options?.duration || 2000);
  }, [userPreferences]);

  // Attention-grabbing animation
  const focusAttention = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.add('neuro-focus');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
      element.classList.remove('neuro-focus');
    }, 1500);
  }, []);

  // Cognitive load indicator
  const [cognitiveLoad, setCognitiveLoad] = useState<'low' | 'medium' | 'high'>('low');
  
  const updateCognitiveLoad = useCallback((tasksCount: number) => {
    if (tasksCount < 3) setCognitiveLoad('low');
    else if (tasksCount < 7) setCognitiveLoad('medium');
    else setCognitiveLoad('high');
  }, []);

  return {
    isAnimating,
    feedbackMessage,
    pulseEffect,
    triggerReward,
    focusAttention,
    cognitiveLoad,
    updateCognitiveLoad
  };
}

// Helper function for sound feedback
function playFeedbackSound(type: string) {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  const frequencies: Record<string, number> = {
    success: 523.25, // C5
    reward: 659.25,  // E5
    warning: 440,    // A4
    error: 261.63,   // C4
    info: 392        // G4
  };
  
  oscillator.frequency.value = frequencies[type] || 440;
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}