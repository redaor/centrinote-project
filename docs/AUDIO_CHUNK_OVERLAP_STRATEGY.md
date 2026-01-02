# 🔄 Stratégie de Chevauchement (Overlap) des Chunks Audio

## 📋 Analyse du Système Actuel

### Comportement Actuel

1. **Enregistrement** : MediaRecorder enregistre pendant 30 minutes
2. **Arrêt automatique** : À 30 minutes, le MediaRecorder s'arrête
3. **Traitement** : Le chunk est envoyé à Whisper pour transcription
4. **Redémarrage** : Un nouveau MediaRecorder démarre après ~1 seconde
5. **Problème** : Il y a une **coupure de ~1 seconde** entre les chunks

### Code Actuel (ligne 324-331)

```typescript
// Vérifier si on a atteint la durée du chunk (arrêter automatiquement le chunk)
if (elapsed >= CHUNK_DURATION_MS / 1000) {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorderRef.current.stop(); // Arrêt à T=30:00
    startTimeRef.current = Date.now(); // Réinitialiser pour le prochain chunk
    setElapsedTime(0);
  }
}
```

Puis redémarrage après traitement (ligne 294-302) :
```typescript
setTimeout(() => {
  if (nextRecorder && nextRecorder.state === 'inactive' && streamRef.current && shouldContinueRef.current) {
    nextRecorder.start(); // Redémarrage à T=30:01 (environ)
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    console.log(`🎤 Chunk ${chunkNumber + 1} redémarré`);
  }
}, 1000);
```

---

## 🎯 Stratégies d'Overlap Proposées

### ✅ Stratégie 1 : Overlap Temporel (RECOMMANDÉE)

**Principe** : Démarrer le nouveau MediaRecorder **5 secondes avant** la fin du chunk actuel.

#### Avantages
- ✅ Aucune perte audio (overlap de 5s garantit la continuité)
- ✅ Transcription plus fluide
- ✅ Pas de coupure audible

#### Défis
- ⚠️ Gestion des doublons dans la transcription
- ⚠️ Synchronisation des timestamps

#### Implémentation

```typescript
const OVERLAP_DURATION_MS = 5 * 1000; // 5 secondes de chevauchement

// Dans le setInterval
if (elapsed >= (CHUNK_DURATION_MS - OVERLAP_DURATION_MS) / 1000) {
  // Démarrer le nouveau MediaRecorder à T-5s
  if (!nextRecorderStarted) {
    startNextChunk();
    nextRecorderStarted = true;
  }
}

if (elapsed >= CHUNK_DURATION_MS / 1000) {
  // Arrêter le chunk actuel
  mediaRecorderRef.current.stop();
}
```

#### Gestion des Doublons

```typescript
// Après transcription des deux chunks, fusionner intelligemment
function mergeTranscriptions(
  chunk1: string,  // "Bonjour, je vais vous expliquer comment..."
  chunk2: string   // "...comment fonctionne le système..."
): string {
  // 1. Détecter les mots communs en fin de chunk1 / début de chunk2
  const words1 = chunk1.split(/\s+/).slice(-10); // 10 derniers mots
  const words2 = chunk2.split(/\s+/).slice(0, 10); // 10 premiers mots
  
  // 2. Trouver le point d'overlap (mots communs)
  let overlapStart = 0;
  for (let i = 0; i < words1.length; i++) {
    const suffix = words1.slice(i).join(' ');
    if (chunk2.toLowerCase().startsWith(suffix.toLowerCase())) {
      overlapStart = i;
      break;
    }
  }
  
  // 3. Fusionner en excluant l'overlap
  if (overlapStart > 0) {
    const uniquePart1 = words1.slice(0, overlapStart).join(' ');
    return chunk1.replace(new RegExp(`${uniquePart1}.*$`, 'i'), uniquePart1) + ' ' + chunk2;
  }
  
  // 4. Fallback : concaténation simple
  return chunk1 + ' ' + chunk2;
}
```

