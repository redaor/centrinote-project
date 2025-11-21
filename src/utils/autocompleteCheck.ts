/**
 * 🔍 DIAGNOSTIC AUTOCOMPLETE - Détecteur automatique d'inputs sans autocomplete
 *
 * ✅ S'exécute UNE SEULE FOIS au chargement de la page (dev only)
 * ✅ Liste tous les inputs/select/textarea sans autocomplete approprié
 * ✅ Désactivé en production pour éviter overhead
 *
 * USAGE: Importé automatiquement dans main.tsx en mode dev
 */

const DEBUG = import.meta.env.DEV;

interface AutocompleteViolation {
  element: string;
  type: string;
  id?: string;
  name?: string;
  className?: string;
  suggestion: string;
}

/**
 * Map des types d'inputs vers suggestions autocomplete appropriées
 */
const AUTOCOMPLETE_SUGGESTIONS: Record<string, string> = {
  email: 'email',
  password: 'current-password or new-password',
  tel: 'tel',
  search: 'off (ou spécifique selon contexte)',
  text: 'name, given-name, family-name, organization, address-line1, etc.',
  number: 'off (sauf cas spécifique comme cc-number, postal-code)',
  url: 'url',
  date: 'bday',
};

/**
 * Détecte si un input devrait avoir autocomplete
 */
function shouldHaveAutocomplete(el: Element): boolean {
  const type = el.getAttribute('type') || 'text';
  const name = el.getAttribute('name')?.toLowerCase() || '';
  const id = el.getAttribute('id')?.toLowerCase() || '';

  // Cas où autocomplete n'est PAS nécessaire
  const skipTypes = ['hidden', 'submit', 'button', 'reset', 'file', 'image', 'checkbox', 'radio'];
  if (skipTypes.includes(type)) {
    return false;
  }

  // Inputs OTP/2FA ne nécessitent pas autocomplete
  if (name.includes('otp') || name.includes('2fa') || name.includes('code')) {
    return false;
  }

  return true;
}

/**
 * Suggère la valeur autocomplete appropriée
 */
function suggestAutocomplete(el: Element): string {
  const type = el.getAttribute('type') || 'text';
  const name = el.getAttribute('name')?.toLowerCase() || '';
  const id = el.getAttribute('id')?.toLowerCase() || '';

  // Détection par type
  if (AUTOCOMPLETE_SUGGESTIONS[type]) {
    return AUTOCOMPLETE_SUGGESTIONS[type];
  }

  // Détection par name/id
  if (name.includes('email') || id.includes('email')) return 'email';
  if (name.includes('password') || id.includes('password')) return 'current-password or new-password';
  if (name.includes('phone') || name.includes('tel')) return 'tel';
  if (name.includes('firstname') || name.includes('prenom')) return 'given-name';
  if (name.includes('lastname') || name.includes('nom')) return 'family-name';
  if (name.includes('address') || name.includes('adresse')) return 'address-line1';
  if (name.includes('city') || name.includes('ville')) return 'address-level2';
  if (name.includes('postal') || name.includes('zip')) return 'postal-code';
  if (name.includes('country') || name.includes('pays')) return 'country';
  if (name.includes('organization') || name.includes('company')) return 'organization';
  if (name.includes('search') || name.includes('query')) return 'off';

  return 'off (ou valeur appropriée selon le contexte)';
}

/**
 * Lance le diagnostic autocomplete
 */
export function runAutocompleteCheck(): void {
  // 🛡️ PRODUCTION CHECK: Désactiver en production
  if (import.meta.env.PROD) return;

  // 🛡️ GLOBAL FLAG: Empêcher toute réexécution
  if (typeof window !== 'undefined') {
    if ((window as any).__AUTOCOMPLETE_CHECK_DONE__) return;
    (window as any).__AUTOCOMPLETE_CHECK_DONE__ = true;
  }

  const violations: AutocompleteViolation[] = [];

  // Scanner tous les inputs, selects, textareas
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    // Ignorer les éléments qui ne nécessitent pas autocomplete
    if (!shouldHaveAutocomplete(el)) {
      return;
    }

    const autocomplete = el.getAttribute('autocomplete');

    // Cas 1: Aucun attribut autocomplete
    if (!autocomplete) {
      violations.push({
        element: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || 'text',
        id: el.getAttribute('id') || undefined,
        name: el.getAttribute('name') || undefined,
        className: (el as HTMLElement).className || undefined,
        suggestion: suggestAutocomplete(el)
      });
    }

    // Cas 2: autocomplete vide ou invalide
    if (autocomplete === '' || autocomplete === 'on') {
      violations.push({
        element: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || 'text',
        id: el.getAttribute('id') || undefined,
        name: el.getAttribute('name') || undefined,
        className: (el as HTMLElement).className || undefined,
        suggestion: `Current: "${autocomplete}" → Replace with: ${suggestAutocomplete(el)}`
      });
    }
  });

  // Afficher les résultats
  if (violations.length === 0) {
    DEBUG && console.log('%c✅ [AUTOCOMPLETE CHECK] Tous les champs ont autocomplete approprié', 'color: #10b981; font-weight: bold');
  } else {
    console.groupCollapsed(
      `%c⚠️ [AUTOCOMPLETE CHECK] ${violations.length} champs sans autocomplete détectés (DEV ONLY)`,
      'color: #f59e0b; font-weight: bold; font-size: 12px'
    );

    violations.forEach((v, index) => {
      const identifier = v.id ? `#${v.id}` : v.name ? `[name="${v.name}"]` : `[${index}]`;
      console.log(
        `%c${v.element}%c ${identifier}`,
        'color: #3b82f6; font-weight: bold',
        'color: #6b7280',
        `\n  Type: ${v.type}`,
        `\n  Classe: ${v.className || 'none'}`,
        `\n  📝 Suggestion: autocomplete="${v.suggestion}"`
      );
    });

    console.log(
      '\n%c💡 Pour fixer: Ajouter autocomplete="..." sur chaque champ selon sa fonction',
      'color: #8b5cf6; font-style: italic'
    );
    console.log(
      '%cRéférence: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete',
      'color: #6b7280; font-size: 10px'
    );

    console.groupEnd();
  }
}

/**
 * Hook pour lancer le diagnostic au mount de l'app
 * Usage: Ajouter dans main.tsx
 */
export function setupAutocompleteCheck(): void {
  if (import.meta.env.PROD) return;

  // Attendre que le DOM soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Utiliser requestIdleCallback pour ne pas bloquer le rendu
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runAutocompleteCheck, { timeout: 3000 });
      } else {
        setTimeout(runAutocompleteCheck, 2000);
      }
    });
  } else {
    // DOM déjà chargé, lancer après un court délai
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runAutocompleteCheck, { timeout: 3000 });
    } else {
      setTimeout(runAutocompleteCheck, 2000);
    }
  }
}
