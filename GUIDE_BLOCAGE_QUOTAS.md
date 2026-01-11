# 🎯 GUIDE COMPLET - PATTERN DE BLOCAGE DES QUOTAS

## 📋 TABLE DES MATIÈRES

1. [Pattern général](#pattern-général)
2. [Les 3 endroits où le blocage est implémenté](#les-3-endroits)
3. [Vérification vs Incrémentation](#vérification-vs-incrémentation)
4. [Imports et hooks nécessaires](#imports-et-hooks)
5. [Exemples de code complets](#exemples-de-code)

---

## 🎯 PATTERN GÉNÉRAL

### Séquence complète des appels

```
1. IMPORT du hook useQuotaLimit
   ↓
2. DÉCLARATION des hooks et state
   ↓
3. VÉRIFICATION AVANT l'action (optionnel mais recommandé)
   ↓
4. RENDER avec bouton disabled={!hasAIAccess}
   ↓
5. VÉRIFICATION DANS handleAction (obligatoire)
   ↓
6. INCRÉMENTATION APRÈS succès (obligatoire)
```

### Les 2 approches possibles

#### **Approche A : Vérification à l'ouverture du modal** (Pattern Vocabulaire)
```typescript
// AVANT d'ouvrir le modal, vérifier le quota
const hasAccess = await checkQuotaWithModal('ai_help', 0); // Check sans incrémenter
setHasAIAccess(hasAccess);
setShowModal(true);
```

#### **Approche B : Vérification au chargement** (Pattern Notes)
```typescript
// Dans un useEffect, vérifier au chargement du composant
useEffect(() => {
  const result = await checkQuota('ai_help_count', 0);
  setHasAIAccess(result.allowed);
}, [user?.id]);
```

---

## 📍 LES 3 ENDROITS OÙ LE BLOCAGE EST IMPLÉMENTÉ

### 1️⃣ **AIContentHelper** (Toolbar Notes)

**Fichier** : `src/components/ai/AIContentHelper.tsx`  
**Ligne** : ~214-223

**Pattern utilisé** :
```typescript
// Le composant reçoit disabled comme prop
<Button
  onClick={() => setIsOpen(true)}
  disabled={disabled}  // ← Prop passée depuis le parent
  className={`gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  title={disabled ? 'Aide IA non disponible avec votre plan actuel' : 'Aide IA pour améliorer le contenu'}
>
  <Sparkles className="w-4 h-4" />
  <span>Aide IA</span>
</Button>
```

**Dans ModernNotesManager.tsx (ligne ~740-744)** :
```typescript
<AIContentHelper
  content={formData.content || ''}
  title={formData.title || ''}
  contentType="note"
  disabled={!hasAIAccess}  // ← hasAIAccess vérifié au chargement (useEffect ligne 205-234)
  onApply={async (improvedContent) => {
    // Vérification AVANT d'appliquer (ligne 748-752)
    if (user?.role !== 'admin') {
      const canUse = await checkQuotaWithModal('ai_help', 1);
      if (!canUse) {
        return; // ← Bloque l'action
      }
    }
    // ... applique le contenu ...
  }}
/>
```

**hasAIAccess vérifié au chargement** : `ModernNotesManager.tsx` lignes 205-234
```typescript
useEffect(() => {
  if (user?.role === 'admin') {
    setHasAIAccess(true);
    return;
  }
  
  const timeoutId = setTimeout(async () => {
    const result = await checkQuota('ai_help_count', 0); // Check without incrementing
    setHasAIAccess(result.allowed);
  }, 100);
  
  return () => clearTimeout(timeoutId);
}, [user?.id, user?.role, checkQuota]);
```

---

### 2️⃣ **EmptyNoteAlert** (Modal Note Vide)

**Fichier** : `src/components/documents/EmptyNoteAlert.tsx`  
**Ligne** : ~148-168

**Pattern utilisé** :
```typescript
// Le composant reçoit hasAIAccess comme prop
<Button
  variant={hasAIAccess ? "primary" : "ghost"}
  onClick={hasAIAccess ? handleGenerate : undefined}  // ← onClick conditionnel
  disabled={!hasAIAccess || isGenerating}  // ← disabled basé sur hasAIAccess
  loading={isGenerating}
  className={`
    w-full gap-2
    ${!hasAIAccess 
      ? darkMode 
        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600' 
        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300'
      : ''
    }
  `}
  title={!hasAIAccess ? "Aide IA disponible avec un plan supérieur" : undefined}
>
  {!isGenerating && <Sparkles className={`w-4 h-4 ${!hasAIAccess ? 'opacity-50' : ''}`} />}
  {isGenerating ? 'Génération...' : 'Générer avec l\'IA'}
</Button>
```

**Dans ModernNotesManager.tsx (ligne ~2130-2140)** :
```typescript
<EmptyNoteAlert
  isOpen={showEmptyNoteAlert}
  onGenerateWithAI={hasAIAccess ? async () => {  // ← Vérification conditionnelle
    // Vérification AVANT de générer (ligne 2132-2136)
    if (user?.role !== 'admin') {
      const canUse = await checkQuotaWithModal('ai_help', 1);
      if (!canUse || !formData.title.trim()) {
        return; // ← Bloque l'action
      }
    }
    // ... génère le contenu ...
  } : undefined}  // ← Si hasAIAccess = false, onGenerateWithAI = undefined
  hasAIAccess={hasAIAccess}  // ← Prop passée depuis le parent
/>
```

**hasAIAccess vérifié au chargement** : `ModernNotesManager.tsx` lignes 205-234 (même useEffect que pour AIContentHelper)

---

### 3️⃣ **EmptyVocabularyAlert** (Modal Vocabulaire Vide)

**Fichier** : `src/components/vocabulary/EmptyVocabularyAlert.tsx`  
**Ligne** : ~171-191

**Pattern utilisé** :
```typescript
// Identique à EmptyNoteAlert
<Button
  variant={hasAIAccess ? "primary" : "ghost"}
  onClick={hasAIAccess ? handleGenerate : undefined}  // ← onClick conditionnel
  disabled={!hasAIAccess || isGenerating}  // ← disabled basé sur hasAIAccess
  loading={isGenerating}
  className={`
    w-full gap-2
    ${!hasAIAccess
      ? darkMode
        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600'
        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300'
      : ''
    }
  `}
  title={!hasAIAccess ? "Aide IA disponible avec un plan supérieur" : undefined}
>
  {!isGenerating && <Sparkles className={`w-4 h-4 ${!hasAIAccess ? 'opacity-50' : ''}`} />}
  {isGenerating ? 'Génération...' : 'Générer la définition avec l\'IA'}
</Button>
```

**Dans NeuroVocabulary.tsx (ligne ~2754-2778)** :
```typescript
// AVANT d'ouvrir le modal, vérifier le quota (lignes 645-658)
if (!newWord.definition || !newWord.definition.trim()) {
  const hasAccess = await checkQuotaWithModal('ai_help', 0); // ← Check AVANT d'ouvrir
  setHasAIAccess(hasAccess);
  setEmptyField('definition');
  setShowEmptyVocabAlert(true);
  return;
}

// Puis passer hasAIAccess au modal
<EmptyVocabularyAlert
  isOpen={showEmptyVocabAlert}
  onGenerateWithAI={emptyField === 'definition' ? handleGenerateDefinitionWithAI : undefined}
  hasAIAccess={hasAIAccess}  // ← Prop passée depuis le parent
  darkMode={darkMode}
  emptyField={emptyField}
  term={newWord.term}
/>
```

**hasAIAccess vérifié AVANT d'ouvrir le modal** : `NeuroVocabulary.tsx` lignes 645-658
```typescript
// Dans handleAddWord (ligne 645)
if (!newWord.definition || !newWord.definition.trim()) {
  const hasAccess = await checkQuotaWithModal('ai_help', 0); // Check sans incrémenter
  setHasAIAccess(hasAccess);
  setEmptyField('definition');
  setShowEmptyVocabAlert(true);
  return;
}
```

---

## 🔄 VÉRIFICATION vs INCRÉMENTATION

### Quand vérifier AVANT (checkQuotaWithModal) ?

**✅ TOUJOURS vérifier AVANT** :
1. **Avant d'ouvrir un modal** (pattern vocabulaire)
   ```typescript
   const hasAccess = await checkQuotaWithModal('ai_help', 0); // increment = 0
   setHasAIAccess(hasAccess);
   setShowModal(true);
   ```

2. **Avant d'exécuter une action** (dans handleAction)
   ```typescript
   const canUse = await checkQuotaWithModal('ai_help', 1); // increment = 1 (simule l'usage)
   if (!canUse) {
     return; // ← Bloque l'action
   }
   // ... continue l'action ...
   ```

3. **Au chargement du composant** (pattern notes - optionnel)
   ```typescript
   useEffect(() => {
     const result = await checkQuota('ai_help_count', 0); // increment = 0
     setHasAIAccess(result.allowed);
   }, [user?.id]);
   ```

### Quand incrémenter APRÈS (incrementQuota) ?

**✅ TOUJOURS incrémenter APRÈS** :
1. **Après génération réussie**
   ```typescript
   try {
     // ... génération du contenu ...
     if (generatedContent) {
       // Incrémenter le quota
       await incrementQuota(user.id, 'ai_help_count', 1);
       
       // Mettre à jour hasAIAccess pour refléter le nouvel état
       const updatedQuota = await checkQuota('ai_help_count', 0);
       setHasAIAccess(updatedQuota.allowed);
     }
   } catch (error) {
     // En cas d'erreur, ne pas incrémenter
   }
   ```

**⚠️ IMPORTANT** : 
- **Ne JAMAIS incrémenter si l'action échoue**
- **Toujours incrémenter APRÈS le succès**
- **Mettre à jour hasAIAccess après incrémentation pour griser le bouton si quota épuisé**

---

## 📦 IMPORTS ET HOOKS NÉCESSAIRES

### Dans un composant qui utilise le quota

```typescript
// 1. IMPORTS
import { useState, useEffect } from 'react';
import { useQuotaLimit } from '../../hooks/useQuotaLimit';
import { useQuotaCheck } from '../../hooks/useQuotaCheck';
import { incrementQuota } from '../../services/quotaService'; // Si besoin d'incrémenter

// 2. DÉCLARATION DES HOOKS
export function MonComposant() {
  // Hook pour vérifier et afficher modal
  const { checkAndShowModal: checkQuotaWithModal, modal: quotaModal } = useQuotaLimit();
  
  // Hook pour vérifier sans modal (optionnel)
  const { check: checkQuota, increment: incrementQuotaUsage } = useQuotaCheck();
  
  // State pour contrôler le disabled du bouton
  const [hasAIAccess, setHasAIAccess] = useState(false);
  
  // ... reste du code ...
  
  // 3. RENDER avec modal de quota
  return (
    <>
      {/* Votre composant */}
      
      {/* Modal de quota (obligatoire si vous utilisez checkQuotaWithModal) */}
      {quotaModal}
    </>
  );
}
```

### Différence entre useQuotaLimit et useQuotaCheck

| Hook | Usage | Retourne | Modal |
|------|-------|----------|-------|
| `useQuotaLimit` | Vérifier + Afficher modal automatiquement | `Promise<boolean>` | ✅ Oui (inclus) |
| `useQuotaCheck` | Vérifier sans modal (plus de contrôle) | `Promise<QuotaCheckResult>` | ❌ Non |

**Quand utiliser lequel ?**
- `useQuotaLimit` : **Recommandé pour 99% des cas** - plus simple, affiche automatiquement le modal
- `useQuotaCheck` : **Seulement si vous voulez un contrôle total** - pas de modal automatique

---

## 💻 EXEMPLES DE CODE COMPLETS

### Exemple 1 : Pattern Simple (Recommandé)

```typescript
import { useState } from 'react';
import { useQuotaLimit } from '../../hooks/useQuotaLimit';
import { incrementQuota } from '../../services/quotaService';
import { useApp } from '../../contexts/AppContext';

export function MonComposant() {
  const { state } = useApp();
  const { user } = state;
  
  // 1. Hook pour vérifier le quota
  const { checkAndShowModal: checkQuotaWithModal, modal: quotaModal } = useQuotaLimit();
  
  // 2. State pour contrôler le disabled
  const [hasAIAccess, setHasAIAccess] = useState(true); // Par défaut true, sera vérifié après
  
  // 3. Fonction qui utilise l'Aide IA
  const handleAideIA = async () => {
    // Vérification AVANT l'action
    if (user?.role !== 'admin') {
      const canUse = await checkQuotaWithModal('ai_help', 1);
      if (!canUse) {
        setHasAIAccess(false);
        return; // ← Bloque l'action, modal affiché automatiquement
      }
    }
    
    try {
      // Action (génération, amélioration, etc.)
      const result = await generateWithAI();
      
      // Incrémentation APRÈS succès
      if (user?.role !== 'admin' && user?.id) {
        await incrementQuota(user.id, 'ai_help_count', 1);
        
        // Mettre à jour hasAIAccess pour refléter le nouvel état
        const updatedAccess = await checkQuotaWithModal('ai_help', 0);
        setHasAIAccess(updatedAccess);
      }
    } catch (error) {
      // En cas d'erreur, ne pas incrémenter
      console.error('Erreur génération:', error);
    }
  };
  
  // 4. Render avec bouton disabled
  return (
    <>
      <button
        onClick={handleAideIA}
        disabled={!hasAIAccess}
        className={!hasAIAccess ? 'opacity-50 cursor-not-allowed' : ''}
      >
        Aide IA
      </button>
      
      {/* Modal de quota (obligatoire) */}
      {quotaModal}
    </>
  );
}
```

### Exemple 2 : Pattern avec Vérification au Chargement

```typescript
import { useState, useEffect } from 'react';
import { useQuotaLimit } from '../../hooks/useQuotaLimit';
import { useQuotaCheck } from '../../hooks/useQuotaCheck';
import { incrementQuota } from '../../services/quotaService';
import { useApp } from '../../contexts/AppContext';

export function MonComposant() {
  const { state } = useApp();
  const { user } = state;
  
  // 1. Hooks
  const { checkAndShowModal: checkQuotaWithModal, modal: quotaModal } = useQuotaLimit();
  const { check: checkQuota, increment: incrementQuotaUsage } = useQuotaCheck();
  
  // 2. State
  const [hasAIAccess, setHasAIAccess] = useState(false);
  const [checkingAIAccess, setCheckingAIAccess] = useState(true);
  
  // 3. Vérification au chargement (comme dans ModernNotesManager)
  useEffect(() => {
    if (user?.role === 'admin') {
      setHasAIAccess(true);
      setCheckingAIAccess(false);
      return;
    }
    
    if (!user?.id) {
      setHasAIAccess(false);
      setCheckingAIAccess(false);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        setCheckingAIAccess(true);
        const result = await checkQuota('ai_help_count', 0); // Check without incrementing
        setHasAIAccess(result.allowed);
      } catch (err) {
        console.error('Error checking AI Help quota:', err);
        setHasAIAccess(false);
      } finally {
        setCheckingAIAccess(false);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [user?.id, user?.role, checkQuota]);
  
  // 4. Fonction qui utilise l'Aide IA
  const handleAideIA = async () => {
    // Double vérification AVANT l'action (sécurité)
    if (user?.role !== 'admin') {
      const canUse = await checkQuotaWithModal('ai_help', 1);
      if (!canUse) {
        setHasAIAccess(false);
        return;
      }
    }
    
    try {
      // Action
      const result = await generateWithAI();
      
      // Incrémentation APRÈS succès
      if (user?.role !== 'admin' && user?.id) {
        await incrementQuotaUsage('ai_help_count', 1);
        
        // Mettre à jour hasAIAccess
        const updatedQuota = await checkQuota('ai_help_count', 0);
        setHasAIAccess(updatedQuota.allowed);
      }
    } catch (error) {
      console.error('Erreur génération:', error);
    }
  };
  
  // 5. Render
  return (
    <>
      <button
        onClick={handleAideIA}
        disabled={!hasAIAccess || checkingAIAccess}
        className={!hasAIAccess ? 'opacity-50 cursor-not-allowed' : ''}
      >
        {checkingAIAccess ? 'Vérification...' : 'Aide IA'}
      </button>
      
      {quotaModal}
    </>
  );
}
```

### Exemple 3 : Pattern avec Vérification AVANT d'Ouvrir le Modal (Pattern Vocabulaire)

```typescript
import { useState } from 'react';
import { useQuotaLimit } from '../../hooks/useQuotaLimit';
import { incrementQuota } from '../../services/quotaService';
import { useApp } from '../../contexts/AppContext';

export function MonComposant() {
  const { state } = useApp();
  const { user } = state;
  
  // 1. Hooks
  const { checkAndShowModal: checkQuotaWithModal, modal: quotaModal } = useQuotaLimit();
  
  // 2. States
  const [hasAIAccess, setHasAIAccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // 3. Fonction qui ouvre le modal (vérification AVANT)
  const handleOpenModal = async () => {
    if (user?.role !== 'admin') {
      const hasAccess = await checkQuotaWithModal('ai_help', 0); // Check sans incrémenter
      setHasAIAccess(hasAccess);
      if (!hasAccess) {
        return; // ← Ne pas ouvrir le modal si quota épuisé
      }
    } else {
      setHasAIAccess(true);
    }
    
    setShowModal(true);
  };
  
  // 4. Fonction qui génère (dans le modal)
  const handleGenerate = async () => {
    // Vérification AVANT l'action (double sécurité)
    if (user?.role !== 'admin') {
      const canUse = await checkQuotaWithModal('ai_help', 1);
      if (!canUse) {
        setHasAIAccess(false);
        return;
      }
    }
    
    try {
      // Action
      const result = await generateWithAI();
      
      // Incrémentation APRÈS succès
      if (user?.role !== 'admin' && user?.id) {
        await incrementQuota(user.id, 'ai_help_count', 1);
        
        // Mettre à jour hasAIAccess
        const updatedAccess = await checkQuotaWithModal('ai_help', 0);
        setHasAIAccess(updatedAccess);
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Erreur génération:', error);
    }
  };
  
  // 5. Render
  return (
    <>
      <button onClick={handleOpenModal}>
        Ouvrir Aide IA
      </button>
      
      {showModal && (
        <Modal>
          <button
            onClick={handleGenerate}
            disabled={!hasAIAccess}
            className={!hasAIAccess ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Générer avec l'IA
          </button>
        </Modal>
      )}
      
      {quotaModal}
    </>
  );
}
```

---

## ✅ CHECKLIST DES ENDROITS À VÉRIFIER

### AIContentHelper.tsx
- [x] **Ligne ~214-223** : Bouton avec `disabled={disabled}` (prop du parent)
- [x] **Ligne ~219** : Message d'erreur conditionnel
- **Parent (ModernNotesManager.tsx)** :
  - [x] **Ligne ~740-744** : `disabled={!hasAIAccess}` passé comme prop
  - [x] **Ligne ~748-752** : Vérification dans `onApply` avec `checkQuotaWithModal`
  - [x] **Ligne ~205-234** : `useEffect` qui vérifie le quota au chargement

### EmptyNoteAlert.tsx
- [x] **Ligne ~148-168** : Bouton avec `disabled={!hasAIAccess || isGenerating}`
- [x] **Ligne ~151-152** : `onClick={hasAIAccess ? handleGenerate : undefined}`
- [x] **Ligne ~17** : `hasAIAccess` reçu comme prop
- **Parent (ModernNotesManager.tsx)** :
  - [x] **Ligne ~2130-2140** : `onGenerateWithAI={hasAIAccess ? async () => {...} : undefined}`
  - [x] **Ligne ~2181** : `hasAIAccess={hasAIAccess}` passé comme prop

### EmptyVocabularyAlert.tsx
- [x] **Ligne ~171-191** : Bouton avec `disabled={!hasAIAccess || isGenerating}`
- [x] **Ligne ~175** : `onClick={hasAIAccess ? handleGenerate : undefined}`
- [x] **Ligne ~16** : `hasAIAccess` reçu comme prop
- **Parent (NeuroVocabulary.tsx)** :
  - [x] **Ligne ~645-658** : Vérification AVANT d'ouvrir le modal avec `checkQuotaWithModal('ai_help', 0)`
  - [x] **Ligne ~2774** : `hasAIAccess={hasAIAccess}` passé comme prop

### ModernNotesManager.tsx
- [x] **Ligne ~195** : `const [hasAIAccess, setHasAIAccess] = useState(false);`
- [x] **Ligne ~201** : `const { checkAndShowModal: checkQuotaWithModal, modal: quotaModal } = useQuotaLimit();`
- [x] **Ligne ~205-234** : `useEffect` qui vérifie le quota au chargement

### NeuroVocabulary.tsx
- [x] **Ligne ~82** : `const { checkAndShowModal: checkQuotaWithModal } = useQuotaLimit();`
- [x] **Ligne ~116** : `const [hasAIAccess, setHasAIAccess] = useState(false);`
- [x] **Ligne ~645-658** : Vérification AVANT d'ouvrir le modal

---

## 🎯 RÉSUMÉ FINAL

### Pattern complet en 6 étapes

```
1. IMPORT : 
   import { useQuotaLimit } from '../../hooks/useQuotaLimit';

2. DÉCLARATION :
   const { checkAndShowModal: checkQuotaWithModal, modal: quotaModal } = useQuotaLimit();
   const [hasAIAccess, setHasAIAccess] = useState(false);

3. VÉRIFICATION (au chargement OU avant action) :
   const hasAccess = await checkQuotaWithModal('ai_help', 0); // increment = 0 pour vérifier
   setHasAIAccess(hasAccess);

4. RENDER avec bouton disabled :
   <Button 
     onClick={handleAction} 
     disabled={!hasAIAccess}
     className={!hasAIAccess ? 'opacity-50 cursor-not-allowed' : ''}
   >
     Aide IA
   </Button>

5. VÉRIFICATION DANS handleAction (obligatoire) :
   const canUse = await checkQuotaWithModal('ai_help', 1); // increment = 1 pour simuler
   if (!canUse) {
     setHasAIAccess(false);
     return; // ← Bloque l'action
   }

6. INCRÉMENTATION APRÈS succès (obligatoire) :
   await incrementQuota(user.id, 'ai_help_count', 1);
   const updatedAccess = await checkQuotaWithModal('ai_help', 0);
   setHasAIAccess(updatedAccess);

7. RENDER du modal (obligatoire) :
   {quotaModal}
```

### Points clés à retenir

✅ **TOUJOURS vérifier AVANT** l'action (double sécurité)  
✅ **TOUJOURS incrémenter APRÈS** le succès  
✅ **JAMAIS incrémenter** si l'action échoue  
✅ **Mettre à jour hasAIAccess** après incrémentation pour griser le bouton  
✅ **Rendre le modal quotaModal** dans le JSX (obligatoire si vous utilisez checkQuotaWithModal)  
✅ **Utiliser disabled={!hasAIAccess}** sur le bouton  
✅ **Optionnel : onClick conditionnel** : `onClick={hasAIAccess ? handleAction : undefined}`

---

## 🔗 RESSOURCES

- **Hook useQuotaLimit** : `src/hooks/useQuotaLimit.tsx`
- **Service quotaService** : `src/services/quotaService.ts`
- **Composant QuotaLimitModal** : `src/components/quota/QuotaLimitModal.tsx`
- **Exemple Notes** : `src/components/documents/ModernNotesManager.tsx` (lignes 195-234)
- **Exemple Vocabulaire** : `src/components/vocabulary/NeuroVocabulary.tsx` (lignes 645-658)

