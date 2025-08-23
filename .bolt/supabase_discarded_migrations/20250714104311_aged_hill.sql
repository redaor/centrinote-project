/*
  # Mise à jour des policies pour document_notes
  
  1. Policies
    - Mise à jour des policies pour utiliser auth.uid() au lieu de uid()
    - Assure que les utilisateurs ne peuvent accéder qu'à leurs propres notes
  
  2. Sécurité
    - Maintient la sécurité RLS pour la table document_notes
*/

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS document_notes_select ON public.document_notes;
DROP POLICY IF EXISTS document_notes_insert ON public.document_notes;
DROP POLICY IF EXISTS document_notes_update ON public.document_notes;
DROP POLICY IF EXISTS document_notes_delete ON public.document_notes;

-- Recréer les policies avec auth.uid()
CREATE POLICY document_notes_select ON public.document_notes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY document_notes_insert ON public.document_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY document_notes_update ON public.document_notes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY document_notes_delete ON public.document_notes
  FOR DELETE USING (user_id = auth.uid());