---

### ✅ Stratégie 2 : Overlap avec Buffer en Double

**Principe** : Maintenir **deux MediaRecorders actifs** pendant les 5 dernières secondes.

#### Avantages
- ✅ Pas de risque de perte (deux enregistrements simultanés)
- ✅ Plus simple à gérer (pas besoin de découper les fichiers)

#### Défis
- ⚠️ Plus de mémoire utilisée
- ⚠️ Deux fichiers à gérer pendant l'overlap

#### Implémentation

```typescript
const currentRecorderRef = useRef<MediaRecorder | null>(null);
const nextRecorderRef = useRef<MediaRecorder | null>(null);
const isOverlappingRef = useRef<boolean>(false);

// À T-5s
if (elapsed >= (CHUNK_DURATION_MS - OVERLAP_DURATION_MS) / 1000 && !isOverlappingRef.current) {
  // Démarrer le deuxième MediaRecorder
  const nextRecorder = new MediaRecorder(streamRef.current, options);
  nextRecorderRef.current = nextRecorder;
  nextRecorder.start();
  isOverlappingRef.current = true;
  
  console.log('🔄 Overlap démarré : deux enregistrements simultanés');
}

// À T=30:00
if (elapsed >= CHUNK_DURATION_MS / 1000) {
  // Arrêter le premier recorder
  currentRecorderRef.current?.stop();
  // Le deuxième recorder continue déjà
  currentRecorderRef.current = nextRecorderRef.current;
  nextRecorderRef.current = null;
  isOverlappingRef.current = false;
}
```

---

### ✅ Stratégie 3 : Double Buffer avec Découpage Temporel (AVANCÉE)

**Principe** : Enregistrer en continu dans un buffer, puis découper intelligemment.

#### Avantages
- ✅ Pas de perte garantie
- ✅ Flexibilité totale sur les points de découpe

#### Défis
- ⚠️ Complexité élevée
- ⚠️ Gestion mémoire importante

---

## 🔍 Analyse Technique Détaillée

### Problème 1 : Synchronisation des Timestamps

**Défi** : Comment savoir que deux transcriptions se chevauchent ?

**Solution** :
```typescript
interface TranscriptionChunk {
  chunkNumber: number;
  text: string;
  startTime: number; // Timestamp de début (ms depuis le début de l'enregistrement)
  endTime: number;   // Timestamp de fin (ms depuis le début de l'enregistrement)
  overlapStart?: number; // Si overlap, timestamp où commence l'overlap
}

// Calculer les timestamps
const chunkStartTime = startTimeRef.current;
const chunkEndTime = chunkStartTime + CHUNK_DURATION_MS;
const nextChunkStartTime = chunkEndTime - OVERLAP_DURATION_MS;

// Stocker avec métadonnées
const chunk1: TranscriptionChunk = {
  chunkNumber: 1,
  text: transcribed1,
  startTime: chunkStartTime,
  endTime: chunkEndTime,
  overlapStart: nextChunkStartTime
};
```

### Problème 2 : Détection des Doublons

**Défis** :
- Whisper peut transcrire différemment le même passage (variations de ponctuation, etc.)
- Les mots peuvent être identiques mais pas les phrases complètes

**Solution : Alignement de séquences**

