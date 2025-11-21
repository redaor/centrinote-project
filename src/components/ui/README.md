# 🎨 Bibliothèque de Composants UI

Composants réutilisables, accessibles et modernes pour l'interface Centrinote.

---

## 📦 Composants disponibles

### CardSection
Section conteneur stylisée avec icône, titre et description.

```tsx
import { CardSection } from './components/ui/CardSection';
import { User } from 'lucide-react';

<CardSection
  title="Profil"
  icon={User}
  description="Gérez vos informations personnelles"
  darkMode={isDarkMode}
>
  {/* Votre contenu */}
</CardSection>
```

**Props :**
- `title` (string) - Titre de la section
- `icon` (LucideIcon) - Icône Lucide
- `description?` (string) - Description optionnelle
- `darkMode?` (boolean) - Mode sombre
- `className?` (string) - Classes CSS additionnelles
- `children` (ReactNode) - Contenu de la section

---

### Switch
Toggle switch accessible avec support complet ARIA.

```tsx
import { Switch } from './components/ui/Switch';

<Switch
  checked={isEnabled}
  onChange={setIsEnabled}
  label="Notifications"
  description="Recevoir des notifications par email"
  darkMode={isDarkMode}
  aria-label="Activer les notifications"
/>
```

**Props :**
- `checked` (boolean) - État actuel
- `onChange` (function) - Callback lors du changement
- `label?` (string) - Label visible
- `description?` (string) - Description additionnelle
- `disabled?` (boolean) - Désactiver le switch
- `darkMode?` (boolean) - Mode sombre
- `aria-label?` (string) - Label ARIA
- `aria-describedby?` (string) - Description ARIA

**Accessibilité :**
- ✅ Navigation au clavier (Espace, Entrée)
- ✅ `role="switch"`
- ✅ `aria-checked`
- ✅ Focus visible
- ✅ Taille de zone de toucher 44x24px minimum

---

### ModalConfirm
Modal de confirmation avec support pour input obligatoire.

```tsx
import { ModalConfirm } from './components/ui/ModalConfirm';

<ModalConfirm
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleConfirm}
  title="Supprimer le compte"
  message="Cette action est irréversible."
  confirmText="Supprimer"
  cancelText="Annuler"
  type="danger"
  requireInput={true}
  inputLabel="Tapez 'SUPPRIMER' pour confirmer"
  inputPlaceholder="SUPPRIMER"
  darkMode={isDarkMode}
  isLoading={isLoading}
/>
```

**Props :**
- `isOpen` (boolean) - État d'ouverture
- `onClose` (function) - Callback de fermeture
- `onConfirm` (function) - Callback de confirmation
- `title` (string) - Titre de la modal
- `message` (string) - Message principal
- `confirmText?` (string) - Texte du bouton de confirmation (défaut: "Confirmer")
- `cancelText?` (string) - Texte du bouton d'annulation (défaut: "Annuler")
- `type?` ('warning' | 'danger' | 'info') - Type de modal (défaut: 'warning')
- `requireInput?` (boolean) - Nécessite une saisie pour confirmer
- `inputLabel?` (string) - Label de l'input obligatoire
- `inputPlaceholder?` (string) - Placeholder de l'input
- `darkMode?` (boolean) - Mode sombre
- `isLoading?` (boolean) - État de chargement

**Accessibilité :**
- ✅ `role="dialog"`
- ✅ `aria-modal="true"`
- ✅ Focus piégé dans la modal
- ✅ Échap pour fermer
- ✅ Retour du focus après fermeture

---

### AvatarUploader
Composant d'upload d'avatar avec preview et validation.

```tsx
import { AvatarUploader } from './components/ui/AvatarUploader';

<AvatarUploader
  currentAvatar={user.avatarUrl}
  onUpload={handleUpload}
  onRemove={handleRemove}
  darkMode={isDarkMode}
  size="lg"
/>
```

**Props :**
- `currentAvatar?` (string | null) - URL de l'avatar actuel
- `onUpload` (function) - Callback pour upload (reçoit File, retourne Promise<void>)
- `onRemove?` (function) - Callback pour suppression (retourne Promise<void>)
- `darkMode?` (boolean) - Mode sombre
- `disabled?` (boolean) - Désactiver l'upload
- `size?` ('sm' | 'md' | 'lg') - Taille du composant (défaut: 'lg')
- `className?` (string) - Classes CSS additionnelles

