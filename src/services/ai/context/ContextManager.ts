/**
 * Gestionnaire de contexte intelligent
 * Maintien du contexte sur 50k+ tokens, indexation sémantique, gestion des dépendances
 */

export interface ContextEntry {
  id: string;
  type: 'function' | 'class' | 'variable' | 'import' | 'note' | 'user_note' | 'user_vocabulary';
  name: string;
  content: string;
  metadata: {
    file?: string;
    line?: number;
    dependencies?: string[];
    lastUsed?: Date;
    usageCount?: number;
    userId?: string;
    priority?: number; // Pour les données utilisateur (notes épinglées, vocabulaire maîtrisé)
  };
  tokens: number;
}

export interface ContextSearchResult {
  entry: ContextEntry;
  relevance: number; // 0-1
  matchedTerms: string[];
}

export class ContextManager {
  private entries: Map<string, ContextEntry> = new Map();
  private semanticIndex: Map<string, Set<string>> = new Map(); // term -> entry IDs
  private maxTokens: number = 50000; // 50k tokens minimum comme spécifié
  private currentTokens: number = 0;
  private sessionMemory: Map<string, any> = new Map(); // Mémoire de session

  /**
   * Ajoute une entrée au contexte
   */
  addEntry(entry: Omit<ContextEntry, 'id' | 'tokens'>): string {
    const id = this.generateId(entry);
    const tokens = this.estimateTokens(entry.content);

    // Vérifier si on doit faire de la place
    if (this.currentTokens + tokens > this.maxTokens) {
      this.evictOldEntries(tokens);
    }

    const fullEntry: ContextEntry = {
      ...entry,
      id,
      tokens,
      metadata: {
        ...entry.metadata,
        lastUsed: new Date(),
        usageCount: (entry.metadata.usageCount || 0) + 1,
      },
    };

    this.entries.set(id, fullEntry);
    this.currentTokens += tokens;

    // Indexation sémantique
    this.indexSemantically(fullEntry);

    return id;
  }

