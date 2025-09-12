import { supabase } from '../lib/supabase';
import type { Note, Tag, NoteAttachment } from '../types';

class NotesService {
  /**
   * Récupère toutes les notes d'un utilisateur
   */
  async getNotes(userId: string): Promise<Note[]> {
    const isDev = import.meta.env.DEV;
    const startTime = Date.now();
    
    try {
      if (isDev) console.log('🔄 Chargement optimisé des notes pour:', userId);
      
      // 🚀 UNE SEULE REQUÊTE avec JOINs optimisés
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id,
          userId,
          title,
          content,
          is_pinned,
          created_at,
          updated_at,
          note_tags (
            tags (
              id,
              name,
              color
            )
          ),
          note_attachments (
            id
          )
        `)
        .eq('userId', userId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('❌ Erreur lors du chargement des notes:', error);
        throw error;
      }
      
      // 🔄 Traitement des données en une fois
      const notesWithTags = data.map(note => ({
        ...note,
        tags: note.note_tags?.map(nt => nt.tags).filter(Boolean) || [],
        has_attachment: (note.note_attachments?.length || 0) > 0
      }));
      
      const loadTime = Date.now() - startTime;
      if (isDev) console.log(`⚡ ${notesWithTags.length} notes chargées en ${loadTime}ms (1 requête)`);
      
      return notesWithTags;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des notes:', error);
      throw error;
    }
  }

  /**
   * Récupère une note par son ID
   */
  async getNoteById(noteId: string): Promise<Note | null> {
    try {
      console.log('🔄 Chargement de la note:', noteId);
      
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id,
          userId,
          title,
          content,
          is_pinned,
          created_at,
          updated_at
        `)
        .eq('id', noteId)
        .single();
        
      if (error) {
        console.error('❌ Erreur lors du chargement de la note:', error);
        throw error;
      }
      
      // Récupérer les tags pour la note
      const { data: tagData, error: tagError } = await supabase
        .from('note_tags')
        .select(`
          tags (
            id,
            name,
            color
          )
        `)
        .eq('note_id', noteId);
        
      if (tagError) {
        console.warn('⚠️ Erreur lors du chargement des tags pour la note:', noteId, tagError);
      }
      
      // Vérifier si la note a des pièces jointes
      const { count, error: attachmentError } = await supabase
        .from('note_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('note_id', noteId);
        
      if (attachmentError) {
        console.warn('⚠️ Erreur lors de la vérification des pièces jointes:', noteId, attachmentError);
      }
      
      const noteWithTags = {
        ...data,
        tags: tagData?.map(item => item.tags) || [],
        has_attachment: count ? count > 0 : false
      };
      
      console.log('✅ Note chargée:', data?.id);
      return noteWithTags;
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la note:', error);
      throw error;
    }
  }

