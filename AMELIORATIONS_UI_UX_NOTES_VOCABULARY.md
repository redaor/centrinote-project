# 🎨 Améliorations UI/UX - Notes & Vocabulaire

## Vue Note - Mode Lecture

### 1.1 Aperçu 3 lignes sous le titre ✅
- Ajout d'un aperçu du contenu (3 premières lignes) sous le titre
- Couleur: `#6b7280`, `text-sm`, `line-clamp-3`

### 1.2 Badge auto-sauvegarde ✅
- Remplace "Aide IA" par un badge de statut
- Vert 500: "Auto-sauvegardé à HH:mm" (si à jour)
- Orange 400: "Modifications non sauvegardées" (si changements)

### 1.3 Menu ⋯ pour Supprimer ✅
- Menu trois points en haut à droite
- Popover avec "Supprimer" + confirmation

### 1.4 Icône Épingler seule ✅
- Garde l'icône Pin visible mais sans texte

---

## Vue Note - Mode Édition

### 2.1 Éditeur minimal ✅
- Barre d'outils: gras, italique, code, liste
- Textarea auto-grow (max-h-96)

### 2.2 Bouton Annuler ✅
- À côté de "Enregistrer"
- Restore la dernière version sauvegardée

### 2.3 Aide IA dans barre d'outils ✅
- Icône étoile avec sous-menu:
  - Résumer
  - Corriger les fautes
  - Suggérer un titre

### 2.4 Désactiver Enregistrer si identique ✅
- Bouton désactivé si texte = version sauvegardée

---

## Vue Vocabulaire - Mode Lecture

### 3.1 Accordion ✅
- Clic sur mot = déplie définition + 1 exemple

### 3.2 Badge "À réviser" ✅
- Si dernière révision > 24h ET maîtrise < 80%

### 3.3 Menu ⋯ ✅
- "Supprimer" et "Marquer maîtrisé" dans menu

### 3.4 Progress-bar maîtrise ✅
- Barre fine sous la ligne (vert 500)

---

## Vue Vocabulaire - Mode Édition

### 4.1 Textarea exemples ✅
- Remplace input cassé par textarea
- Placeholder: "Ex. : Le client a changé le vocabulaire de la dernière minute."

### 4.2 Bouton "Voir en contexte" ✅
- À droite du champ exemple
- Génère phrase avec mot + exemple

### 4.3 Sliders difficulté/maîtrise ✅
- Slider 1-5 avec labels "facile → difficile"
- 5 étoiles cliquables pour maîtrise (0-100%)

### 4.4 Aide IA barre outils ✅
- Icône étoile, action: "Générer un exemple"

