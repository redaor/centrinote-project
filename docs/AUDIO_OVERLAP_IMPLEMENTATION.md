# 🎯 Implémentation du Chevauchement (Overlap) des Chunks Audio

## ✅ Modifications Appliquées

### 1. Ajout de la Constante OVERLAP_DURATION_MS

**Fichier** : `src/hooks/useLongRecording.ts`

```typescript
const OVERLAP_DURATION_MS = 5 * 1000; // 5 secondes de chevauchement
```

### 2. Ajout des Refs pour Gérer l'Overlap

```typescript
const nextRecorderRef = useRef<MediaRecorder | null>(null);
const isOverlappingRef = useRef<boolean>(false);
const nextChunksRef = useRef<Blob[]>([]);
const transcriptionsRef = useRef<Array<{ chunkNumber: number; text: string }>>([]);
```

### 3. Fonctions de Détection et Fusion

**Fonction `findOverlap()`** :
- Détecte les mots communs entre la fin de chunk1 et le début de chunk2
- Retourne l'index de début de l'overlap dans chunk2
- Minimum de 5 mots communs pour valider un overlap

**Fonction `mergeTranscriptionChunks()`** :
- Fusionne deux transcriptions en excluant l'overlap
- Exportée dans l'interface du hook pour utilisation dans le composant

### 4. Logique d'Overlap dans setInterval

**À T-5s** (25 minutes 55 secondes) :
- Démarrer le `nextRecorder` avec le même stream
- Stocker ses chunks dans `nextChunksRef`
- Marquer `isOverlappingRef.current = true`

**À T=30:00** :
- Arrêter le `mediaRecorder` actuel
- Son handler `onstop` traite la transcription
- Transférer les chunks de `nextRecorder` dans `chunksRef`
- Le `nextRecorder` devient le `mediaRecorder` actuel
- Réinitialiser le timer en tenant compte de l'overlap (5 secondes déjà écoulées)

### 5. Fusion dans LongRecButton

**Fichier** : `src/components/documents/LongRecButton.tsx`

- Utilise la fonction `mergeTranscriptionChunks` du hook
- Stocke les transcriptions précédentes dans `previousTranscriptionsRef`
- Fusionne avant d'insérer dans la note
- Logs clairs pour le debugging

## 🔄 Flux Complet avec Overlap

```
T=0:00    → Enregistrement démarre (chunk 1)
T=25:55   → nextRecorder démarre (overlap de 5s)
T=30:00   → mediaRecorder actuel s'arrête
           → Transcription du chunk 1
           → nextRecorder devient mediaRecorder actuel
           → Timer réinitialisé à 5s (overlap pris en compte)
T=30:05   → Continuation normale (chunk 2)
T=55:55   → nextRecorder démarre (overlap de 5s)
T=60:00   → mediaRecorder actuel s'arrête
           → Transcription du chunk 2
           → Fusion avec chunk 1 (overlap détecté et supprimé)
           → nextRecorder devient mediaRecorder actuel
...
```

## 📊 Résultats Attendus

### Avant (sans overlap)
```
[Chunk 1: 0-30min] → [Coupure ~1s] → [Chunk 2: 30-60min]
Transcription 1 : "...merci beaucoup pour votre attention."
[Coupure]
Transcription 2 : "Nous allons continuer avec..."
```

### Après (avec overlap)
```
[Chunk 1: 0-30min] → [Overlap 5s] → [Chunk 2: 30-60min]
Transcription 1 : "...merci beaucoup pour votre attention."
Transcription 2 : "merci beaucoup pour votre attention. Nous allons continuer..."
Fusion : "...merci beaucoup pour votre attention. Nous allons continuer..."
```

## 🎯 Avantages

1. ✅ **Pas de perte audio** : Overlap de 5s garantit qu'aucun mot n'est perdu
2. ✅ **Enregistrement fluide** : Pas de coupure audible
3. ✅ **Transcription continue** : Fusion automatique des doublons
4. ✅ **Compatibilité** : Fonctionne avec le système existant

## ⚠️ Points d'Attention

1. **Détection d'overlap** : Fonctionne bien pour les transcriptions normales, mais peut échouer si Whisper transcrit différemment le même passage
2. **Performance** : Overlap de 5s = ~20 KB supplémentaires par chunk (négligeable)
3. **Mémoire** : Deux MediaRecorders simultanés pendant 5s (négligeable)

## 🧪 Tests Recommandés

1. **Test basique** : Enregistrer 35 minutes → Vérifier qu'il y a 2 chunks avec overlap
2. **Test de fusion** : Vérifier que les transcriptions se fusionnent correctement
3. **Test de continuité** : Vérifier qu'il n'y a pas de coupure dans la transcription finale
4. **Test avec pauses** : Vérifier le comportement si l'utilisateur fait une pause entre deux phrases

## 📝 Logs à Surveiller

- `🔄 Démarrage overlap à T-5s` : Confirme le démarrage anticipé
- `🔄 Passage au chunk X (overlap actif depuis T-5s)` : Confirme la transition
- `🔄 Fusion transcription chunks X et Y...` : Confirme la détection d'overlap
- `✅ Fusion transcription chunk X et chunk Y terminée` : Confirme la fusion réussie