  /**
   * Ajoute une nouvelle note
   */
  async addNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'tags' | 'has_attachment'>, tagNames: string[] = []): Promise<Note> {
    try {
      console.log('🔄 Ajout d\'une nouvelle note pour utilisateur:', note.user_id);
      console.log('📝 Données de la note:', { title: note.title, content: note.content?.substring(0, 50) + '...', user_id: note.user_id });
      
      // 1. Insérer la note
      const { data: newNote, error: noteError } = await supabase
        .from('notes')
        .insert({
          userId: note.userId,
          title: note.title,
          content: note.content,
          is_pinned: note.is_pinned || false
        })
        .select()
        .single();
        
      if (noteError) {
        console.error('❌ Erreur lors de l\'ajout de la note:', noteError);
        console.error('📊 Détails de l\'erreur:', {
          code: noteError.code,
          message: noteError.message,
          details: noteError.details,
          hint: noteError.hint
        });
        throw noteError;
      }
      
      console.log('✅ Note insérée avec succès dans Supabase:', newNote.id);
      
      // 2. Ajouter les tags si nécessaire
      if (tagNames.length > 0) {
        console.log('🏷️ Ajout des tags:', tagNames);
        // Créer les tags qui n'existent pas encore
        for (const tagName of tagNames) {
          if (!tagName.trim()) continue;
          
          // Vérifier si le tag existe déjà
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName.trim())
            .eq('userId', note.userId)
            .maybeSingle();
            
          if (!existingTag) {
            // Créer le tag
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({
                name: tagName.trim(),
                color: this.getRandomTagColor(),
                userId: note.userId
              })
              .select()
              .single();
              
            if (tagError) {
              console.error('Erreur lors de la création du tag:', tagError);
              continue;
            }
            
            // Associer le tag à la note
            const { error: relationError } = await supabase
              .from('note_tags')
              .insert({
                note_id: newNote.id,
                tag_id: newTag.id
              });
              
            if (relationError) {
              console.error('Erreur lors de l\'association du tag:', relationError);
            }
          } else {
            // Associer le tag existant à la note
            const { error: relationError } = await supabase
              .from('note_tags')
              .insert({
                note_id: newNote.id,
                tag_id: existingTag.id
              });
              
            if (relationError) {
              console.error('Erreur lors de l\'association du tag:', relationError);
            }
          }
        }
      }
      
      // 3. Récupérer la note complète avec les tags
      const completeNote = await this.getNoteById(newNote.id);
      
      console.log('✅ Note ajoutée avec succès:', newNote.id);
      return completeNote as Note;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout de la note:', error);
      throw error;
    }
  }

  /**
   * Met à jour une note existante
   */
  async updateNote(note: Partial<Note> & { id: string }, tagNames?: string[]): Promise<Note> {
    try {
      console.log('🔄 Mise à jour de la note:', note.id);
      
      // 1. Mettre à jour la note
      const { data: updatedNote, error: noteError } = await supabase
        .from('notes')
        .update({
          title: note.title,
          content: note.content,
          is_pinned: note.is_pinned
        })
        .eq('id', note.id)
        .select()
        .single();
        
      if (noteError) {
        console.error('❌ Erreur lors de la mise à jour de la note:', noteError);
        throw noteError;
      }
      
      // 2. Mettre à jour les tags si fournis
      if (tagNames !== undefined) {
        // Supprimer les associations existantes
        const { error: deleteError } = await supabase
          .from('note_tags')
          .delete()
          .eq('note_id', note.id);
          
        if (deleteError) {
          console.error('Erreur lors de la suppression des tags:', deleteError);
        }
        
        // Ajouter les nouveaux tags
        for (const tagName of tagNames) {
          if (!tagName.trim()) continue;
          
          // Vérifier si le tag existe déjà
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName.trim())
            .eq('userId', updatedNote.userId)
            .maybeSingle();
            
          if (existingTag) {
            // Associer le tag existant à la note
            const { error: relationError } = await supabase
              .from('note_tags')
              .insert({
                note_id: note.id,
                tag_id: existingTag.id
              });
              
            if (relationError) {
              console.error('Erreur lors de l\'association du tag:', relationError);
            }
          } else {
            // Créer le tag
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({
                name: tagName.trim(),
                color: this.getRandomTagColor(),
                userId: updatedNote.userId
              })
              .select()
              .single();
              
            if (tagError) {
              console.error('Erreur lors de la création du tag:', tagError);
              continue;
            }
            
            // Associer le tag à la note
            const { error: relationError } = await supabase
              .from('note_tags')
              .insert({
                note_id: note.id,
                tag_id: newTag.id
              });
              
            if (relationError) {
              console.error('Erreur lors de l\'association du tag:', relationError);
            }
          }
        }
      }
      
      // 3. Récupérer la note complète avec les tags
      const completeNote = await this.getNoteById(note.id);
      
      console.log('✅ Note mise à jour avec succès');
      return completeNote as Note;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la note:', error);
      throw error;
    }
  }

  /**
   * Supprime une note
   */
  async deleteNote(id: string): Promise<boolean> {
    try {
      console.log('🔄 Suppression de la note:', id);
      
      const { error } = await supabase
        .from('notes')
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

  /**
   * Épingle ou désépingle une note
   */
  async togglePinNote(id: string, isPinned: boolean): Promise<boolean> {
    try {
      console.log(`🔄 ${isPinned ? 'Épinglage' : 'Désépinglage'} de la note:`, id);
      
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: isPinned })
        .eq('id', id);
        
      if (error) {
        console.error(`❌ Erreur lors du ${isPinned ? 'l\'épinglage' : 'désépinglage'} de la note:`, error);
        throw error;
      }
      
      console.log(`✅ Note ${isPinned ? 'épinglée' : 'désépinglée'} avec succès`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur lors du ${isPinned ? 'l\'épinglage' : 'désépinglage'} de la note:`, error);
      throw error;
    }
  }

  /**
   * Recherche des notes par texte
   */
  async searchNotes(searchTerm: string): Promise<Note[]> {
    try {
      console.log('🔍 Recherche de notes:', searchTerm);
      
      // Utiliser la fonction RPC sécurisée si disponible
      try {
        const { data, error } = await supabase.rpc('search_notes', {
          search_query: searchTerm
        });
        
        if (!error) {
          console.log(`✅ ${data.length} notes trouvées via RPC`);
          return data as Note[];
        }
      } catch (rpcError) {
        console.warn('⚠️ Erreur RPC, utilisation de la méthode alternative:', rpcError);
      }
      
      // Méthode alternative si la fonction RPC n'est pas disponible
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('❌ Erreur lors de la recherche de notes:', error);
        throw error;
      }
      
      // Récupérer les tags pour chaque note
      const notesWithTags = await Promise.all(data.map(async (note) => {
        const { data: tagData, error: tagError } = await supabase
          .from('note_tags')
          .select(`
            tags (
              id,
              name,
              color
            )
          `)
          .eq('note_id', note.id);
          
        if (tagError) {
          console.warn('⚠️ Erreur lors du chargement des tags pour la note:', note.id, tagError);
          return {
            ...note,
            tags: []
          };
        }
        
        return {
          ...note,
          tags: tagData?.map(item => item.tags) || []
        };
      }));
      
      console.log(`✅ ${notesWithTags.length} notes trouvées`);
      return notesWithTags;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de notes:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les tags d'un utilisateur
   */
  async getTags(userId: string): Promise<Tag[]> {
    try {
      console.log('🔄 Chargement des tags pour:', userId);
      
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('name');
        
      if (error) {
        console.error('❌ Erreur lors du chargement des tags:', error);
        throw error;
      }
      
      console.log(`✅ ${data.length} tags chargés`);
      return data as Tag[];
    } catch (error) {
      console.error('❌ Erreur lors du chargement des tags:', error);
      throw error;
    }
  }

  /**
   * Récupère les notes filtrées par tag
   */
  async getNotesByTag(tagId: string): Promise<Note[]> {
    try {
      console.log('🔄 Chargement des notes par tag:', tagId);
      
      // Utiliser la fonction RPC sécurisée si disponible
      try {
        const { data, error } = await supabase.rpc('get_notes_by_tag', {
          tag_id: tagId
        });
        
        if (!error) {
          console.log(`✅ ${data.length} notes trouvées via RPC`);
          return data as Note[];
        }
      } catch (rpcError) {
        console.warn('⚠️ Erreur RPC, utilisation de la méthode alternative:', rpcError);
      }
      
      // Méthode alternative si la fonction RPC n'est pas disponible
      const { data, error } = await supabase
        .from('note_tags')
        .select(`
          note_id,
          notes (
            id,
            user_id,
            title,
            content,
            is_pinned,
            created_at,
            updated_at
          )
        `)
        .eq('tag_id', tagId);
        
      if (error) {
        console.error('❌ Erreur lors du chargement des notes par tag:', error);
        throw error;
      }
      
      // Transformer les données
      const notes = data.map(item => item.notes);
      
      // Récupérer les tags pour chaque note
      const notesWithTags = await Promise.all(notes.map(async (note) => {
        const { data: tagData, error: tagError } = await supabase
          .from('note_tags')
          .select(`
            tags (
              id,
              name,
              color
            )
          `)
          .eq('note_id', note.id);
          
        if (tagError) {
          console.warn('⚠️ Erreur lors du chargement des tags pour la note:', note.id, tagError);
          return {
            ...note,
            tags: []
          };
        }
        
        return {
          ...note,
          tags: tagData?.map(item => item.tags) || []
        };
      }));
      
      console.log(`✅ ${notesWithTags.length} notes trouvées pour le tag`);
      return notesWithTags;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des notes par tag:', error);
      throw error;
    }
  }

  /**
   * Ajoute une pièce jointe à une note
   */
  async addAttachment(noteId: string, file: File): Promise<NoteAttachment> {
    try {
      console.log('🔄 Ajout d\'une pièce jointe à la note:', noteId);
      
      // 1. Téléverser le fichier dans le bucket Storage
      const filePath = `note-attachments/${noteId}/${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('note-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.error('❌ Erreur lors du téléversement du fichier:', uploadError);
        throw uploadError;
      }
      
      // 2. Créer l'entrée dans la table note_attachments
      const { data: attachment, error: attachmentError } = await supabase
        .from('note_attachments')
        .insert({
          note_id: noteId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: filePath
        })
        .select()
        .single();
        
      if (attachmentError) {
        console.error('❌ Erreur lors de l\'ajout de la pièce jointe:', attachmentError);
        throw attachmentError;
      }
      
      console.log('✅ Pièce jointe ajoutée avec succès:', attachment.id);
      return attachment as NoteAttachment;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout de la pièce jointe:', error);
      throw error;
    }
  }

  /**
   * Récupère les pièces jointes d'une note
   */
  async getNoteAttachments(noteId: string): Promise<NoteAttachment[]> {
    try {
      console.log('🔄 Chargement des pièces jointes pour la note:', noteId);
      
      const { data, error } = await supabase
        .from('note_attachments')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('❌ Erreur lors du chargement des pièces jointes:', error);
        throw error;
      }
      
      console.log(`✅ ${data.length} pièces jointes chargées`);
      return data as NoteAttachment[];
    } catch (error) {
      console.error('❌ Erreur lors du chargement des pièces jointes:', error);
      throw error;
    }
  }

  /**
   * Supprime une pièce jointe
   */
  async deleteAttachment(attachmentId: string): Promise<boolean> {
    try {
      console.log('🔄 Suppression de la pièce jointe:', attachmentId);
      
      // 1. Récupérer les informations de la pièce jointe
      const { data: attachment, error: getError } = await supabase
        .from('note_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();
        
      if (getError) {
        console.error('❌ Erreur lors de la récupération de la pièce jointe:', getError);
        throw getError;
      }
      
      // 2. Supprimer le fichier du bucket Storage
      const { error: storageError } = await supabase.storage
        .from('note-attachments')
        .remove([attachment.file_path]);
        
      if (storageError) {
        console.error('❌ Erreur lors de la suppression du fichier:', storageError);
        // Continuer même si la suppression du fichier échoue
      }
      
      // 3. Supprimer l'entrée de la table note_attachments
      const { error: deleteError } = await supabase
        .from('note_attachments')
        .delete()
        .eq('id', attachmentId);
        
      if (deleteError) {
        console.error('❌ Erreur lors de la suppression de la pièce jointe:', deleteError);
        throw deleteError;
      }
      
      console.log('✅ Pièce jointe supprimée avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la pièce jointe:', error);
      throw error;
    }
  }

  /**
   * Génère une URL de téléchargement pour une pièce jointe
   */
  async getAttachmentUrl(filePath: string): Promise<string> {
    try {
      console.log('🔄 Génération de l\'URL de téléchargement pour:', filePath);
      
      const { data, error } = await supabase.storage
        .from('note-attachments')
        .createSignedUrl(filePath, 60 * 60); // URL valide pendant 1 heure
        
      if (error) {
        console.error('❌ Erreur lors de la génération de l\'URL:', error);
        throw error;
      }
      
      console.log('✅ URL générée avec succès');
      return data.signedUrl;
    } catch (error) {
      console.error('❌ Erreur lors de la génération de l\'URL:', error);
      throw error;
    }
  }

  /**
   * Génère une couleur aléatoire pour un tag
   */
  getRandomTagColor(): string {
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#EC4899', // pink-500
      '#6366F1', // indigo-500
      '#14B8A6', // teal-500
      '#F97316', // orange-500
      '#84CC16'  // lime-500
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Exporter une instance singleton
export const notesService = new NotesService();