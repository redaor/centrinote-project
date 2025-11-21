import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface UserBehavior {
  mostUsedFeatures: string[];
  lastActiveSection: string;
  activityPatterns: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  preferredViewMode: 'compact' | 'detailed' | 'visual';
  interactionCount: Record<string, number>;
}

interface AdaptiveContent {
  priority: 'high' | 'medium' | 'low';
  suggestions: string[];
  quickActions: Array<{
    label: string;
    action: () => void;
    icon: string;
  }>;
}

export function useAdaptiveView(userId?: string) {
  const [userBehavior, setUserBehavior] = useLocalStorage<UserBehavior>(
    `adaptive-behavior-${userId || 'default'}`,
    {
      mostUsedFeatures: [],
      lastActiveSection: 'dashboard',
      activityPatterns: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0
      },
      preferredViewMode: 'visual',
      interactionCount: {}
    }
  );

  const [adaptiveContent, setAdaptiveContent] = useState<AdaptiveContent>({
    priority: 'medium',
    suggestions: [],
    quickActions: []
  });

  // Track user interactions
  const trackInteraction = (feature: string) => {
    setUserBehavior(prev => {
      const updated = { ...prev };
      updated.interactionCount[feature] = (updated.interactionCount[feature] || 0) + 1;
      
      // Update most used features
      const sortedFeatures = Object.entries(updated.interactionCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([feature]) => feature);
      
      updated.mostUsedFeatures = sortedFeatures;
      updated.lastActiveSection = feature;
      
      // Track time patterns
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) updated.activityPatterns.morning++;
      else if (hour >= 12 && hour < 17) updated.activityPatterns.afternoon++;
      else if (hour >= 17 && hour < 22) updated.activityPatterns.evening++;
      else updated.activityPatterns.night++;
      
      return updated;
    });
  };

  // Generate personalized suggestions
  useEffect(() => {
    const generateSuggestions = () => {
      const suggestions: string[] = [];
      const currentHour = new Date().getHours();
      
      // Time-based suggestions
      if (currentHour >= 6 && currentHour < 10) {
        suggestions.push("☀️ Commencez la journée avec une révision rapide");
      } else if (currentHour >= 20 && currentHour < 23) {
        suggestions.push("🌙 Moment idéal pour planifier demain");
      }
      
      // Behavior-based suggestions
      if (userBehavior.mostUsedFeatures.includes('vocabulary')) {
        suggestions.push("📚 5 nouveaux mots vous attendent");
      }
      
      if (userBehavior.mostUsedFeatures.includes('meetings')) {
        suggestions.push("🎥 Préparez votre prochaine réunion");
      }
      
      // Activity pattern suggestions
      const mostActiveTime = Object.entries(userBehavior.activityPatterns)
        .sort(([, a], [, b]) => b - a)[0][0];
      
      if (mostActiveTime === 'morning' && currentHour >= 6 && currentHour < 12) {
        suggestions.push("🚀 Votre moment le plus productif!");
      }
      
      setAdaptiveContent(prev => ({
        ...prev,
        suggestions: suggestions.slice(0, 3)
      }));
    };
    
    generateSuggestions();
    const interval = setInterval(generateSuggestions, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [userBehavior]);

  // Adaptive layout based on preferences
  const getAdaptiveLayout = () => {
    const { preferredViewMode, mostUsedFeatures } = userBehavior;
    
    return {
      layout: preferredViewMode,
      priorityFeatures: mostUsedFeatures.slice(0, 3),
      showQuickActions: mostUsedFeatures.length > 0,
      compactMode: preferredViewMode === 'compact',
      visualMode: preferredViewMode === 'visual'
    };
  };

  // Intelligent priority calculation
  const calculatePriority = (taskCount: number, deadlines: Date[]): 'high' | 'medium' | 'low' => {
    const urgentDeadlines = deadlines.filter(d => {
      const diff = d.getTime() - Date.now();
      return diff < 24 * 60 * 60 * 1000; // Less than 24 hours
    });
    
    if (urgentDeadlines.length > 0 || taskCount > 10) return 'high';
    if (taskCount > 5) return 'medium';
    return 'low';
  };

  return {
    userBehavior,
    adaptiveContent,
    trackInteraction,
    getAdaptiveLayout,
    calculatePriority,
    setPreferredViewMode: (mode: 'compact' | 'detailed' | 'visual') => {
      setUserBehavior(prev => ({ ...prev, preferredViewMode: mode }));
    }
  };
}