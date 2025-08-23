# 🐛 BUGS PRIORITAIRES - CENTRINOTE

*Dernière mise à jour : 3 août 2025*

---

## 🔥 PRIORITÉ CRITIQUE (À corriger immédiatement)

### **1. 🔐 Configuration Supabase manquante**
**Statut :** ❌ **BLOQUANT**  
**Impact :** Application non fonctionnelle sans configuration

#### **Problème :**
- Variables d'environnement Supabase non configurées
- Connexion à la base de données impossible
- Authentification non fonctionnelle

#### **Solution requise :**
```env
# Fichier .env à créer
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### **Étapes :**
1. Créer un projet Supabase
2. Copier l'URL et la clé anonyme
3. Configurer les variables d'environnement
4. Appliquer le schéma de base de données

---

### **2. 🤖 Service IA (N8N) non configuré**
**Statut :** ❌ **FONCTIONNALITÉ CASSÉE**  
**Impact :** Assistant IA ne fonctionne pas

#### **Problème :**
- URL webhook N8N non configurée
- Erreurs de connexion dans AISearch
- Automatisations non fonctionnelles

#### **Messages d'erreur :**
```
❌ Workflow N8N non démarré. Vérifiez que le workflow est actif dans N8N.
❌ Erreur de connexion à N8N
```

#### **Solution requise :**
1. Configurer une instance N8N
2. Créer les workflows appropriés
3. Configurer l'URL webhook dans l'application

---

### **3. 🎥 Intégration Zoom non configurée**
**Statut :** ⚠️ **FONCTIONNALITÉ LIMITÉE**  
**Impact :** Réunions Zoom impossibles

#### **Problème :**
- Variables OAuth Zoom manquantes
- Bouton "Se connecter avec Zoom" ne fonctionne pas
- Edge Function zoom-oauth-callback non configurée

#### **Variables manquantes :**
```env
VITE_ZOOM_CLIENT_ID=your-zoom-client-id
VITE_ZOOM_REDIRECT_URI=https://your-supabase-url/functions/v1/zoom-oauth-callback
ZOOM_CLIENT_SECRET=your-zoom-client-secret
```

---

## 🔶 PRIORITÉ HAUTE (À corriger rapidement)

### **4. 💾 Stockage de fichiers non implémenté**
**Statut :** ⚠️ **FONCTIONNALITÉ INCOMPLÈTE**  
**Impact :** Upload de pièces jointes ne fonctionne pas

#### **Problème :**
- Interface d'upload présente mais non fonctionnelle
- Supabase Storage non configuré
- Gestion des fichiers manquante

#### **Code problématique :**
```typescript
// Dans notesService.ts - fonction addAttachment
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('note-attachments') // ❌ Bucket non créé
  .upload(filePath, file);
