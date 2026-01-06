# 🧪 Guide de Test des Performances - Centrinote

Ce guide vous aide à mesurer l'impact des optimisations réalisées.

## 📋 Prérequis

- Chrome ou Edge (meilleurs outils de performance)
- Extension Chrome DevTools
- Connexion stable pour tests reproductibles

## 🎯 Tests à Effectuer

### 1. Test de Chargement de MeetingRoom

#### Étapes:
1. Ouvrez Chrome DevTools (F12)
2. Allez dans l'onglet **Performance**
3. Cliquez sur le bouton **Enregistrer** (rond)
4. Naviguez vers `/meetings`
5. Créez une nouvelle réunion
6. Cliquez sur "Rejoindre la réunion"
7. Arrêtez l'enregistrement après le chargement complet

#### Métriques à observer:
- **Time to Interactive (TTI)**: Temps avant de pouvoir cliquer
- **First Contentful Paint (FCP)**: Premier élément affiché
- **Nombre de re-renders**: Visible dans React DevTools Profiler

#### Résultats attendus:
- **Avant**: TTI ~3-4s
- **Après**: TTI ~1.5-2s ✅
- **Gain**: **~50% plus rapide**

---

### 2. Test de Mise à Jour de Réunion

#### Étapes:
1. Ouvrez Chrome DevTools → Onglet **Network**
2. Créez une réunion
3. Modifiez le titre de la réunion
4. Observez les requêtes dans l'onglet Network

#### Métriques à observer:
- **Nombre de requêtes Supabase**: Doit être **1 seule**
- **Temps de réponse**: ~200-300ms

#### Résultats attendus:
- **Avant**: 2 requêtes (UPDATE + SELECT) ~500ms
- **Après**: 1 requête (UPDATE.select()) ~250ms ✅
- **Gain**: **50% plus rapide**

---

### 3. Test de Polling Transcription

#### Étapes:
1. Démarrez une réunion
2. Lancez l'enregistrement
3. Ouvrez Chrome DevTools → **Console**
4. Arrêtez l'enregistrement après 10 secondes
5. Observez les logs de polling (si en mode DEV)

#### Métriques à observer:
- **Fréquence des appels**: Doit suivre le backoff
  - 0-6s: Toutes les 2s (3-4 appels)
  - 6-50s: Toutes les 5s (8-9 appels)
  - Après: Toutes les 10-15s

#### Résultats attendus:
- **Avant**: 24 appels en 2 minutes (toutes les 5s)
- **Après**: 7 appels en 2 minutes (backoff) ✅
- **Gain**: **70% moins d'appels**

---

### 4. Test de Production (Logs)

#### Étapes:
1. Buildez en mode production:
   ```bash
   npm run build
   npm run preview
   ```
2. Ouvrez Chrome DevTools → **Console**
3. Naviguez dans l'application
4. Comptez les logs affichés

#### Métriques à observer:
- **Nombre de logs en production**: Doit être **proche de 0**
- **Logs restants**: Uniquement les erreurs critiques

#### Résultats attendus:
- **Avant**: 50-100 logs par action
- **Après**: 0-2 logs par action ✅
- **Gain**: **95% de logs en moins**

---

## 🛠️ Outils de Mesure

### A. Chrome DevTools - Performance Tab

1. Ouvrez DevTools (F12)
2. Onglet **Performance**
3. Cliquez sur **Settings** (⚙️)
4. Cochez:
   - ✅ Screenshots
   - ✅ Web Vitals
   - ✅ Memory
5. Enregistrez et analysez

**Indicateurs clés**:
- **FCP**: First Contentful Paint (<1.8s = bon)
- **LCP**: Largest Contentful Paint (<2.5s = bon)
- **TTI**: Time to Interactive (<3.8s = bon)
- **CLS**: Cumulative Layout Shift (<0.1 = bon)

---

### B. React DevTools - Profiler

1. Installez [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
2. Ouvrez DevTools → Onglet **Profiler**
3. Cliquez sur le bouton **Record**
4. Effectuez les actions à tester
5. Arrêtez l'enregistrement

**Indicateurs clés**:
- **Nombre de re-renders**: Doit diminuer de 40%
- **Durée des renders**: Doit être plus courte
- **Components flamegraph**: Identifier les composants lents

---

### C. Lighthouse

1. Ouvrez DevTools (F12)
2. Onglet **Lighthouse**
3. Sélectionnez:
   - ✅ Performance
   - ✅ Best Practices
   - ✅ Accessibility
4. Cliquez sur **Analyze page load**

**Score attendu**:
- **Performance**: 90+ (était 70-80)
- **Best Practices**: 95+
- **Accessibility**: 90+

---

## 📊 Tableau de Comparaison

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| **TTI MeetingRoom** | 3-4s | 1.5-2s | **-50%** ✅ |
| **Logs en production** | 50-100/action | 0-2/action | **-95%** ✅ |
| **Requêtes UPDATE** | 500ms (2 req) | 250ms (1 req) | **-50%** ✅ |
| **Appels polling 2min** | 24 appels | 7 appels | **-70%** ✅ |
| **Re-renders** | 4-6 | 2-3 | **-40%** ✅ |
| **Timeout réseau** | 10s | 5s | **-50%** ✅ |

---

## 🐛 Troubleshooting

### Problème: Les logs apparaissent encore en production
**Solution**: Vérifiez que vous avez bien buildé et que `import.meta.env.DEV` est `false` en production.

### Problème: Le polling est trop lent
**Solution**: Le backoff est intentionnel. Les 3 premières tentatives sont rapides (2s), puis ça ralentit.

### Problème: Erreur "Timeout: requête trop longue"
**Solution**: Connexion lente détectée. Augmentez le timeout de 5s à 7s dans `useMeetings.tsx` ligne 91.

---

## ✅ Checklist de Test

Avant de valider les optimisations:

- [ ] Build de production réussit (`npm run build`)
- [ ] TypeScript compile sans erreur (`npx tsc --noEmit`)
- [ ] Aucun log en mode production (sauf erreurs)
- [ ] TTI de MeetingRoom < 2s
- [ ] Polling utilise le backoff exponentiel
- [ ] Mise à jour meeting en 1 seule requête
- [ ] Score Lighthouse Performance > 90
- [ ] Pas de régression fonctionnelle

---

## 📝 Rapport de Test

Remplissez ce tableau après vos tests:

```
Date: _____________
Testeur: _____________

| Test | Résultat Attendu | Résultat Réel | ✅/❌ |
|------|------------------|---------------|-------|
| TTI MeetingRoom | 1.5-2s | ___s | ___ |
| Logs production | 0-2 | ___ | ___ |
| UPDATE meeting | 1 requête | ___ | ___ |
| Polling 2min | 7 appels | ___ | ___ |
| Lighthouse | 90+ | ___ | ___ |

Commentaires:
_________________________________
_________________________________
```

---

## 🎯 Prochaines Optimisations

Si les tests sont validés, voici les prochaines étapes:

### Court terme:
1. Ajouter un cache localStorage pour les meetings
2. Implémenter React.lazy() pour les routes
3. Pré-charger Daily.co SDK en arrière-plan

### Moyen terme:
1. Code splitting par route
2. Image lazy loading
3. Service Worker pour offline

### Long terme:
1. IndexedDB pour cache persistant
2. Prefetch des ressources critiques
3. HTTP/2 Server Push

---

*Guide créé le 2026-01-06 - Centrinote Team*
