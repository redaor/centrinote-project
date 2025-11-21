/**
 * Moteur IA Hybride
 * Combine Claude Code API (générateur principal) avec validation et contexte
 */

import { contextManager, ContextManager } from '../context/ContextManager';
import { securityValidator, SecurityValidator } from '../validators/SecurityValidator';
import { codeValidator, CodeValidator } from '../validators/CodeValidator';

export interface GenerationOptions {
  description: string;
  parameters?: Array<{ name: string; type: string }>;
  returnType?: string;
  includeTests?: boolean;
  language?: 'typescript' | 'javascript';
  context?: string;
}

export interface GenerationResult {
  code: string;
  tests?: string;
  isValid: boolean;
  securityScore: number;
  validationErrors: Array<{ type: string; message: string }>;
  warnings: Array<{ type: string; message: string }>;
}

export interface CompletionOptions {
  prefix: string;
  suffix?: string;
  language?: 'typescript' | 'javascript';
  maxTokens?: number;
  userContext?: string; // Contexte personnalisé utilisateur (notes, vocabulaire)
}

export interface CompletionResult {
  suggestion: string;
  isValid: boolean;
  securityScore: number;
}

export class AIEngine {
  private contextManager: ContextManager;
  private securityValidator: SecurityValidator;
  private codeValidator: CodeValidator;
  private apiKey: string;
  private apiEndpoint: string;

  constructor(config: {
    apiKey: string;
    apiEndpoint?: string;
  }) {
    this.apiKey = config.apiKey;
    // Utiliser OpenAI GPT au lieu de Claude
    this.apiEndpoint = config.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    this.contextManager = contextManager;
    this.securityValidator = securityValidator;
    this.codeValidator = codeValidator;
  }

