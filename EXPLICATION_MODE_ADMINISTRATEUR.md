# 👨‍💼 Explication : Mode Administrateur

## 📍 Localisation

Le bouton **"Mode Administrateur"** se trouve en bas de la page **Aide & Support** (`/help`).

## 🔐 Visibilité

Le bouton est **visible uniquement pour les administrateurs** :

```typescript
const isAdmin =
  user?.email === 'contact@centrinote.fr' ||
  user?.email === 'reda_sahraoui@outlook.fr' ||
  user?.role === 'admin';
```

**Conditions d'affichage :**
- ✅ Email = `contact@centrinote.fr`
- ✅ Email = `reda_sahraoui@outlook.fr`
- ✅ Rôle utilisateur = `admin`

## 🎯 Fonctionnalité Actuelle

### État Actuel
Le bouton affiche actuellement une **alerte** indiquant que l'interface d'administration FAQ est à venir :

```typescript
onClick={() => alert('Interface d\'administration FAQ à venir...')}
```

### Fonctionnalité Prévue
Le bouton est prévu pour permettre aux administrateurs de :
- 📝 **Gérer les questions FAQ** (ajouter, modifier, supprimer)
- ✏️ **Modifier les réponses** aux questions fréquentes
- 🏷️ **Gérer les catégories** de FAQ
- 📊 **Voir les statistiques** des questions les plus consultées

## 🎨 Interface Visuelle

Le bouton apparaît dans une **carte avec dégradé** :
- Fond : Dégradé violet/bleu
- Icône : 📄 FileText
- Titre : "👨‍💼 Mode Administrateur"
- Description : "Gérer et répondre aux questions fréquentes"
- Bouton d'action : "Gérer la FAQ" (violet)

## 🔧 Code Source

**Fichier :** `src/components/help/Help.tsx` (lignes 534-564)

```typescript
{/* Mode Admin - Répondre aux questions (visible uniquement pour les admins) */}
{isAdmin && (
  <div className="max-w-4xl mx-auto">
    <div className={`
      ${darkMode ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'}
      border rounded-lg p-6
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              👨‍💼 Mode Administrateur
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Gérer et répondre aux questions fréquentes
            </p>
          </div>
        </div>
        <button
          onClick={() => alert('Interface d\'administration FAQ à venir...')}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
        >
          Gérer la FAQ
        </button>
      </div>
    </div>
  </div>
)}
```

## 🚀 Évolution Future

Pour implémenter la fonctionnalité complète, il faudrait :

1. **Créer une interface d'administration FAQ**
   - Formulaire pour ajouter/modifier les questions
   - Liste des FAQ existantes avec actions (éditer/supprimer)
   - Gestion des catégories

2. **Connecter à la base de données**
   - Stocker les FAQ dans une table `faq_items`
   - Permettre la modification en temps réel

3. **Ajouter des permissions**
   - Vérifier que l'utilisateur a bien les droits admin
   - Protéger les routes d'administration

## 📝 Résumé

- **Rôle** : Interface d'administration pour gérer les FAQ (à venir)
- **Visibilité** : Uniquement pour les administrateurs
- **État** : Placeholder (alerte) - fonctionnalité à implémenter
- **Emplacement** : Bas de la page `/help`

