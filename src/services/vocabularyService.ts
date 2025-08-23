import { supabase } from '../lib/supabase';
import { VocabularyEntry } from '../types';

class VocabularyService {
  /**
   * Récupère tous les mots de vocabulaire d'un utilisateur
   */
  async getVocabulary(userId: string): Promise<VocabularyEntry[]> {
    try {
      console.log('🔄 Chargement du vocabulaire pour:', userId);
      
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('userId', userId)
        .order('word');
        
      if (error) {
        console.error('❌ Erreur lors du chargement du vocabulaire:', error);
        throw error;
      }
      
      // Convertir les dates string en objets Date
      const formattedData = data.map(item => ({
        ...item,
        lastReviewed: item.last_reviewed ? new Date(item.last_reviewed) : undefined,
        timesReviewed: item.times_reviewed,
        // Adapter les noms de champs si nécessaire
        id: item.id,
        word: item.word,
        definition: item.definition,
        category: item.letter_category,
        examples: item.examples || [],
        difficulty: item.difficulty,
        mastery: item.mastery,
        userId: item.user_id
      }));
      
      console.log(`✅ ${formattedData.length} mots de vocabulaire chargés`);
      return formattedData;
    } catch (error) {
      console.error('❌ Erreur lors du chargement du vocabulaire:', error);
      throw error;
    }
  }

  /**
   * Ajoute un nouveau mot de vocabulaire
   */
  async addVocabularyEntry(entry: Omit<VocabularyEntry, 'id'>): Promise<VocabularyEntry> {
    try {
      console.log('🔄 Ajout d\'un nouveau mot de vocabulaire:', entry.word, 'pour utilisateur:', entry.userId);
      console.log('📝 Données du vocabulaire:', {
        word: entry.word,
        definition: entry.definition?.substring(0, 50) + '...',
        category: entry.category,
        user_id: entry.userId
      });
      
      // Préparer les données pour Supabase (adapter les noms de champs)
      const supabaseEntry = {
        userId: entry.userId, // Assurer que l'userId est bien défini
        word: entry.word,
        definition: entry.definition,
        letter_category: entry.category,
        examples: Array.isArray(entry.examples) ? entry.examples : [entry.examples].filter(Boolean),
        difficulty: entry.difficulty,
        mastery: entry.mastery,
        times_reviewed: entry.timesReviewed || 0,
        last_reviewed: entry.lastReviewed
      };
      
      console.log('📤 Données envoyées à Supabase:', supabaseEntry);
      
      const { data, error } = await supabase
        .from('vocabulary')
        .insert([supabaseEntry])
        .select()
        .single();
        
      if (error) {
        console.error('❌ Erreur lors de l\'ajout du mot:', error);
        console.error('📊 Détails de l\'erreur:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Mot inséré avec succès dans Supabase:', data.id);
      
      // Convertir le résultat au format VocabularyEntry
      const newEntry: VocabularyEntry = {
        id: data.id,
        word: data.word,
        definition: data.definition,
        category: data.letter_category,
        examples: Array.isArray(data.examples) ? data.examples : [],
        difficulty: data.difficulty,
        mastery: data.mastery,
        timesReviewed: data.times_reviewed || 0,
        lastReviewed: data.last_reviewed ? new Date(data.last_reviewed) : undefined,
        userId: data.userId
      };
      
      console.log('✅ Mot converti et retourné:', newEntry);
      return newEntry;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du mot:', error);
      throw error;
    }
  }

  /**
   * Met à jour un mot de vocabulaire existant
   */
  async updateVocabularyEntry(entry: VocabularyEntry): Promise<VocabularyEntry> {
    try {
      console.log('🔄 Mise à jour du mot:', entry.id);
      
      // Préparer les données pour Supabase
      const supabaseEntry = {
        word: entry.word,
        definition: entry.definition,
        letter_category: entry.category,
        examples: entry.examples,
        difficulty: entry.difficulty,
        mastery: entry.mastery,
        times_reviewed: entry.timesReviewed,
        last_reviewed: entry.lastReviewed
      };
      
      const { data, error } = await supabase
        .from('vocabulary')
        .update(supabaseEntry)
        .eq('id', entry.id)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Erreur lors de la mise à jour du mot:', error);
        throw error;
      }
      
      // Convertir le résultat au format VocabularyEntry
      const updatedEntry: VocabularyEntry = {
        id: data.id,
        word: data.word,
        definition: data.definition,
        category: data.letter_category,
        examples: data.examples || [],
        difficulty: data.difficulty,
        mastery: data.mastery,
        timesReviewed: data.times_reviewed || 0,
        lastReviewed: data.last_reviewed ? new Date(data.last_reviewed) : undefined,
        userId: data.userId
      };
      
      console.log('✅ Mot mis à jour avec succès');
      return updatedEntry;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du mot:', error);
      throw error;
    }
  }

  /**
   * Supprime un mot de vocabulaire
   */
  async deleteVocabularyEntry(id: string): Promise<boolean> {
    try {
      console.log('🔄 Suppression du mot:', id);
      
      const { error } = await supabase
        .from('vocabulary')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('❌ Erreur lors de la suppression du mot:', error);
        throw error;
      }
      
      console.log('✅ Mot supprimé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du mot:', error);
      throw error;
    }
  }
}

// Exporter une instance singleton
export const vocabularyService = new VocabularyService();