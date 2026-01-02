# 🔋 Implémentation Wake Lock API - Documentation Complète

## ✅ Modifications Appliquées

### 1. Déclarations TypeScript avec `declare global`

**Fichier** : `src/hooks/useLongRecording.ts`

```typescript
declare global {
  interface WakeLockSentinel extends EventTarget {
    readonly type: 'screen';
    readonly released: boolean;
    release(): Promise<void>;
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null;
  }

  interface WakeLock {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  }

  interface Navigator {
    wakeLock?: WakeLock;
  }
}
```

**Avantage** : Utilisation de `declare global` évite les conflits avec les types existants et permet l'extension propre de l'interface `Navigator`.

### 2. Prévention des Doublons

**Fonction `requestWakeLock()`** :
- ✅ Vérifie si un wake lock est déjà actif (`wakeLockRef.current && !wakeLockRef.current.released`)
- ✅ Évite les demandes multiples
- ✅ Log informatif : `🔋 Wake Lock déjà actif, pas de nouvelle demande`

### 3. Libération Propre avec try/finally

**Fonction `releaseWakeLock()`** :
```typescript
const releaseWakeLock = useCallback(() => {
  if (!wakeLockRef.current) {
    return; // Déjà libéré ou jamais activé
  }

  try {
    if (!wakeLockRef.current.released) {
      wakeLockRef.current.release();
      console.log('🔋 Wake Lock libéré');
    }
  } catch (err) {
    console.error('❌ Erreur lors de la libération du Wake Lock:', err);
  } finally {
    // Garantir que la ref est toujours réinitialisée, même en cas d'erreur
    wakeLockRef.current = null;
    setIsWakeLockActive(false);
  }
}, []);
```

**Avantages** :
- ✅ `finally` garantit la réinitialisation même en cas d'erreur
- ✅ Vérification de `released` avant libération
- ✅ Mise à jour de l'état UI systématique

### 4. Détection Erreurs Batterie Faible / Eco-mode

**Gestion d'erreurs améliorée** :
```typescript
catch (err: any) {
  const errorMessage = err?.message || 'Erreur inconnue';
  
  if (errorMessage.includes('NotAllowedError') || errorMessage.includes('NotAllowed')) {
    console.warn('⚠️ Wake Lock refusé: Permission refusée ou mode économie d\'énergie actif');
  } else if (errorMessage.includes('AbortError')) {
    console.warn('⚠️ Wake Lock annulé: Possiblement dû au mode économie d\'énergie');
  } else {
    console.error('❌ Wake Lock erreur:', err);
  }
  
  wakeLockRef.current = null;
  setIsWakeLockActive(false);
}
```