  /**
   * Recherche sémantique dans le contexte
   */
  search(query: string, limit: number = 10): ContextSearchResult[] {
    const queryTerms = this.extractTerms(query.toLowerCase());
    const results: Map<string, ContextSearchResult> = new Map();

    // Recherche dans l'index sémantique
    for (const term of queryTerms) {
      const entryIds = this.semanticIndex.get(term);
      if (entryIds) {
        for (const entryId of entryIds) {
          const entry = this.entries.get(entryId);
          if (entry) {
            const existing = results.get(entryId);
            if (existing) {
              existing.relevance += 0.2;
              existing.matchedTerms.push(term);
            } else {
              results.set(entryId, {
                entry,
                relevance: 0.2,
                matchedTerms: [term],
              });
            }
          }
        }
      }
    }

    // Recherche par nom exact (boost)
    for (const entry of this.entries.values()) {
      if (entry.name.toLowerCase().includes(query.toLowerCase())) {
        const existing = results.get(entry.id);
        if (existing) {
          existing.relevance += 0.5;
        } else {
          results.set(entry.id, {
            entry,
            relevance: 0.5,
            matchedTerms: [query],
          });
        }
      }
    }

    // Trier par pertinence et limiter
    return Array.from(results.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Récupère le contexte complet formaté pour l'IA
   */
  getFormattedContext(maxTokens?: number): string {
    const entries = Array.from(this.entries.values())
      .sort((a, b) => {
        // Trier par usage récent et fréquent
        const aScore = (a.metadata.usageCount || 0) * (a.metadata.lastUsed ? Date.now() - a.metadata.lastUsed.getTime() : 0);
        const bScore = (b.metadata.usageCount || 0) * (b.metadata.lastUsed ? Date.now() - b.metadata.lastUsed.getTime() : 0);
        return bScore - aScore;
      });

    const targetTokens = maxTokens || this.maxTokens;
    let tokens = 0;
    const formatted: string[] = [];

    for (const entry of entries) {
      if (tokens + entry.tokens <= targetTokens) {
        formatted.push(this.formatEntry(entry));
        tokens += entry.tokens;
      } else {
        break;
      }
    }

    return formatted.join('\n\n');
  }

  /**
   * Gère la mémoire de session
   */
  setSessionMemory(key: string, value: any): void {
    this.sessionMemory.set(key, value);
  }

  getSessionMemory<T = any>(key: string): T | undefined {
    return this.sessionMemory.get(key) as T | undefined;
  }

  /**
   * Récupère les dépendances d'une entrée
   */
  getDependencies(entryId: string): ContextEntry[] {
    const entry = this.entries.get(entryId);
    if (!entry || !entry.metadata.dependencies) {
      return [];
    }

    return entry.metadata.dependencies
      .map(depId => this.entries.get(depId))
      .filter((dep): dep is ContextEntry => dep !== undefined);
  }

  /**
   * Nettoie le contexte (utilisé lors des changements majeurs)
   */
  clear(): void {
    this.entries.clear();
    this.semanticIndex.clear();
    this.currentTokens = 0;
    this.sessionMemory.clear();
  }

  /**
   * Statistiques du contexte
   */
  getStats() {
    return {
      totalEntries: this.entries.size,
      currentTokens: this.currentTokens,
      maxTokens: this.maxTokens,
      utilization: (this.currentTokens / this.maxTokens) * 100,
    };
  }

  /**
   * Extrait les termes d'une requête pour l'indexation
   */
  private extractTerms(text: string): string[] {
    // Tokenisation simple - peut être améliorée
    return text
      .toLowerCase()
      .split(/[\s,.;:!?()[\]{}'"`-]+/)
      .filter(term => term.length > 2); // Ignorer les mots trop courts
  }

  /**
   * Indexe sémantiquement une entrée
   */
  private indexSemantically(entry: ContextEntry): void {
    const terms = [
      ...this.extractTerms(entry.name),
      ...this.extractTerms(entry.content),
    ];

    for (const term of terms) {
      if (!this.semanticIndex.has(term)) {
        this.semanticIndex.set(term, new Set());
      }
      this.semanticIndex.get(term)!.add(entry.id);
    }
  }

  /**
   * Génère un ID unique pour une entrée
   */
  private generateId(entry: Omit<ContextEntry, 'id' | 'tokens'>): string {
    const hash = `${entry.type}-${entry.name}-${entry.metadata.file || 'global'}`;
    // Utiliser btoa pour le navigateur au lieu de Buffer
    if (typeof window !== 'undefined') {
      return btoa(hash).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }
    // Fallback pour Node.js si nécessaire
    return hash.split('').reduce((acc, char) => acc + char.charCodeAt(0).toString(36), '').substring(0, 16);
  }

  /**
   * Estime le nombre de tokens (approximation)
   */
  private estimateTokens(content: string): number {
    // Approximation: ~4 caractères = 1 token pour l'anglais
    // On utilise une estimation plus conservatrice
    return Math.ceil(content.length / 3);
  }

  /**
   * Supprime les entrées les moins utilisées pour faire de la place
   */
  private evictOldEntries(requiredTokens: number): void {
    const entries = Array.from(this.entries.values())
      .sort((a, b) => {
        // Trier par usage (moins utilisé en premier)
        const aScore = (a.metadata.usageCount || 0) + (a.metadata.lastUsed ? 0 : 1000);
        const bScore = (b.metadata.usageCount || 0) + (b.metadata.lastUsed ? 0 : 1000);
        return aScore - bScore;
      });

    let freedTokens = 0;
    for (const entry of entries) {
      if (freedTokens >= requiredTokens) break;

      this.entries.delete(entry.id);
      this.currentTokens -= entry.tokens;
      freedTokens += entry.tokens;

      // Retirer de l'index sémantique
      const terms = this.extractTerms(entry.content);
      for (const term of terms) {
        const entrySet = this.semanticIndex.get(term);
        if (entrySet) {
          entrySet.delete(entry.id);
          if (entrySet.size === 0) {
            this.semanticIndex.delete(term);
          }
        }
      }
    }
  }

  /**
   * Formate une entrée pour l'affichage
   */
  private formatEntry(entry: ContextEntry): string {
    let formatted = `// ${entry.type.toUpperCase()}: ${entry.name}\n`;
    if (entry.metadata.file) {
      formatted += `// File: ${entry.metadata.file}\n`;
    }
    if (entry.metadata.line) {
      formatted += `// Line: ${entry.metadata.line}\n`;
    }
    formatted += entry.content;
    return formatted;
  }
}

// Instance singleton
export const contextManager = new ContextManager();

