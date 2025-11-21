/**
 * Point d'entrée principal pour le SDK CentrinoteAI
 * Exporte toutes les interfaces publiques
 */

export { CentrinoteAI, type CentrinoteAIConfig, type GenerateFunctionResult, type AnalyzeCodeResult } from './CentrinoteAI';
export { AIEngine, type GenerationOptions, type GenerationResult, type CompletionOptions, type CompletionResult } from './core/AIEngine';
export { contextManager, ContextManager, type ContextEntry, type ContextSearchResult } from './context/ContextManager';
export { securityValidator, SecurityValidator, type ValidationResult, type Vulnerability } from './validators/SecurityValidator';
export { codeValidator, CodeValidator, type CodeValidationResult, type ValidationError, type ValidationWarning } from './validators/CodeValidator';

// Export par défaut
export { CentrinoteAI as default } from './CentrinoteAI';

