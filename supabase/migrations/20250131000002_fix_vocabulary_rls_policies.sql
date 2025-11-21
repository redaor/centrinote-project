-- Migration: Correction des policies RLS pour la table vocabulary
-- Date: 2025-01-31
-- Issue: Les insertions timeout à cause de policies RLS mal configurées

-- Supprimer toutes les policies existantes pour repartir sur une base saine
DROP POLICY IF EXISTS "vocabulary_select" ON public.vocabulary;
DROP POLICY IF EXISTS "vocabulary_insert" ON public.vocabulary;
DROP POLICY IF EXISTS "vocabulary_update" ON public.vocabulary;
DROP POLICY IF EXISTS "vocabulary_delete" ON public.vocabulary;
DROP POLICY IF EXISTS "Users can view own vocabulary" ON public.vocabulary;
DROP POLICY IF EXISTS "Users can insert own vocabulary" ON public.vocabulary;
DROP POLICY IF EXISTS "Users can update own vocabulary" ON public.vocabulary;
DROP POLICY IF EXISTS "Users can delete own vocabulary" ON public.vocabulary;

-- S'assurer que RLS est activé
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Créer les nouvelles policies avec la syntaxe correcte
-- IMPORTANT: Utiliser "userId" (avec guillemets) car la colonne est en camelCase

-- Policy SELECT: Permet aux utilisateurs de voir uniquement leur vocabulaire
CREATE POLICY "vocabulary_select" ON public.vocabulary
  FOR SELECT
  TO public
  USING ("userId" = auth.uid());

-- Policy INSERT: Permet aux utilisateurs d'ajouter du vocabulaire uniquement avec leur userId
CREATE POLICY "vocabulary_insert" ON public.vocabulary
  FOR INSERT
  TO public
  WITH CHECK ("userId" = auth.uid());

-- Policy UPDATE: Permet aux utilisateurs de mettre à jour uniquement leur vocabulaire
CREATE POLICY "vocabulary_update" ON public.vocabulary
  FOR UPDATE
  TO public
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Policy DELETE: Permet aux utilisateurs de supprimer uniquement leur vocabulaire
CREATE POLICY "vocabulary_delete" ON public.vocabulary
  FOR DELETE
  TO public
  USING ("userId" = auth.uid());

-- Vérification: Afficher les policies créées
DO $$
BEGIN
  RAISE NOTICE 'Policies RLS créées avec succès pour la table vocabulary';
END $$;

-- Note: Pour vérifier les policies, exécutez:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'vocabulary';