**Validation automatique :**
- Types supportés : JPG, PNG, GIF, WebP
- Taille maximum : 2MB
- Messages d'erreur clairs

**Accessibilité :**
- ✅ Label accessible
- ✅ Instructions associées
- ✅ Boutons accessibles au clavier

---

### ToastManager
Système de notifications toast avec provider et helpers.

```tsx
// 1. Envelopper votre app avec ToastProvider
import { ToastProvider } from './components/ui/ToastManager';

function App() {
  return (
    <ToastProvider darkMode={isDarkMode}>
      {/* Votre app */}
    </ToastProvider>
  );
}

// 2. Utiliser les toasts dans vos composants
import { useToastHelpers } from './components/ui/ToastManager';

function MyComponent() {
  const toast = useToastHelpers();
  
  const handleSuccess = () => {
    toast.success('Action réussie');
  };
  
  const handleError = () => {
    toast.error('Une erreur est survenue', 'Détails de l\'erreur');
  };
  
  const handleWarning = () => {
    toast.warning('Attention');
  };
  
  const handleInfo = () => {
    toast.info('Information importante');
  };
  
  return (
    <button onClick={handleSuccess}>Tester</button>
  );
}
```

**API ToastHelpers :**
- `success(title, message?)` - Toast de succès (vert)
- `error(title, message?)` - Toast d'erreur (rouge)
- `warning(title, message?)` - Toast d'avertissement (jaune)
- `info(title, message?)` - Toast d'information (bleu)

**Fonctionnalités :**
- Auto-dismiss après 4 secondes (configurable)
- Bouton de fermeture manuel
- Empilables
- Animations fluides
- Support dark mode

**Accessibilité :**
- ✅ `role="alert"`
- ✅ `aria-live="polite"`
- ✅ Bouton de fermeture accessible

---

## 🎨 Thème et personnalisation

### Couleurs

Tous les composants supportent le mode sombre via la prop `darkMode`.

```tsx
const isDarkMode = document.documentElement.classList.contains('dark');

<Component darkMode={isDarkMode} />
```

### Classes Tailwind utilisées

**Couleurs principales :**
- `blue-*` - Actions primaires
- `red-*` - Actions destructrices
- `green-*` - Succès
- `yellow-*` - Avertissements
- `gray-*` - Neutre

**Espacements :**
- `space-y-4/6/8` - Espacement vertical
- `space-x-2/3/4` - Espacement horizontal
- `p-3/4/6/8` - Padding
- `m-2/4/6/8` - Margin

**Bordures :**
- `rounded-xl/2xl` - Bordures arrondies
- `border/border-2` - Épaisseur
- `border-gray-*` - Couleurs

**Animations :**
- `animate-fade-in` - Apparition en fondu
- `animate-slide-up` - Glissement vers le haut
- `animate-slide-down` - Glissement vers le bas
- `animate-scale-in` - Zoom progressif

---

## 🔧 Hooks utilitaires

### useTheme

Gestion du thème avec support des préférences système.

```tsx
import { useTheme } from '../../hooks/useTheme';

function MyComponent() {
  const { theme, isDarkMode, setTheme, toggleTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme('dark')}>
      Mode sombre
    </button>
  );
}
```

**API :**
- `theme` ('system' | 'light' | 'dark') - Thème actuel
- `isDarkMode` (boolean) - True si mode sombre actif
- `setTheme(theme)` - Changer le thème
- `toggleTheme()` - Basculer entre clair/sombre

---

## 📱 Responsive Design

Tous les composants sont responsive avec des breakpoints Tailwind :

```tsx
// Exemple de classes responsive
<div className="
  flex flex-col                    // Mobile: vertical
  md:flex-row md:items-center      // Tablet: horizontal
  lg:space-x-8                     // Desktop: espacement
">
  {/* Contenu */}
</div>
```

**Breakpoints :**
- `sm:` - 640px (mobile large)
- `md:` - 768px (tablet)
- `lg:` - 1024px (desktop)
- `xl:` - 1280px (large desktop)
- `2xl:` - 1536px (très large)