```

#### **Solution :**
1. Créer les buckets Supabase Storage
2. Configurer les policies d'accès
3. Tester l'upload de fichiers

---

### **5. 🔄 Chat temps réel simulé**
**Statut :** ⚠️ **FONCTIONNALITÉ MOCKÉE**  
**Impact :** Collaboration limitée

#### **Problème :**
- Chat utilise des données simulées
- Pas de WebSocket réel
- Messages ne se synchronisent pas entre utilisateurs

#### **Code problématique :**
```typescript
// Dans useChat.ts
// Simuler des messages existants
const existingMessages: ChatMessage[] = [
  // ❌ Messages hardcodés
];
```

#### **Solution :**
1. Implémenter WebSocket ou Supabase Realtime
2. Créer une table `chat_messages`
3. Synchronisation temps réel

---

### **6. 📊 Données d'analytics mockées**
**Statut :** ⚠️ **DONNÉES FACTICES**  
**Impact :** Statistiques non représentatives

#### **Problème :**
- Graphiques avec données simulées
- Pas de vraies métriques utilisateur
- Analytics non fonctionnelles

#### **Composants affectés :**
- `Dashboard.tsx` - Statistiques
- `StudyPlanning.tsx` - Analytics
- `VocabularyNotebook.tsx` - Progrès

---

## 🔸 PRIORITÉ MOYENNE (À améliorer)

### **7. 🔍 Recherche limitée**
**Statut :** ⚠️ **FONCTIONNALITÉ BASIQUE**  
**Impact :** Recherche peu performante

#### **Problème :**
- Recherche simple par `ILIKE`
- Pas de recherche full-text
- Pas de recherche dans les pièces jointes

#### **Code actuel :**
```sql
-- Recherche basique
.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
```

#### **Amélioration suggérée :**
- Implémenter PostgreSQL Full-Text Search
- Ajouter des index de recherche
- Recherche dans les métadonnées

---

### **8. 🌐 Notifications push manquantes**
**Statut :** ⚠️ **INTERFACE SEULEMENT**  
**Impact :** Pas de vraies notifications

#### **Problème :**
- Interface de paramètres notifications présente
- Aucune notification réelle envoyée
- Pas de service de push

#### **Solution suggérée :**
1. Intégrer un service de notifications (Firebase, OneSignal)
2. Configurer les workers de service
3. Implémenter les notifications push

---

### **9. 🔄 Synchronisation hors ligne**
**Statut :** ❌ **NON IMPLÉMENTÉE**  
**Impact :** Pas de mode hors ligne

#### **Problème :**
- Aucune gestion hors ligne
- Pas de cache local
- Perte de données si connexion coupée

#### **Solution suggérée :**
1. Implémenter Service Worker
2. Cache des données critiques
3. Synchronisation différée

---

## 🔹 PRIORITÉ BASSE (Améliorations futures)

### **10. 🧪 Tests unitaires manquants**
**Statut :** ❌ **AUCUN TEST**  
**Impact :** Risque de régression

#### **Problème :**
- Aucun test unitaire
- Aucun test d'intégration
- Pas de CI/CD

#### **Solution suggérée :**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

---

### **11. ♿ Accessibilité incomplète**
**Statut :** ⚠️ **PARTIELLEMENT IMPLÉMENTÉE**  
**Impact :** Utilisabilité réduite

#### **Problèmes identifiés :**
- Pas de navigation clavier complète
- Contrastes de couleurs à vérifier
- Lecteurs d'écran non testés

#### **Solution suggérée :**
1. Audit d'accessibilité complet
2. Tests avec lecteurs d'écran
3. Amélioration de la navigation clavier

---

### **12. 📱 PWA non configurée**
**Statut :** ❌ **NON IMPLÉMENTÉE**  
**Impact :** Pas d'installation mobile

#### **Problème :**
- Pas de manifest.json
- Pas de Service Worker
- Pas d'installation sur mobile

#### **Solution suggérée :**
```json
{
  "devDependencies": {
    "vite-plugin-pwa": "^0.17.4"
  }
}
```

---

## 🔧 BUGS TECHNIQUES MINEURS

### **13. 🏷️ Champ dupliqué dans la table `notes`**
**Statut :** ⚠️ **NETTOYAGE REQUIS**  
**Impact :** Confusion dans le code

#### **Problème :**
```sql
-- Table notes a deux champs similaires
pinned boolean DEFAULT false,
is_pinned boolean DEFAULT false, -- ❌ Doublon
```

#### **Solution :**
```sql
-- Supprimer le champ en doublon
ALTER TABLE notes DROP COLUMN pinned;
```

---

### **14. 🔄 Gestion d'erreurs à améliorer**
**Statut :** ⚠️ **AMÉLIORATION POSSIBLE**  
**Impact :** UX dégradée en cas d'erreur

#### **Problème :**
- Messages d'erreur parfois techniques
- Pas de retry automatique
- Gestion d'erreurs réseau basique

#### **Amélioration suggérée :**
```typescript
// Retry automatique pour les requêtes
const retryRequest = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

---

### **15. 🎨 Optimisations CSS**
**Statut :** ⚠️ **PERFORMANCE**  
**Impact :** Taille du bundle

#### **Problème :**
- CSS non utilisé dans le bundle
- Pas de purge Tailwind optimisée
- Animations parfois lourdes

#### **Solution :**
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // Purge automatique du CSS non utilisé
}
```

---

## 📋 PLAN DE CORRECTION RECOMMANDÉ

### **🚀 Phase 1 - Configuration de base (1-2 jours)**
1. ✅ Configurer Supabase avec vraies variables
2. ✅ Tester l'authentification
3. ✅ Vérifier le CRUD des notes/vocabulaire
4. ✅ Corriger le champ dupliqué `notes.pinned`

### **🔧 Phase 2 - Services externes (3-5 jours)**
1. ⚠️ Configurer instance N8N pour l'IA
2. ⚠️ Configurer OAuth Zoom
3. ⚠️ Configurer Stripe pour les paiements
4. ⚠️ Tester les Edge Functions

### **🎯 Phase 3 - Fonctionnalités avancées (1-2 semaines)**
1. 🔄 Implémenter le chat temps réel
2. 💾 Configurer Supabase Storage
3. 📊 Remplacer les données mockées
4. 🔍 Améliorer la recherche

### **🧪 Phase 4 - Qualité et tests (1 semaine)**
1. 🧪 Ajouter les tests unitaires
2. ♿ Améliorer l'accessibilité
3. 📱 Configurer PWA
4. 🎨 Optimiser les performances

---

## 🎯 BUGS À CORRIGER EN PRIORITÉ

### **TOP 3 - À corriger MAINTENANT :**
1. **Configuration Supabase** - Bloque toute l'application
2. **Service IA/N8N** - Fonctionnalité principale cassée
3. **Stockage de fichiers** - Fonctionnalité promise mais non fonctionnelle

### **TOP 5 - À corriger cette semaine :**
4. **Chat temps réel** - Améliore l'expérience collaboration
5. **Intégration Zoom** - Complète l'offre de visioconférence

Ces corrections permettront d'avoir une application **100% fonctionnelle** ! 🚀