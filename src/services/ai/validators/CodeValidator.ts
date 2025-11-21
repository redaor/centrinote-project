/**
 * Validateur de code - Syntaxe et sémantique
 * Validation syntaxique, des imports, et de la logique métier
 */

export interface CodeValidationResult {
  isValid: boolean;
  syntaxValid: boolean;
  importsValid: boolean;
  semanticValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'syntax' | 'import' | 'semantic' | 'type';
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  type: 'performance' | 'best_practice' | 'maintainability';
  message: string;
  line?: number;
  suggestion?: string;
}

export class CodeValidator {
  /**
   * Valide le code généré (syntaxe, imports, sémantique)
   */
  async validate(code: string, language: 'typescript' | 'javascript' = 'typescript'): Promise<CodeValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Validation syntaxique basique
    const syntaxResult = this.validateSyntax(code, language);
    if (!syntaxResult.isValid) {
      errors.push(...syntaxResult.errors);
    }

    // 2. Validation des imports
    const importsResult = this.validateImports(code);
    if (!importsResult.isValid) {
      errors.push(...importsResult.errors);
    }

    // 3. Validation sémantique (logique métier)
    const semanticResult = this.validateSemantics(code);
    if (!semanticResult.isValid) {
      errors.push(...semanticResult.errors);
    }
    warnings.push(...semanticResult.warnings);

    return {
      isValid: errors.length === 0,
      syntaxValid: syntaxResult.isValid,
      importsValid: importsResult.isValid,
      semanticValid: semanticResult.isValid,
      errors,
      warnings,
    };
  }

  /**
   * Validation syntaxique basique
   */
  private validateSyntax(code: string, language: 'typescript' | 'javascript'): {
    isValid: boolean;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];

    // Vérifier les parenthèses, accolades, crochets équilibrés
    const brackets = { '(': 0, ')': 0, '{': 0, '}': 0, '[': 0, ']': 0 };
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char in brackets) {
          brackets[char as keyof typeof brackets]++;
        }
      }

      // Vérifier les erreurs de syntaxe courantes
      if (line.includes('=>') && !line.includes('(') && !line.includes(')')) {
        errors.push({
          type: 'syntax',
          message: 'Arrow function sans paramètres doit avoir des parenthèses vides',
          line: i + 1,
        });
      }
    }

    // Vérifier l'équilibre
    if (brackets['('] !== brackets[')']) {
      errors.push({
        type: 'syntax',
        message: `Parenthèses non équilibrées: ${brackets['(']} ouvrante(s), ${brackets[')']} fermante(s)`,
      });
    }

    if (brackets['{'] !== brackets['}']) {
      errors.push({
        type: 'syntax',
        message: `Accolades non équilibrées: ${brackets['{']} ouvrante(s), ${brackets['}']} fermante(s)`,
      });
    }

    if (brackets['['] !== brackets[']']) {
      errors.push({
        type: 'syntax',
        message: `Crochets non équilibrés: ${brackets['[']} ouvrant(s), ${brackets[']']} fermant(s)`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validation des imports
   */
  private validateImports(code: string): {
    isValid: boolean;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const importPattern = /^import\s+(?:(?:\*\s+as\s+\w+)|(?:\{[^}]*\})|(?:\w+))(?:\s+from\s+['"]([^'"]+)['"])?/gm;

    const lines = code.split('\n');
    const imports: Array<{ line: number; module: string }> = [];

    lines.forEach((line, index) => {
      const match = line.match(importPattern);
      if (match) {
        const module = match[1];
        if (module && !module.startsWith('.') && !module.startsWith('/')) {
          // Import externe - vérifier qu'il n'y a pas de chemins relatifs étranges
          imports.push({ line: index + 1, module });
        }
      }
    });

    // Vérifier les imports circulaires potentiels (basique)
    // Ici on pourrait ajouter plus de logique

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validation sémantique (logique métier)
   */
  private validateSemantics(code: string): {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const lines = code.split('\n');

    // Détecter les patterns de performance problématiques
    lines.forEach((line, index) => {
      // Boucles for imbriquées (complexité O(n²))
      if (line.includes('for') && index > 0) {
        const prevLine = lines[index - 1];
        if (prevLine.includes('for')) {
          warnings.push({
            type: 'performance',
            message: 'Boucles imbriquées détectées - Complexité potentiellement élevée',
            line: index + 1,
            suggestion: 'Envisager d\'utiliser des méthodes array (map, filter, reduce)',
          });
        }
      }

      // Async/await sans try-catch
      if (line.includes('await') && !code.substring(0, code.indexOf(line)).includes('try')) {
        const nextLines = lines.slice(index, index + 5);
        if (!nextLines.some(l => l.includes('catch'))) {
          warnings.push({
            type: 'best_practice',
            message: 'await sans gestion d\'erreur',
            line: index + 1,
            suggestion: 'Envisager d\'ajouter un try-catch',
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Instance singleton
export const codeValidator = new CodeValidator();