```typescript
/**
 * Détecte les mots communs entre la fin de chunk1 et le début de chunk2
 */
function findOverlap(chunk1: string, chunk2: string, minOverlapWords: number = 5): number {
  const words1 = chunk1.trim().split(/\s+/);
  const words2 = chunk2.trim().split(/\s+/);
  
  // Essayer différents points de départ dans chunk2
  for (let start = 0; start < Math.min(words2.length, words1.length); start++) {
    let matchCount = 0;
    
    // Comparer les mots de la fin de chunk1 avec le début de chunk2
    for (let i = 0; i < Math.min(words1.length - start, words2.length - start); i++) {
      const word1 = words1[words1.length - start - i].toLowerCase().replace(/[.,!?;:]/g, '');
      const word2 = words2[i].toLowerCase().replace(/[.,!?;:]/g, '');
      
      if (word1 === word2) {
        matchCount++;
      } else {
        break; // Série brisée, essayer un autre point de départ
      }
    }
    
    // Si on a trouvé assez de mots communs, c'est probablement l'overlap
    if (matchCount >= minOverlapWords) {
      return start;
    }
  }
  
  return -1; // Pas d'overlap trouvé
}

/**
 * Fusionne deux transcriptions en gérant l'overlap
 */
function mergeWithOverlap(chunk1: string, chunk2: string): string {
  const overlapIndex = findOverlap(chunk1, chunk2);
  
  if (overlapIndex === -1) {
    // Pas d'overlap détecté, concaténation simple
    return chunk1.trim() + ' ' + chunk2.trim();
  }
  
  // Extraire la partie unique de chunk2 (sans l'overlap)
  const words2 = chunk2.trim().split(/\s+/);
  const uniquePart2 = words2.slice(overlapIndex).join(' ');
  
  // Fusionner
  return chunk1.trim() + ' ' + uniquePart2;
}
```

### Problème 3 : Performance et Mémoire

**Considérations** :
- Deux MediaRecorders simultanés = 2x la mémoire
- Overlap de 5s = fichier supplémentaire de ~20 KB (à 32 kbps)

**Impact** : ✅ Négligeable pour des chunks de 30 minutes

---

## 🎯 Implémentation Recommandée : Stratégie 1 (Overlap Temporel)

### Code Complet Proposé

```typescript
const CHUNK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const OVERLAP_DURATION_MS = 5 * 1000; // 5 secondes de chevauchement

// Nouveaux refs pour gérer l'overlap
const nextRecorderRef = useRef<MediaRecorder | null>(null);
const isOverlappingRef = useRef<boolean>(false);
const overlapStartTimeRef = useRef<number | null>(null);

// Dans le setInterval (ligne 320)
intervalRef.current = setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
  setElapsedTime(elapsed);

  const timeUntilEnd = (CHUNK_DURATION_MS / 1000) - elapsed;
  
  // 🎯 Démarrer le prochain chunk à T-5s
  if (timeUntilEnd <= OVERLAP_DURATION_MS / 1000 && !isOverlappingRef.current && streamRef.current) {
    console.log('🔄 Démarrage overlap à T-5s');
    
    const nextOptions: MediaRecorderOptions = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: AUDIO_BITRATE,
    };
    
    if (!MediaRecorder.isTypeSupported(nextOptions.mimeType!)) {
      delete nextOptions.mimeType;
    }
    
    const nextRecorder = new MediaRecorder(streamRef.current, nextOptions);
    nextRecorderRef.current = nextRecorder;
    
    // Gérer les données du nouveau recorder
    const nextChunks: Blob[] = [];
    nextRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        nextChunks.push(event.data);
      }
    };
    
    // Handler pour quand le nouveau recorder s'arrête
    nextRecorder.onstop = async () => {
      const nextChunkBlob = new Blob(nextChunks, { type: 'audio/webm' });
      // Traiter ce chunk normalement
      // (la fusion avec l'overlap sera faite après transcription)
    };
    
    nextRecorder.start();
    isOverlappingRef.current = true;
    overlapStartTimeRef.current = Date.now();
  }

  // Arrêter le chunk actuel à T=30:00
  if (elapsed >= CHUNK_DURATION_MS / 1000) {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      
      // Si on continue, le nextRecorder est déjà en cours
      if (shouldContinueRef.current && nextRecorderRef.current) {
        // Le prochain chunk continue déjà (depuis T-5s)
        mediaRecorderRef.current = nextRecorderRef.current;
        nextRecorderRef.current = null;
        isOverlappingRef.current = false;
      }
    }
  }
}, 1000);
```

