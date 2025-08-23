import { supabase } from '../lib/supabase';
import { DocumentNote } from '../types';

class DocumentNotesService {
  /**
   * Récupère toutes les notes d'un document pour un utilisateur
   */
  async getDocumentNotes(documentId: string, userId: string): Promise<DocumentNote[]> {
    try {
      console.log(`🔄 Chargement des notes pour le document ${documentId} (utilisateur: ${userId}) à ${new Date().toISOString()}`);
      
      // Vérifier que les paramètres sont valides
      if (!documentId || !userId) {
        console.error("❌ ID de document ou d'utilisateur manquant", {documentId, userId});
        return [];
      }
      
      const { data, error } = await supabase
        .from('document_notes')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('❌ Erreur lors du chargement des notes:', error, {documentId, userId});
        throw error;
      }
      
      console.log(`✅ Données brutes reçues (${data?.length || 0} notes):`, data);
      
      // Convertir les dates string en objets Date
      const formattedData = data.map(item => ({
        id: item.id,
        documentId: item.document_id,
        userId: item.user_id,
        content: item.content,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));
      
      console.log(`✅ ${formattedData.length} notes chargées`);
      return formattedData;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des notes:', error);
      throw error;
    }
  }

  /**
   * Ajoute une nouvelle note à un document
   */
  async addDocumentNote(note: Omit<DocumentNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentNote> {
    try {
      console.log(`🔄 Ajout d'une nouvelle note pour le document ${note.documentId}`);
      
      // Préparer les données pour Supabase
      const supabaseNote = {
        document_id: note.documentId,
        user_id: note.userId,
        content: note.content
      };
      
      const { data, error } = await supabase
        .from('document_notes')
        .insert([supabaseNote])
        .select()
        .single();
        
      if (error) {
        console.error('❌ Erreur lors de l\'ajout de la note:', error);
        throw error;
      }
      
      // Convertir le résultat au format DocumentNote
      const newNote: DocumentNote = {
        id: data.id,
        documentId: data.document_id,
        userId: data.user_id,
        content: data.content,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
      
      console.log('✅ Note ajoutée avec succès:', newNote.id);
      return newNote;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout de la note:', error);
      throw error;
    }
  }

  /**
   * Met à jour une note existante
   */
  async updateDocumentNote(note: DocumentNote): Promise<DocumentNote> {
    try {
      console.log(`🔄 Mise à jour de la note ${note.id}`);
      
      // Préparer les données pour Supabase
      const supabaseNote = {
        content: note.content
      };
      
      const { data, error } = await supabase
        .from('document_notes')
        .update(supabaseNote)
        .eq('id', note.id)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Erreur lors de la mise à jour de la note:', error);
        throw error;
      }
      
      // Convertir le résultat au format DocumentNote
      const updatedNote: DocumentNote = {
        id: data.id,
        documentId: data.document_id,
        userId: data.user_id,
        content: data.content,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
      
      console.log('✅ Note mise à jour avec succès');
      return updatedNote;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la note:', error);
      throw error;
    }
  }

  /**
   * Supprime une note
   */
  async deleteDocumentNote(id: string): Promise<boolean> {
    try {
      console.log(`🔄 Suppression de la note ${id}`);
      
      const { error } = await supabase
        .from('document_notes')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('❌ Erreur lors de la suppression de la note:', error);
        throw error;
      }
      
      console.log('✅ Note supprimée avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la note:', error);
      throw error;
    }
  }
}

// Exporter une instance singleton
export const documentNotesService = new DocumentNotesService();