  /**
   * Génère une fonction complète avec validation
   */
  async generateFunction(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // 1. Construire le prompt avec contexte
      const context = this.contextManager.getFormattedContext(10000); // 10k tokens de contexte
      const prompt = this.buildFunctionPrompt(options, context);

      // 2. Appeler OpenAI GPT API
      const rawCode = await this.callClaudeAPI(prompt, {
        max_tokens: 4000,
        temperature: 0.2, // Bas pour la génération de code
      });

      // 3. Validation multi-couches
      const securityResult = this.securityValidator.validate(rawCode);
      const codeResult = await this.codeValidator.validate(
        rawCode,
        options.language || 'typescript'
      );

      // 4. Génération de tests si demandé
      let tests: string | undefined;
      if (options.includeTests) {
        const testPrompt = this.buildTestPrompt(rawCode, options);
        tests = await this.callClaudeAPI(testPrompt, {
          max_tokens: 2000,
          temperature: 0.3,
        });

        // Valider les tests aussi
        const testSecurityResult = this.securityValidator.validate(tests);
        if (testSecurityResult.securityScore < 0.95) {
          tests = testSecurityResult.sanitizedOutput || tests;
        }
      }

      // 5. Ajouter au contexte pour utilisation future
      if (securityResult.isValid && codeResult.isValid) {
        this.contextManager.addEntry({
          type: 'function',
          name: this.extractFunctionName(rawCode) || 'generated_function',
          content: rawCode,
          metadata: {
            dependencies: this.extractDependencies(rawCode),
          },
        });
      }

      // 6. Construire le résultat
      return {
        code: securityResult.sanitizedOutput || rawCode,
        tests,
        isValid: securityResult.isValid && codeResult.isValid,
        securityScore: securityResult.securityScore,
        validationErrors: [
          ...securityResult.vulnerabilities.map(v => ({
            type: v.type,
            message: v.message,
          })),
          ...codeResult.errors.map(e => ({
            type: e.type,
            message: e.message,
          })),
        ],
        warnings: codeResult.warnings.map(w => ({
          type: w.type,
          message: w.message,
        })),
      };
    } catch (error) {
      throw new Error(`Génération échouée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Complétion intelligente (1-3 secondes typiquement avec GPT-4o-mini)
   */
  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now();

    try {
      // Utiliser un modèle plus rapide ou un cache pour les complétions
      const prompt = this.buildCompletionPrompt(options);

      // Pour les complétions rapides, on peut utiliser un modèle plus léger
      const suggestion = await this.callClaudeAPI(prompt, {
        max_tokens: options.maxTokens || 100,
        temperature: 0.1, // Très bas pour la cohérence
        stop_sequences: ['\n\n', '//', 'function', 'class'], // Arrêter à des points logiques
      });

      // Validation de sécurité rapide
      // Marquer comme conversationnel si on a du contexte utilisateur (notes/vocabulaire)
      const isConversational = !!options.userContext || options.prefix.length < 200;
      const securityResult = this.securityValidator.validate(suggestion, {
        isConversational,
      });

      // Vérifier le temps de réponse (avertissement seulement si > 5 secondes)
      const responseTime = Date.now() - startTime;
      if (responseTime > 5000) {
        console.warn(`⚠️ Completion took ${responseTime}ms (slow response)`);
      } else {
        // Log info en mode dev uniquement
        if (import.meta.env.DEV) {
          console.debug(`✅ Completion: ${responseTime}ms`);
        }
      }

      return {
        suggestion: securityResult.sanitizedOutput || suggestion,
        isValid: securityResult.isValid,
        securityScore: securityResult.securityScore,
      };
    } catch (error) {
      throw new Error(`Complétion échouée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Analyse du code existant
   */
  async analyzeCode(code: string): Promise<{
    bugs: Array<{ type: string; message: string; line?: number }>;
    optimizations: Array<{ type: string; message: string; suggestion?: string }>;
    complexity: { score: number; factors: string[] };
  }> {
    // Combiner validation et analyse IA
    const securityResult = this.securityValidator.validate(code);
    const codeResult = await this.codeValidator.validate(code);

      // Analyser avec GPT pour des insights plus profonds
      const analysisPrompt = `Analyse ce code et identifie:
1. Bugs potentiels
2. Optimisations de performance
3. Complexité algorithmique

Code:
\`\`\`typescript
${code}
\`\`\`

Réponds en JSON avec la structure:
{
  "bugs": [{"type": "...", "message": "...", "line": 1}],
  "optimizations": [{"type": "...", "message": "...", "suggestion": "..."}],
  "complexity": {"score": 0-1, "factors": ["..."]}
}`;

    try {
      const analysis = await this.callClaudeAPI(analysisPrompt, {
        max_tokens: 2000,
        temperature: 0.3,
      });

      // Parser la réponse JSON
      const parsed = this.parseJSONResponse(analysis);

      return {
        bugs: [
          ...parsed.bugs || [],
          ...securityResult.vulnerabilities.map(v => ({
            type: v.type,
            message: v.message,
          })),
          ...codeResult.errors.map(e => ({
            type: e.type,
            message: e.message,
            line: e.line,
          })),
        ],
        optimizations: [
          ...parsed.optimizations || [],
          ...codeResult.warnings
            .filter(w => w.type === 'performance')
            .map(w => ({
              type: w.type,
              message: w.message,
              suggestion: w.suggestion,
            })),
        ],
        complexity: parsed.complexity || {
          score: 0.5,
          factors: ['Non analysé'],
        },
      };
    } catch (error) {
      // Fallback sur validation uniquement
      return {
        bugs: [
          ...securityResult.vulnerabilities.map(v => ({
            type: v.type,
            message: v.message,
          })),
          ...codeResult.errors.map(e => ({
            type: e.type,
            message: e.message,
            line: e.line,
          })),
        ],
        optimizations: codeResult.warnings
          .filter(w => w.type === 'performance')
          .map(w => ({
            type: w.type,
            message: w.message,
            suggestion: w.suggestion,
          })),
        complexity: {
          score: 0.5,
          factors: ['Analyse limitée'],
        },
      };
    }
  }

  /**
   * Appel à l'API OpenAI GPT
   */
  private async callClaudeAPI(
    prompt: string,
    options: {
      max_tokens?: number;
      temperature?: number;
      stop_sequences?: string[];
    } = {}
  ): Promise<string> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // GPT-4o-mini est moins cher et rapide (ou gpt-4o pour meilleure qualité)
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options.max_tokens || 4000,
        temperature: options.temperature || 0.2,
        ...(options.stop_sequences && options.stop_sequences.length > 0 
          ? { stop: options.stop_sequences } 
          : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // L'API OpenAI retourne le contenu dans choices[0].message.content
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      const message = data.choices[0].message;
      if (message && message.content) {
        return message.content;
      }
    }
    
    // Fallback
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Construit le prompt pour génération de fonction
   */
  private buildFunctionPrompt(options: GenerationOptions, context: string): string {
    return `Tu es un expert en développement TypeScript/JavaScript pour Centrinote.

CONTEXTE EXISTANT:
${context}

GÉNÈRE UNE FONCTION avec ces spécifications:
- Description: ${options.description}
${options.parameters ? `- Paramètres: ${options.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}` : ''}
${options.returnType ? `- Type de retour: ${options.returnType}` : ''}
${options.language ? `- Langage: ${options.language}` : ''}

REQUIS:
1. Code propre et lisible
2. Conformité aux bonnes pratiques TypeScript
3. Gestion d'erreurs appropriée
4. Documentation JSDoc
5. Types stricts

Génère UNIQUEMENT le code de la fonction, sans explications supplémentaires.
`;
  }

  /**
   * Construit le prompt pour génération de tests
   */
  private buildTestPrompt(code: string, options: GenerationOptions): string {
    return `Génère des tests unitaires complets pour cette fonction:

\`\`\`typescript
${code}
\`\`\`

REQUIS:
1. Tests couvrant les cas normaux et limites
2. Tests d'erreurs
3. Utiliser Jest/Vitest
4. Nommage descriptif

Génère UNIQUEMENT le code de test, sans explications.
`;
  }

  /**
   * Construit le prompt pour complétion
   */
  private buildCompletionPrompt(options: CompletionOptions): string {
    const prefix = options.prefix.trim();
    const now = new Date().toLocaleString('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Europe/Paris',
    });
    
    // Détecter si c'est une question/demande conversationnelle (plus large)
    const questionPattern = /^(je|tu|il|elle|nous|vous|ils|elles|comment|pourquoi|quand|où|qui|que|quoi|est-ce|aide|peux|peut|veux|voudrais|aimerais|corrige|explique|aide-moi|peux-tu|peut-on|comment faire|dis-moi|raconte|réponds|est-ce que|as-tu|a-t-il|regarde|montre|parle|donne|liste|cherche|trouve|information|note|vocabulaire|dernier|récent)/i.test(prefix);
    
    // Détecter si c'est une demande de correction/explication/conversation
    const conversationalPattern = /(corrige|explique|aide|aide-moi|question|réponds|dis|parle|comment|pourquoi|aide|peux|peut|veux|voudrais|information|donnée|note|vocabulaire|dernier|récent|ajouté|créé)/i.test(prefix);
    
    // Détecter si la question concerne les notes ou le vocabulaire
    const aboutUserData = /(note|vocabulaire|mot|définition|dernier|récent|ajouté|créé|information|donnée)/i.test(prefix);
    
    // Si c'est une question, conversation, ou demande sur les données utilisateur, répondre en texte naturel
    if (questionPattern || conversationalPattern || aboutUserData || prefix.length < 100) {
      // Inclure le contexte utilisateur si disponible
      let userContextSection = '';
      if (options.userContext) {
        userContextSection = `\n\n## 📚 CONTEXTE PERSONNEL DE L'UTILISATEUR\n\n${options.userContext}\n\n`;
      }

      let instructions = `Tu es un assistant IA conversationnel pour Centrinote. Tu connais l'heure exacte actuelle: ${now}. Tu réponds UNIQUEMENT en texte naturel français.

${userContextSection}INSTRUCTIONS IMPORTANTES :
- Réponds UNIQUEMENT en texte naturel français, JAMAIS de code
- JAMAIS de blocs de code (\`\`\`typescript\`\`\`, \`\`\`, etc.)
- JAMAIS de déclarations de fonctions (corrige(), function, const, let, var, await, etc.)
- JAMAIS de code TypeScript/JavaScript/Python ou autre langage
- UNIQUEMENT du texte conversationnel naturel, comme si tu parlais à un ami

Demande de l'utilisateur : "${prefix}"

${options.userContext ? `IMPORTANT : Tu as accès au contexte personnel de l'utilisateur ci-dessus (notes et vocabulaire).
- Si on te demande des informations sur les notes, utilise les notes du contexte
- Si on te demande des informations sur le vocabulaire, utilise le vocabulaire du contexte
- Fais référence spécifiquement aux notes/vocabulaire pertinents
- Si tu trouves des informations pertinentes dans le contexte, cite-les dans ta réponse
- Si la question concerne "la dernière note" ou "le dernier vocabulaire", cherche dans les notes/vocabulaire les plus récents du contexte

Si tu détectes une erreur dans une note ou un vocabulaire :
- ÉTAPE 1 (Détection) : Indique clairement qu'il y a une erreur, par exemple :
  * "Oui, il y a une erreur dans cette définition/note."
  * "Je remarque une faute dans le texte que tu as écrit."
  * "Il y a effectivement un problème dans cette définition."
- ÉTAPE 2 (Demande de confirmation) : Demande explicitement à l'utilisateur s'il souhaite que tu corriges :
  * "Souhaites-tu que je corrige cette définition/note ?"
  * "Veux-tu que je propose une version corrigée ?"
  * "Dois-je modifier ce texte pour corriger l'erreur ?"
- IMPORTANT : NE propose PAS directement la correction. Attends que l'utilisateur confirme qu'il veut une correction.
- Si l'utilisateur accepte (répond "oui", "d'accord", "vas-y", etc.), alors ÉTAPE 3 (Proposition) :
  * Mentionne clairement le mot ou la note à modifier entre guillemets (ex: "photosynthèse", "gravité")
  * Si c'est une correction de mot, dis "Le mot 'X' devrait être 'Y'" puis fournis la DÉFINITION COMPLÈTE CORRIGÉE
  * Fournis TOUJOURS la définition complète corrigée, pas juste l'explication
  * Structure ta réponse : "La définition correcte serait : [DÉFINITION COMPLÈTE ICI]"
  * N'utilise JAMAIS des fragments comme "à la définition de" comme définition
- Si l'utilisateur refuse ou ne confirme pas, ne propose pas de modification.` : ''}

Réponds maintenant en français, naturellement, uniquement en texte (PAS de code) :`;

      return instructions;
    }
    
    // Sinon, complétion de code (pour les développeurs qui complètent du code)
    return `Complete cette ligne de code intelligemment:

\`\`\`typescript
${prefix}${options.suffix ? `\n${options.suffix}` : ''}
\`\`\`

Fournis uniquement la complétion naturelle de la ligne, sans répéter le préfixe.
`;
  }

  /**
   * Extrait le nom de fonction du code
   */
  private extractFunctionName(code: string): string | null {
    const match = code.match(/(?:function|const|export\s+(?:function|const))\s+(\w+)/);
    return match ? match[1] : null;
  }

  /**
   * Extrait les dépendances du code
   */
  private extractDependencies(code: string): string[] {
    const imports = code.match(/import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/g) || [];
    return imports.map(imp => {
      const match = imp.match(/['"]([^'"]+)['"]/);
      return match ? match[1] : '';
    }).filter(Boolean);
  }

  /**
   * Parse une réponse JSON de l'IA
   */
  private parseJSONResponse(response: string): any {
    try {
      // Essayer d'extraire le JSON si l'IA a ajouté du texte autour
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch {
      return {};
    }
  }
}

