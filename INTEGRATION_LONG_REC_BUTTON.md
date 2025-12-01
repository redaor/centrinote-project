# 🎤 Intégration du bouton "Enregistrer ce cours"

## Fichiers créés

1. **`src/hooks/useLongRecording.ts`** - Hook pour gérer l'enregistrement audio long
2. **`src/components/documents/LongRecButton.tsx`** - Composant bouton avec progress bar

## Intégration dans ModernNotesManager.tsx

### 1. Importer le composant

Ajouter en haut du fichier `src/components/documents/ModernNotesManager.tsx` :

```typescript
// Ligne à ajouter après les autres imports
import { LongRecButton } from './LongRecButton';
```

### 2. Ajouter le bouton dans la barre d'outils

Dans la section de la barre d'outils (lignes 480-536), ajouter le bouton **après** le bouton "Modifier" et **avant** `AIContentHelper` :

```typescript
// Ligne 505 - Après le bouton "Modifier"
<Button
  variant="ghost"
  onClick={() => setIsEditing(true)}
  className="gap-2 focus-visible:ring-2 focus-visible:ring-blue-400"
>
  <Edit className="w-4 h-4" />
  Modifier
</Button>

{/* 🎤 AJOUTER ICI - Bouton d'enregistrement audio long */}
{selectedNote && !isEditing && (
  <LongRecButton
    noteId={selectedNote.id}
    noteContent={formData.content || selectedNote.content || ''}
    onContentAppend={(text) => {
      // Ajouter le texte transcrit à la fin du contenu
      const currentContent = formData.content || selectedNote.content || '';
      const newContent = currentContent + text;
      handleFormDataChange('content', newContent);
      // Déclencher auto-save (le système existant gérera la sauvegarde)
      setHasUnsavedChanges(true);
    }}
    onCreateNewNote={() => {
      // Créer une nouvelle note vide
      handleBackToList();
      // Le système existant permettra de créer une nouvelle note via le bouton "+"
    }}
    darkMode={darkMode}
  />
)}

<AIContentHelper
  content={selectedNote.content || ''}
  // ... reste du code
/>
```

### 3. Position exacte dans le code

Le bouton doit être inséré **entre les lignes 505 et 506** (après le bouton "Modifier", avant `AIContentHelper`).

## Fonctionnalités

✅ **Enregistrement par chunks de 30 min**  
✅ **Progress bar horizontale** sous la barre d'outils  
✅ **Bouton "Arrêter"** pendant l'enregistrement  
✅ **Transcription automatique** via OpenAI API (Whisper)  
✅ **Insertion automatique** du texte transcrit à la fin de la note avec horodatage  
✅ **Bouton "➕ Nouvelle note"** après chaque chunk  
✅ **0 crédit Netlify** : tout se passe dans le navigateur  

## Configuration requise

- Variable d'environnement `VITE_OPENAI_KEY` doit être configurée
- Permission micro du navigateur (demandée une seule fois)

## Notes importantes

- Le bouton n'apparaît que si une note est sélectionnée (`selectedNote`)
- L'enregistrement continue automatiquement après chaque chunk de 30 min
- Le texte transcrit est ajouté avec un horodatage : `--- Transcription chunk X (DD/MM/YYYY HH:MM) ---`
- L'auto-save existant gère la sauvegarde automatiquement (3 secondes après modification)

## Aucune modification du comportement existant

✅ Pas de changement du champ de texte  
✅ Pas de changement de la sauvegarde auto  
✅ Pas de changement des raccourcis clavier  
✅ Pas de modification du state global des notes  

