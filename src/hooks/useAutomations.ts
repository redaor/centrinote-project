import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AutomationType, AutomationConfig, AutomationRecord, DEFAULT_CONFIGS } from '../types/automations';

interface UseAutomationsResult {
  automations: Record<AutomationType, AutomationRecord>;
  loading: boolean;
  error: string | null;
  updateAutomation: (type: AutomationType, config: AutomationConfig) => Promise<void>;
  refreshAutomations: () => Promise<void>;
}

export function useAutomations(): UseAutomationsResult {
  const [automations, setAutomations] = useState<Record<AutomationType, AutomationRecord>>({} as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les configurations d'automatisation
  const fetchAutomations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const response = await fetch('/.netlify/functions/automation-get', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du chargement');
      }

      const result = await response.json();
      setAutomations(result.data.automations || {});

    } catch (err: any) {
      console.error('Erreur fetchAutomations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour une configuration
  const updateAutomation = async (type: AutomationType, config: AutomationConfig) => {
    try {
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const response = await fetch('/.netlify/functions/automation-upsert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          automation_type: type,
          config
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      const result = await response.json();
      
      // Mettre à jour le state local
      setAutomations(prev => ({
        ...prev,
        [type]: result.data
      }));

    } catch (err: any) {
      console.error('Erreur updateAutomation:', err);
      setError(err.message);
      throw err; // Re-throw pour que le composant puisse gérer l'erreur
    }
  };

  // Charger au montage
  useEffect(() => {
    fetchAutomations();
  }, []);

  return {
    automations,
    loading,
    error,
    updateAutomation,
    refreshAutomations: fetchAutomations
  };
}