**Détection spécifique** :
- `NotAllowedError` : Permission refusée ou mode économie d'énergie
- `AbortError` : Annulation (souvent due à l'éco-mode)
- Logs distincts pour chaque cas

### 5. Clean-up Complet (Unmount + Tous les Chemins de Sortie)

#### Cleanup dans `stopRecording()` :
```typescript
const stopRecording = useCallback(() => {
  // ... arrêt des MediaRecorders ...
  
  // 🔋 Libérer le Wake Lock
  releaseWakeLock();
  
  setIsRecording(false);
}, []);
```

#### Cleanup dans `useEffect` (unmount) :
```typescript
useEffect(() => {
  return () => {
    // Cleanup lors du démontage
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        wakeLockRef.current.release();
        console.log('🔋 Wake Lock libéré (cleanup unmount)');
      } catch (err) {
        console.error('❌ Erreur lors de la libération du Wake Lock (cleanup):', err);
      } finally {
        wakeLockRef.current = null;
        setIsWakeLockActive(false);
      }
    }
  };
}, []);
```

**Garanties** :
- ✅ Libération dans `stopRecording()` (arrêt normal)
- ✅ Libération dans `useEffect` cleanup (unmount du composant)
- ✅ Libération dans le handler `release` (système libère le lock)

### 6. Indicateur Visuel dans l'UI

**Fichier** : `src/components/documents/LongRecButton.tsx`

**Ajout de l'icône Monitor** :
```tsx
{isWakeLockActive && (
  <div className="flex items-center gap-1 text-green-600 dark:text-green-400" 
       title="Écran maintenu allumé pendant l'enregistrement">
    <Monitor className="w-3.5 h-3.5" />
  </div>
)}
```

**Caractéristiques** :
- ✅ Icône `Monitor` de Lucide React
- ✅ Couleur verte (indicateur positif)
- ✅ Visible uniquement quand `isWakeLockActive === true`
- ✅ Tooltip informatif
- ✅ Support dark mode

### 7. État Réactif pour l'UI

**Ajout dans l'interface** :
```typescript
interface UseLongRecordingReturn {
  // ... autres propriétés ...
  isWakeLockActive: boolean; // ✅ Indicateur pour l'UI
}
```

**État React** :
```typescript
const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);
```

**Mise à jour** :
- ✅ `setIsWakeLockActive(true)` quand le wake lock est activé
- ✅ `setIsWakeLockActive(false)` quand libéré (try/finally + événement release)

## 🔄 Flux Complet

### Démarrage de l'enregistrement :
1. `startRecording()` appelé
2. `requestWakeLock()` appelé après `mediaRecorder.start()`
3. Vérification doublon (skip si déjà actif)
4. Demande wake lock via `navigator.wakeLock.request('screen')`
5. Écoute de l'événement `release` (système peut libérer)
6. `setIsWakeLockActive(true)` → UI affiche l'icône

### Pendant l'enregistrement :
- Wake lock reste actif même entre chunks (overlap)
- Si le système libère le lock, événement `release` déclenché
- `setIsWakeLockActive(false)` → icône disparaît

### Arrêt de l'enregistrement :
1. `stopRecording()` appelé
2. `releaseWakeLock()` appelé
3. `try/finally` garantit la libération et réinitialisation
4. `setIsWakeLockActive(false)` → icône disparaît

### Unmount du composant :
1. `useEffect` cleanup exécuté
2. Vérification si wake lock actif
3. Libération avec `try/finally`
4. Réinitialisation complète

## 🌐 Compatibilité Navigateurs

### Support natif :
- ✅ **Chrome/Edge 84+** : Support complet
- ✅ **Firefox 111+** : Support complet
- ✅ **Safari 16.4+** : Support complet (iOS 16.4+, macOS 13+)

### Prérequis :
- 🔒 **HTTPS requis** (ou `localhost` pour le développement)
- 📱 **Permission utilisateur** : Peut être refusée par l'utilisateur
- 🔋 **Mode économie d'énergie** : Peut bloquer le wake lock sur mobile

### Fallback gracieux :
- ⚠️ Si l'API n'est pas disponible : Log d'avertissement, enregistrement continue
- ⚠️ Si la demande échoue : Log d'erreur spécifique, enregistrement continue
- ✅ L'enregistrement audio **ne dépend pas** du wake lock

## 📊 Logs Disponibles

### Logs de succès :
- `🔋 Wake Lock activé` : Activation réussie
- `🔋 Wake Lock libéré` : Libération manuelle réussie
- `🔋 Wake Lock libéré par le système` : Libération par le système
- `🔋 Wake Lock libéré (cleanup unmount)` : Libération lors du démontage

### Logs d'avertissement :
- `⚠️ Wake Lock API non disponible dans ce navigateur` : API absente
- `⚠️ Wake Lock refusé: Permission refusée ou mode économie d'énergie actif` : Permission refusée / éco-mode
- `⚠️ Wake Lock annulé: Possiblement dû au mode économie d'énergie` : Annulation système
- `🔋 Wake Lock déjà actif, pas de nouvelle demande` : Doublon évité

### Logs d'erreur :
- `❌ Wake Lock erreur: [détails]` : Erreur lors de la demande
- `❌ Erreur lors de la libération du Wake Lock: [détails]` : Erreur lors de la libération

## 🧪 Tests Recommandés

### Tests Desktop :
1. ✅ Chrome/Edge : Démarrer enregistrement → Vérifier icône verte → Arrêter → Icône disparaît
2. ✅ Firefox : Même test
3. ✅ Safari (macOS) : Même test

### Tests Mobile :
1. ✅ Chrome Android : Démarrer enregistrement → Vérifier que l'écran reste allumé
2. ✅ Safari iOS : Même test (iOS 16.4+)
3. ✅ Mode économie d'énergie : Vérifier que le warning est loggé

### Tests Edge Cases :
1. ✅ Démarrage rapide/arrêt : Vérifier qu'il n'y a pas de doublons
2. ✅ Unmount pendant enregistrement : Vérifier cleanup
3. ✅ Système libère le lock : Vérifier événement `release`

## 🎯 Résultats Attendus

### Comportement Normal :
- ✅ L'écran reste allumé pendant l'enregistrement
- ✅ Icône verte visible dans l'UI
- ✅ Wake lock libéré automatiquement à l'arrêt
- ✅ Aucune fuite mémoire

### Comportement avec Restrictions :
- ⚠️ Mode économie d'énergie : Warning loggé, enregistrement continue
- ⚠️ Permission refusée : Warning loggé, enregistrement continue
- ⚠️ API non disponible : Warning loggé, enregistrement continue

## 📝 Notes d'Implémentation

1. **Pas de dépendance critique** : L'enregistrement audio fonctionne même si le wake lock échoue
2. **UX améliorée** : L'utilisateur voit visuellement que l'écran est maintenu actif
3. **Robustesse** : Tous les chemins de sortie libèrent proprement le wake lock
4. **Compatibilité** : Fallback gracieux pour navigateurs non compatibles
5. **Logs détaillés** : Facilite le debugging et le monitoring

