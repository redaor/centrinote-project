/**
 * Ghost-Text Auto-completion System
 *
 * Système d'autocomplétion inline ultra-performant (< 30ms)
 * Compatible avec textarea et input
 *
 * @example
 * ```tsx
 * import { GhostTextArea, GhostInput } from '@/features/ghost-text';
 *
 * // Pour les zones multi-lignes
 * <GhostTextArea
 *   value={content}
 *   onChange={setContent}
 *   context="notes"
 *   userId={userId}
 * />
 *
 * // Pour les champs courts
 * <GhostInput
 *   value={title}
 *   onChange={setTitle}
 *   context="meeting"
 *   userId={userId}
 * />
 * ```
 */

// Composants UI
export { GhostTextArea } from './ui/GhostTextArea';
export type { GhostTextAreaProps } from './ui/GhostTextArea';

export { GhostInput } from './ui/GhostInput';
export type { GhostInputProps } from './ui/GhostInput';

// Hooks
export { useGhostAutocomplete } from './hooks/useGhostAutocomplete';
export type {
  UseGhostAutocompleteOptions,
  UseGhostAutocompleteReturn,
} from './hooks/useGhostAutocomplete';

// Services (exports avancés si nécessaire)
export { generateCompletions } from './services/suggestionEngine';
export type { GhostSuggestion } from './services/suggestionEngine';

export { ghostCache } from './services/cache';

