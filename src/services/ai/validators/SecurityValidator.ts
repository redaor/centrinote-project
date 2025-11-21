/**
 * Validateur de sécurité multi-couches
 * Protection contre XSS, Log Injection, SQL Injection, Code Injection
 */

export interface ValidationResult {
  isValid: boolean;
  securityScore: number; // 0-1, où 1 = parfaitement sécurisé
  vulnerabilities: Vulnerability[];
  sanitizedOutput?: string;
}

export interface Vulnerability {
  type: 'xss' | 'log_injection' | 'sql_injection' | 'code_injection' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location?: string;
}

export class SecurityValidator {
  private readonly XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gis,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /<style[^>]*>.*?<\/style>/gis,
    /data:text\/html/gi,
  ];

  private readonly SQL_INJECTION_PATTERNS = [
    /('|(\\')|(;)|(\-\-)|(\/\*)|(\*\/)|(%27)|(%00)|(xp_)|(sp_)|(exec\s*\(|execute\s*\()|(select|union|insert|update|delete|drop|create|alter|grant|revoke))/gi,
  ];

  private readonly CODE_INJECTION_PATTERNS = [
    /\beval\s*\(/gi,
    /\bexec\s*\(/gi,
    /\bFunction\s*\(/gi,
    /`[^`]*\$\{[^}]+\}[^`]*`/g, // Template literals with expressions
    /new\s+Function\s*\(/gi,
    /setTimeout\s*\(\s*['"`]/gi,
    /setInterval\s*\(\s*['"`]/gi,
  ];

  /**
   * Valide le code généré contre toutes les vulnérabilités
   */
  validate(code: string, context?: { userId?: string; requestId?: string; isConversational?: boolean }): ValidationResult {
    const vulnerabilities: Vulnerability[] = [];
    let securityScore = 1.0;
    const isConversational = context?.isConversational || false;

    // 1. Validation XSS (toujours importante)
    const xssVulns = this.detectXSS(code);
    vulnerabilities.push(...xssVulns);
    securityScore -= xssVulns.length * 0.25;

    // 2. Validation SQL Injection (moins strict pour conversations)
    const sqlVulns = this.detectSQLInjection(code);
    // Pour les conversations, ignorer les faux positifs (mots communs dans les notes)
    const realSqlVulns = isConversational 
      ? sqlVulns.filter(v => {
          // Ignorer si c'est juste un mot isolé qui pourrait être dans une note
          const hasSqlStructure = /\b(select|insert|update|delete|drop|create|alter)\s+\w+/i.test(code);
          return hasSqlStructure; // Seulement si ça ressemble vraiment à du SQL
        })
      : sqlVulns;
    vulnerabilities.push(...realSqlVulns);
    securityScore -= realSqlVulns.length * (isConversational ? 0.1 : 0.3);

    // 3. Validation Code Injection (moins strict pour conversations)
    const codeInjVulns = this.detectCodeInjection(code);
    // Pour les conversations, ignorer les patterns qui pourraient être du texte normal
    const realCodeInjVulns = isConversational
      ? codeInjVulns.filter(v => {
          // Ignorer si c'est juste une mention de "function" ou "eval" dans du texte
          const hasRealCodeStructure = /\b(eval|exec|Function|setTimeout|setInterval)\s*\([^)]+\w+[^)]*\)/i.test(code);
          return hasRealCodeStructure;
        })
      : codeInjVulns;
    vulnerabilities.push(...realCodeInjVulns);
    securityScore -= realCodeInjVulns.length * (isConversational ? 0.2 : 0.4);

    // 4. Validation Log Injection (moins critique pour conversations)
    const logVulns = this.detectLogInjection(code, context);
    vulnerabilities.push(...logVulns);
    securityScore -= logVulns.length * (isConversational ? 0.05 : 0.15);

    // Normaliser le score entre 0 et 1
    securityScore = Math.max(0, Math.min(1, securityScore));

    // Pour les conversations, le score minimum est 0.3 (pour éviter 0.00 sur faux positifs)
    if (isConversational && securityScore < 0.3 && vulnerabilities.filter(v => v.severity === 'critical').length === 0) {
      securityScore = 0.3; // Score minimum pour conversations sans vulnérabilités critiques
    }

    // Sanitisation si nécessaire (mais moins agressive pour conversations)
    let sanitizedOutput: string | undefined;
    if (vulnerabilities.length > 0 && !isConversational) {
      sanitizedOutput = this.sanitize(code);
    }

    return {
      isValid: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      securityScore,
      vulnerabilities,
      sanitizedOutput,
    };
  }

  /**
   * Détecte les vulnérabilités XSS
   */
  private detectXSS(code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    for (const pattern of this.XSS_PATTERNS) {
      const matches = code.match(pattern);
      if (matches) {
        matches.forEach(match => {
          vulnerabilities.push({
            type: 'xss',
            severity: 'critical',
            message: `XSS détecté: ${match.substring(0, 50)}...`,
            location: this.findLocation(code, match),
          });
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Détecte les vulnérabilités SQL Injection
   */
  private detectSQLInjection(code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Chercher les patterns SQL dangereux
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      const matches = code.match(pattern);
      if (matches) {
        // Vérifier si c'est dans un contexte de chaîne concaténée
        const lines = code.split('\n');
        matches.forEach(match => {
          const lineIndex = lines.findIndex(line => line.includes(match));
          if (lineIndex >= 0) {
            const line = lines[lineIndex];
            // Vérifier si c'est une concaténation de chaînes (dangerous)
            if (/['"`]\s*\+\s*|['"`]\s*\.\s*/.test(line)) {
              vulnerabilities.push({
                type: 'sql_injection',
                severity: 'critical',
                message: `SQL Injection potentiel: ${match.substring(0, 50)}...`,
                location: `Line ${lineIndex + 1}: ${line.trim()}`,
              });
            }
          }
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Détecte les vulnérabilités Code Injection
   */
  private detectCodeInjection(code: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    for (const pattern of this.CODE_INJECTION_PATTERNS) {
      const matches = code.match(pattern);
      if (matches) {
        matches.forEach(match => {
          vulnerabilities.push({
            type: 'code_injection',
            severity: 'critical',
            message: `Code Injection détecté: ${match.substring(0, 50)}...`,
            location: this.findLocation(code, match),
          });
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Détecte les vulnérabilités Log Injection
   */
  private detectLogInjection(code: string, context?: { userId?: string; requestId?: string }): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Chercher les appels console.log, log.error, etc. avec des variables non sanitizées
    const logPatterns = [
      /console\.(log|error|warn|info|debug)\s*\([^)]*\+/g,
      /log\.(debug|error|warn|info)\s*\([^)]*\+/g,
    ];

    for (const pattern of logPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Vérifier si c'est une concaténation avec des données utilisateur
          if (!match.includes('.sanitize') && !match.includes('JSON.stringify')) {
            vulnerabilities.push({
              type: 'log_injection',
              severity: 'medium',
              message: `Log Injection potentiel: Utilisez JSON.stringify() ou sanitize() pour les logs`,
              location: this.findLocation(code, match),
            });
          }
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Sanitise le code en échappant les caractères dangereux
   */
  private sanitize(code: string): string {
    let sanitized = code;

    // Échapper les caractères HTML
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Trouve la ligne et la colonne d'une chaîne dans le code
   */
  private findLocation(code: string, match: string): string {
    const lines = code.split('\n');
    const index = code.indexOf(match);

    if (index < 0) return 'Unknown';

    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 pour le \n
      if (charCount + lineLength > index) {
        const column = index - charCount;
        return `Line ${i + 1}, Column ${column + 1}`;
      }
      charCount += lineLength;
    }

    return 'Unknown';
  }

  /**
   * Valide spécifiquement pour XSS (cible: >95% réussite)
   */
  validateXSS(input: string): { isValid: boolean; sanitized: string } {
    const result = this.validate(input);
    return {
      isValid: !result.vulnerabilities.some(v => v.type === 'xss'),
      sanitized: result.sanitizedOutput || input,
    };
  }

  /**
   * Valide spécifiquement pour Log Injection (cible: >95% réussite)
   */
  validateLogInjection(input: string): { isValid: boolean; sanitized: string } {
    const result = this.validate(input);
    const logVulns = result.vulnerabilities.filter(v => v.type === 'log_injection');
    
    // Sanitisation spécifique pour les logs
    let sanitized = input;
    if (logVulns.length > 0) {
      sanitized = JSON.stringify(input);
    }

    return {
      isValid: logVulns.length === 0,
      sanitized,
    };
  }
}

// Instance singleton
export const securityValidator = new SecurityValidator();

