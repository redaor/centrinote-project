# 📚 EnhancedNoteoMessage - Guide d'utilisation

## 🎯 Vue d'ensemble

Le composant `EnhancedNoteoMessage` est une refonte visuelle élégante des messages de Noteo. Il affiche les messages de l'assistant avec des cartes d'étapes stylisées, des animations fluides et un design moderne.

## ✨ Fonctionnalités

- ✅ **Design moderne et élégant** avec cartes d'étapes
- ✅ **Animations fluides** pour l'apparition progressive des étapes
- ✅ **Horodatage automatique** (format 07h58)
- ✅ **Boutons de résultat** mini et élégants
- ✅ **Support du mode sombre**
- ✅ **Responsive** (mobile et desktop)
- ✅ **Accessibilité WCAG 2.1**

## 🚀 Utilisation de base

### Exemple 1 : Utilisation directe

```tsx
import { EnhancedNoteoMessage, SAVE_BUTTON_STEPS } from './EnhancedNoteoMessage';

function MyComponent() {
  return (
    <EnhancedNoteoMessage
      welcomeMessage="Merci pour cette précision ! Je vais vous guider pas à pas."
      steps={SAVE_BUTTON_STEPS}
      followUpMessage="Faites-moi savoir si cela vous aide !"
      onSuccess={() => console.log('Problème résolu')}
      onFailure={() => console.log('Problème persiste')}
      userName="Reda"
    />
  );
}
```

### Exemple 2 : Avec le service

```tsx
import { enhancedNoteoService } from '../../services/enhancedNoteoService';
import { EnhancedNoteoMessage } from './EnhancedNoteoMessage';

function MyComponent() {
  const config = enhancedNoteoService.createMessageConfig('save-button', 'Reda');

  return (
    <EnhancedNoteoMessage
      welcomeMessage={config.welcomeMessage}
      steps={config.steps}
      followUpMessage={config.followUpMessage}
      onSuccess={() => console.log('Succès')}
      onFailure={() => console.log('Échec')}
    />
  );
}
```

### Exemple 3 : Avec le wrapper intelligent

```tsx
import { NoteoMessageWrapper } from './NoteoMessageWrapper';

function MyComponent() {
  const content = `Merci pour cette précision ! Voici les étapes :

**1. Vérifiez votre connexion** : Assurez-vous que vous êtes connecté.
**2. Actualisez la page** : Appuyez sur F5.
...`;

  return (
    <NoteoMessageWrapper
      content={content}
      problemType="save-button"
      userName="Reda"
      onSuccess={() => console.log('Succès')}
      onFailure={() => console.log('Échec')}
    />
  );
}
```

## 📋 Props du composant

### EnhancedNoteoMessage

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `welcomeMessage` | `string` | ✅ | Message de bienvenue |
| `steps` | `Step[]` | ✅ | Tableau des étapes à afficher |
| `followUpMessage` | `string` | ❌ | Message de suivi (optionnel) |
| `onSuccess` | `() => void` | ❌ | Callback appelé quand l'utilisateur clique sur "Oui" |
| `onFailure` | `() => void` | ❌ | Callback appelé quand l'utilisateur clique sur "Non" |
| `userName` | `string` | ❌ | Nom de l'utilisateur pour personnaliser le message |
| `problemType` | `string` | ❌ | Type de problème (pour le style) |
| `showStepsProgressively` | `boolean` | ❌ | Afficher les étapes progressivement (défaut: true) |
| `stepDelay` | `number` | ❌ | Délai entre chaque étape en ms (défaut: 500) |

### Interface Step

```typescript
interface Step {
  id: string;           // Identifiant unique
  number: number;      // Numéro de l'étape (1, 2, 3...)
  emoji: string;       // Emoji pour l'étape (🌐, 🔄, etc.)
  title: string;       // Titre de l'étape
  content: string;     // Contenu/description de l'étape
  hint?: string;       // Astuce optionnelle
}
```

## 🎨 Types de problèmes supportés

Le service `enhancedNoteoService` supporte les types suivants :

- `'save-button'` : Problème de sauvegarde
- `'import'` : Problème d'import de fichier
- `'automation'` : Problème d'automatisation
- `'meeting'` : Problème de réunion
- `'general'` : Problème général

## 🎭 Animations

Les animations sont gérées par Framer Motion :

- **Entrée du container** : Fade in + slide up
- **Étapes** : Apparition progressive avec délai
- **Boutons** : Hover et tap effects
- **Transitions** : Smooth et fluides

## 📱 Responsive

Le composant s'adapte automatiquement :

- **Mobile** : Cartes pleine largeur, boutons empilés
- **Desktop** : Largeur maximale, boutons côte à côte

## 🌙 Mode sombre

Le composant supporte automatiquement le mode sombre via les classes Tailwind `dark:`.

## 🔍 Détection automatique

Le wrapper `NoteoMessageWrapper` détecte automatiquement :

- Si le message contient des étapes numérotées
- Le type de problème
- Si le format EnhancedNoteoMessage doit être utilisé

## 📝 Exemples d'étapes prédéfinies

### SAVE_BUTTON_STEPS

Étapes prédéfinies pour le problème de sauvegarde :

```typescript
import { SAVE_BUTTON_STEPS } from './EnhancedNoteoMessage';
```

Contient 4 étapes :
1. 🌐 Connexion Internet
2. 🔄 Actualisation
3. 🔒 Permissions
4. 🧭 Navigateur

## 🎯 Intégration dans AIChat

Pour intégrer dans AIChat, vous pouvez utiliser le détecteur :

```typescript
import { analyzeMessage } from '../../utils/noteoMessageDetector';
import { NoteoMessageWrapper } from './NoteoMessageWrapper';

// Dans votre composant
const analysis = analyzeMessage(processedContent);

if (analysis.shouldUseEnhanced) {
  return (
    <NoteoMessageWrapper
      content={processedContent}
      problemType={analysis.problemType}
      userName={user?.name}
    />
  );
}
```

## 🎨 Personnalisation

### Couleurs

Les couleurs peuvent être personnalisées via les classes Tailwind dans le composant.

### Animations

Les délais d'animation peuvent être ajustés via les props `showStepsProgressively` et `stepDelay`.

## 📚 Fichiers associés

- `EnhancedNoteoMessage.tsx` : Composant principal
- `NoteoMessageWrapper.tsx` : Wrapper intelligent
- `enhancedNoteoService.ts` : Service pour générer les messages
- `noteoMessageDetector.ts` : Utilitaires de détection
- `EnhancedNoteoMessage.example.tsx` : Exemples d'utilisation

## 🐛 Dépannage

### Les étapes ne s'affichent pas

Vérifiez que :
- Les étapes sont bien formatées avec `number`, `emoji`, `title`, `content`
- `showStepsProgressively` n'est pas désactivé
- Le délai `stepDelay` n'est pas trop long

### Les boutons ne fonctionnent pas

Vérifiez que :
- Les callbacks `onSuccess` et `onFailure` sont bien définis
- L'état `userResponse` n'est pas déjà défini

## 📖 Ressources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)


