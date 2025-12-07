/**
 * Hook pour gérer la segmentation des messages de chat
 * Transforme les réponses longues en messages segmentés progressifs
 */

import { useState, useCallback, useRef } from 'react';

export interface ChatSegment {
  id: string;
  time: string;
  emoji: string;
  content: string;
  isAction?: boolean;
  actionData?: {
    text: string;
    hint: string;
    onClick: () => void;
  };
}

interface UseChatSegmentationReturn {
  segments: ChatSegment[];
  addSegment: (emoji: string, content: string, isAction?: boolean, actionData?: ChatSegment['actionData']) => void;
  addSegments: (segments: Omit<ChatSegment, 'id' | 'time'>[]) => Promise<void>;
  clearSegments: () => void;
  currentSegment: number;
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export function useChatSegmentation(): UseChatSegmentationReturn {
  const [segments, setSegments] = useState<ChatSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState(0);
  const segmentDelayRef = useRef(2000); // Délai par défaut de 2 secondes

  const addSegment = useCallback((
    emoji: string, 
    content: string, 
    isAction = false,
    actionData?: ChatSegment['actionData']
  ) => {
    const newSegment: ChatSegment = {
      id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: formatTime(new Date()),
      emoji,
      content,
      isAction,
      actionData,
    };

    setSegments(prev => {
      const updated = [...prev, newSegment];
      setCurrentSegment(updated.length - 1);
      return updated;
    });
  }, []);

  const addSegments = useCallback(async (
    newSegments: Omit<ChatSegment, 'id' | 'time'>[],
    delayMs: number = 2000
  ) => {
    for (let i = 0; i < newSegments.length; i++) {
      const segment = newSegments[i];
      addSegment(segment.emoji, segment.content, segment.isAction, segment.actionData);
      
      // Attendre avant d'ajouter le segment suivant (sauf pour le dernier)
      if (i < newSegments.length - 1) {
        await delay(delayMs);
      }
    }
  }, [addSegment]);

  const clearSegments = useCallback(() => {
    setSegments([]);
    setCurrentSegment(0);
  }, []);

  return {
    segments,
    addSegment,
    addSegments,
    clearSegments,
    currentSegment,
  };
}


