# Git Diff - Correction du calcul du ghost-text

## Fichier : `src/features/ghost-text/ui/GhostTextArea.tsx`

### Changements effectués (lignes 73-93)

```diff
    const words = value.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const suggestionWord = suggestion.text.toLowerCase();
+   const lastWordLower = lastWord.toLowerCase();

    // Calculer la partie manquante (ce qui reste à compléter)
    let ghostPart = '';

-   if (suggestion.type === 'completion' && suggestionWord.startsWith(lastWord.toLowerCase())) {
+   // Vérifier que suggestionWord commence par lastWord (insensible à la casse)
+   if (suggestion.type === 'completion' && lastWordLower.length > 0 && suggestionWord.startsWith(lastWordLower)) {
      // Complétion : afficher la partie manquante
-     ghostPart = suggestionWord.slice(lastWord.length);
+     ghostPart = suggestionWord.slice(lastWordLower.length);
    } else if (suggestion.type === 'correction' && lastWord.length > 0) {
      // Correction : remplacer le mot entier
      ghostPart = suggestionWord;
    }

+   // Log pour debug
+   console.log('[GHOST]', { lastWord, suggestionWord, ghostPart });
+
    setGhostText(ghostPart);
```

## Corrections apportées

1. **Variable `lastWordLower`** : Création d'une variable pour éviter de recalculer `lastWord.toLowerCase()` plusieurs fois
2. **Vérification de longueur** : Ajout de `lastWordLower.length > 0` pour éviter les calculs sur des chaînes vides
3. **Utilisation de `lastWordLower.length`** : Utilisation de la longueur de la version minuscule pour le `slice()`, garantissant que le suffixe est correctement calculé
4. **Console.log ajouté** : Pour debug et vérification

## Tests attendus

- Taper « f » → ghost doit afficher « aut » (si suggestion = "faut")
- Taper « fa » → ghost doit afficher « ut » (si suggestion = "faut")
- Taper « faut » → ghost doit afficher « » (rien, car mot complet)

## Log console attendu

```
[GHOST] { lastWord: 'f', suggestionWord: 'faut', ghostPart: 'aut' }
[GHOST] { lastWord: 'fa', suggestionWord: 'faut', ghostPart: 'ut' }
[GHOST] { lastWord: 'faut', suggestionWord: 'faut', ghostPart: '' }
```