### Fonction de Fusion des Transcriptions

```typescript
/**
 * Fusionne deux transcriptions en gérant l'overlap de 5 secondes
 */
function mergeTranscriptionChunks(
  chunk1Text: string,
  chunk2Text: string,
  chunk1Number: number,
  chunk2Number: number
): string {
  // Si pas d'overlap détecté, concaténation simple
  const overlapIndex = findOverlap(chunk1Text, chunk2Text);
  
  if (overlapIndex === -1) {
    console.log(`⚠️ Pas d'overlap détecté entre chunks ${chunk1Number} et ${chunk2Number}, concaténation simple`);
    return chunk1Text.trim() + '\n\n' + chunk2Text.trim();
  }
  
  // Fusion intelligente avec overlap
  const words2 = chunk2Text.trim().split(/\s+/);
  const uniquePart2 = words2.slice(overlapIndex).join(' ');
  
  const merged = chunk1Text.trim() + ' ' + uniquePart2;
  console.log(`✅ Overlap détecté et fusionné (${overlapIndex} mots) entre chunks ${chunk1Number} et ${chunk2Number}`);
  
  return merged;
}
```

---

## 📊 Comparaison des Stratégies

| Critère | Stratégie 1 (Overlap Temporel) | Stratégie 2 (Double Buffer) | Stratégie 3 (Buffer Continu) |
|---------|-------------------------------|----------------------------|------------------------------|
| **Complexité** | ⭐⭐ Moyenne | ⭐⭐⭐ Élevée | ⭐⭐⭐⭐ Très élevée |
| **Risque de perte** | ⭐ Très faible | ⭐⭐ Faible | ⭐⭐⭐ Aucun |
| **Gestion mémoire** | ⭐⭐ Bonne | ⭐⭐⭐ Acceptable | ⭐⭐⭐⭐ Exigeante |
| **Facilité implémentation** | ⭐⭐⭐ Bonne | ⭐⭐ Moyenne | ⭐ Difficile |
| **Qualité transcription** | ⭐⭐⭐ Excellente | ⭐⭐⭐ Excellente | ⭐⭐⭐⭐ Parfaite |
| **Recommandation** | ✅ **RECOMMANDÉE** | ⚠️ Si Stratégie 1 échoue | ❌ Trop complexe |

---

## 🎯 Recommandation Finale

### Stratégie 1 : Overlap Temporel (5 secondes)

**Pourquoi** :
- ✅ Bon équilibre complexité/performance
- ✅ Réduit considérablement le risque de perte
- ✅ Facile à implémenter dans le code existant
- ✅ Overlap de 5s est suffisant (même avec 1s de latence, on a 4s de marge)

**Points d'attention** :
- Implémenter la fonction `findOverlap()` pour détecter les doublons
- Tester avec différents accents/langues pour valider la détection
- Logger les overlaps détectés pour monitoring

---

## 🚀 Plan d'Implémentation (Optionnel)

Si tu veux implémenter cette stratégie :

1. **Phase 1** : Ajouter les refs et la logique de démarrage anticipé
2. **Phase 2** : Implémenter `findOverlap()` et `mergeTranscriptionChunks()`
3. **Phase 3** : Intégrer la fusion dans le flux de traitement des chunks
4. **Phase 4** : Tests avec différents cas (coupures nettes, chevauchements, etc.)

**Estimation** : 2-3 heures de développement + tests

---

## 📝 Notes Importantes

- **Overlap de 5s** est un bon compromis (ni trop court, ni trop long)
- **Whisper est robuste** : même avec un petit chevauchement, la transcription reste cohérente
- **Pas de solution parfaite** : toutes les stratégies ont des compromis
- **Stratégie 1 est la plus pragmatique** pour le cas d'usage actuel

