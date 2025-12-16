/**
 * Cache LRU optimisé pour le ghost-text
 * 200 entrées max, 5 minutes de durée
 */

interface CacheEntry {
  word: string;
  timestamp: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize: number = 200, maxAge: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Vérifier l'expiration
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Mettre à jour l'ordre (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.word;
  }

  set(key: string, word: string): void {
    // Si la clé existe déjà, la mettre à jour
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Si le cache est plein, supprimer la plus ancienne entrée
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      word,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Cache global pour le ghost-text
export const ghostCache = new LRUCache(200, 5 * 60 * 1000);

// Pré-remplir avec les mots les plus fréquents (optionnel)
if (typeof window !== 'undefined') {
  // Pré-remplissage avec des complétions de mots courants français
  // IMPORTANT : Le mot suggéré doit TOUJOURS commencer par la clé (préfixe)
  const commonWords = [
    // Verbes courants
    { key: 'doi', word: 'dois' },
    { key: 'doiv', word: 'doivent' },
    { key: 'comp', word: 'comprendre' },
    { key: 'compr', word: 'comprendre' },
    { key: 'compren', word: 'comprendre' },
    { key: 'fai', word: 'faire' },
    { key: 'fair', word: 'faire' },
    { key: 'avoi', word: 'avoir' },
    { key: 'ét', word: 'être' },
    { key: 'étr', word: 'être' },
    { key: 'pouv', word: 'pouvoir' },
    { key: 'pouvoi', word: 'pouvoir' },
    { key: 'voul', word: 'vouloir' },
    { key: 'vouloi', word: 'vouloir' },
    { key: 'all', word: 'aller' },
    { key: 'alle', word: 'aller' },
    { key: 'ven', word: 'venir' },
    { key: 'veni', word: 'venir' },
    // Mots spécifiques à l'application
    { key: 'réu', word: 'réunion' },
    { key: 'réun', word: 'réunion' },
    { key: 'réuni', word: 'réunion' },
    { key: 'not', word: 'note' },
    { key: 'proj', word: 'projet' },
    { key: 'proje', word: 'projet' },
    { key: 'tâch', word: 'tâche' },
    { key: 'impo', word: 'important' },
    { key: 'import', word: 'important' },
    { key: 'importan', word: 'important' },
    { key: 'urg', word: 'urgent' },
    { key: 'urge', word: 'urgent' },
    { key: 'prio', word: 'priorité' },
    { key: 'priori', word: 'priorité' },
    { key: 'priorit', word: 'priorité' },
  ];

  commonWords.forEach(({ key, word }) => {
    ghostCache.set(key, word);
  });
}