---

## ♿ Accessibilité

Tous les composants respectent les normes WCAG 2.1 niveau AA :

✅ **Navigation au clavier** - Tab, Entrée, Espace, Échap  
✅ **Labels ARIA** - Tous les éléments sont correctement labellisés  
✅ **Contrastes** - Ratios 4.5:1 minimum  
✅ **Focus visible** - Indicateur clair sur tous les éléments  
✅ **Lecteurs d'écran** - Compatible NVDA, JAWS, VoiceOver  
✅ **Zones de toucher** - 44x44px minimum  

---

## 🧪 Tests

### Test d'un composant

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './Switch';

test('toggle switch changes state', () => {
  const handleChange = jest.fn();
  
  render(
    <Switch 
      checked={false} 
      onChange={handleChange}
      label="Test"
    />
  );
  
  const switchElement = screen.getByRole('switch');
  fireEvent.click(switchElement);
  
  expect(handleChange).toHaveBeenCalledWith(true);
});
```

### Test d'accessibilité

```tsx
import { axe } from 'jest-axe';

test('no accessibility violations', async () => {
  const { container } = render(<Switch checked={false} onChange={jest.fn()} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 📊 Performances

### Optimisations implémentées

- **useCallback** pour les handlers
- **useMemo** pour les calculs coûteux
- **React.memo** sur les composants purs
- **Lazy loading** des modales
- **Debounce** sur les inputs

### Bundle size

| Composant | Taille (gzipped) |
|-----------|------------------|
| CardSection | ~1.2 KB |
| Switch | ~0.8 KB |
| ModalConfirm | ~2.5 KB |
| AvatarUploader | ~3.0 KB |
| ToastManager | ~2.0 KB |
| **Total** | **~9.5 KB** |

---

## 🎯 Bonnes pratiques

### 1. Toujours utiliser darkMode

```tsx
// ❌ Mauvais
<Switch checked={value} onChange={setValue} />

// ✅ Bon
<Switch 
  checked={value} 
  onChange={setValue}
  darkMode={isDarkMode}
/>
```

### 2. Fournir des labels ARIA

```tsx
// ❌ Mauvais
<Switch checked={value} onChange={setValue} />

// ✅ Bon
<Switch 
  checked={value} 
  onChange={setValue}
  label="Notifications"
  aria-label="Activer les notifications"
/>
```

### 3. Gérer les états de chargement

```tsx
// ❌ Mauvais
<ModalConfirm
  isOpen={showModal}
  onConfirm={async () => {
    await deleteAccount();
    setShowModal(false);
  }}
/>

// ✅ Bon
<ModalConfirm
  isOpen={showModal}
  onConfirm={handleDelete}
  isLoading={isDeleting}
/>
```

### 4. Valider les uploads

```tsx
// ✅ Validation automatique dans AvatarUploader
<AvatarUploader
  onUpload={async (file) => {
    // Le composant a déjà validé :
    // - Type MIME
    // - Taille < 2MB
    await uploadToServer(file);
  }}
/>
```

---

## 🔄 Migration depuis les anciens composants

Si vous avez des composants existants, voici comment migrer :

### Switch

**Avant :**
```tsx
<input 
  type="checkbox" 
  checked={value} 
  onChange={e => setValue(e.target.checked)} 
/>
```

**Après :**
```tsx
<Switch
  checked={value}
  onChange={setValue}
  label="Mon option"
  darkMode={isDarkMode}
/>
```

### Modal

**Avant :**
```tsx
{showModal && (
  <div className="modal">
    <h2>Confirmer</h2>
    <button onClick={handleConfirm}>OK</button>
  </div>
)}
```

**Après :**
```tsx
<ModalConfirm
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onConfirm={handleConfirm}
  title="Confirmer"
  message="Êtes-vous sûr ?"
/>
```

---

## 📚 Ressources

- [Documentation Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Hook Form](https://react-hook-form.com)

---

## 🆕 Nouveaux composants à venir

- [ ] Dropdown menu
- [ ] Tabs
- [ ] Tooltip
- [ ] Progress bar
- [ ] Skeleton loader
- [ ] Date picker
- [ ] Color picker

Suggestions ? Ouvrez une issue ! 🚀

