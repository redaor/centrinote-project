/**
 * 🔍 FORM AUDIT - Scanner d'inputs pour détecter problèmes accessibilité
 *
 * Scanne tous les inputs/select/textarea et détecte :
 * - Champs sans id/name
 * - Champs sans label associé
 * - Champs sans autocomplete approprié
 *
 * USAGE:
 * ```typescript
 * import { scanFormIssues, applyTempFix } from './formAudit';
 *
 * const issues = scanFormIssues();
 * console.table(issues);
 *
 * applyTempFix(issues); // Applique fix temporaire DOM
 * ```
 */

export interface FormIssue {
  element: HTMLElement;
  selector: string;
  tag: string;
  type: string;
  id?: string;
  name?: string;
  className: string;
  issues: string[];
  suggestions: string[];
}

/**
 * Map des suggestions autocomplete par type/name
 */
const AUTOCOMPLETE_MAP: Record<string, string> = {
  email: 'email',
  password: 'current-password or new-password',
  tel: 'tel',
  phone: 'tel',
  search: 'off',
  name: 'name',
  firstname: 'given-name',
  lastname: 'family-name',
  prenom: 'given-name',
  nom: 'family-name',
  address: 'address-line1',
  adresse: 'address-line1',
  city: 'address-level2',
  ville: 'address-level2',
  postal: 'postal-code',
  zip: 'postal-code',
  country: 'country',
  pays: 'country',
  organization: 'organization',
  company: 'organization',
  cc: 'cc-number',
  card: 'cc-number',
  cvv: 'cc-csc',
  exp: 'cc-exp'
};

/**
 * Génère un sélecteur CSS pour un élément
 */
function generateSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;

  const tag = el.tagName.toLowerCase();
  const classList = el.className ? `.${el.className.split(' ').join('.')}` : '';
  const parent = el.parentElement;

  if (parent) {
    const siblings = Array.from(parent.children).filter(child => child.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${tag}${classList}:nth-of-type(${index})`;
    }
  }

  return tag + classList;
}

/**
 * Vérifie si un élément a un label associé
 */
function hasAssociatedLabel(el: Element): boolean {
  const id = el.getAttribute('id');

  // Méthode 1: label[for="id"]
  if (id && document.querySelector(`label[for="${id}"]`)) {
    return true;
  }

  // Méthode 2: input imbriqué dans <label>
  if (el.closest('label')) {
    return true;
  }

  // Méthode 3: aria-label ou aria-labelledby
  if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) {
    return true;
  }

  return false;
}

/**
 * Suggère une valeur autocomplete appropriée
 */
function suggestAutocomplete(el: Element): string {
  const type = el.getAttribute('type')?.toLowerCase() || 'text';
  const name = el.getAttribute('name')?.toLowerCase() || '';
  const id = el.getAttribute('id')?.toLowerCase() || '';

  // Recherche par type exact
  if (AUTOCOMPLETE_MAP[type]) {
    return AUTOCOMPLETE_MAP[type];
  }

  // Recherche par name
  for (const [key, value] of Object.entries(AUTOCOMPLETE_MAP)) {
    if (name.includes(key) || id.includes(key)) {
      return value;
    }
  }

  // Par défaut
  return 'off (ou valeur spécifique selon usage)';
}

/**
 * Vérifie si un élément doit avoir autocomplete
 */
function shouldHaveAutocomplete(el: Element): boolean {
  const type = el.getAttribute('type')?.toLowerCase() || 'text';
  const name = el.getAttribute('name')?.toLowerCase() || '';

  // Types qui ne nécessitent pas autocomplete
  const skipTypes = ['hidden', 'submit', 'button', 'reset', 'file', 'image', 'checkbox', 'radio'];
  if (skipTypes.includes(type)) {
    return false;
  }

  // OTP/2FA ne nécessitent pas autocomplete
  if (name.includes('otp') || name.includes('2fa') || name.includes('code') || name.includes('verification')) {
    return false;
  }

  return true;
}

/**
 * Scanne tous les formulaires et retourne les problèmes
 */
export function scanFormIssues(rootElement: Document | Element = document): FormIssue[] {
  const issues: FormIssue[] = [];

  rootElement.querySelectorAll('input, select, textarea').forEach((el) => {
    const htmlEl = el as HTMLElement;
    const elementIssues: string[] = [];
    const suggestions: string[] = [];

    const id = el.getAttribute('id');
    const name = el.getAttribute('name');
    const type = el.getAttribute('type') || 'text';
    const autocomplete = el.getAttribute('autocomplete');

    // Issue 1: Pas d'id ni de name
    if (!id && !name) {
      elementIssues.push('❌ Missing id AND name');
      suggestions.push('Add: id="unique-field-name" name="fieldName"');
    }

    // Issue 2: Pas de label associé (sauf si type exempté)
    if (!['hidden', 'submit', 'button', 'reset'].includes(type)) {
      if (id && !hasAssociatedLabel(el)) {
        elementIssues.push('⚠️ No associated label');
        suggestions.push(`Add: <label htmlFor="${id}">Label text</label>`);
      }
    }

    // Issue 3: Pas d'autocomplete (si nécessaire)
    if (shouldHaveAutocomplete(el) && (!autocomplete || autocomplete === '' || autocomplete === 'on')) {
      elementIssues.push('⚠️ Missing/invalid autocomplete');
      const suggestion = suggestAutocomplete(el);
      suggestions.push(`Add: autocomplete="${suggestion}"`);
    }

    // Si des issues détectées, ajouter à la liste
    if (elementIssues.length > 0) {
      issues.push({
        element: htmlEl,
        selector: generateSelector(el),
        tag: el.tagName.toLowerCase(),
        type,
        id: id || undefined,
        name: name || undefined,
        className: htmlEl.className || '',
        issues: elementIssues,
        suggestions
      });
    }
  });

  return issues;
}

/**
 * Applique un fix temporaire DOM pour tous les problèmes détectés
 * ⚠️ Ce fix est TEMPORAIRE et ne persiste pas après rechargement
 */
export function applyTempFix(issues: FormIssue[]): {
  fixed: number;
  skipped: number;
  details: string[];
} {
  let fixed = 0;
  let skipped = 0;
  const details: string[] = [];

  issues.forEach((issue, index) => {
    const el = issue.element;

    try {
      // Fix 1: Ajouter id/name si manquants
      if (!el.getAttribute('id') && !el.getAttribute('name')) {
        const autoId = `debug-field-${index}`;
        el.setAttribute('id', autoId);
        el.setAttribute('name', autoId);
        el.setAttribute('data-debug-autofixed', 'true');
        details.push(`✅ Added id/name to ${issue.selector} → #${autoId}`);
        fixed++;
      }

      // Fix 2: Ajouter aria-label si pas de label
      const id = el.getAttribute('id');
      if (id && !hasAssociatedLabel(el)) {
        const ariaLabel = issue.name || issue.id || `Field ${index}`;
        el.setAttribute('aria-label', ariaLabel);
        el.setAttribute('data-debug-autofixed', 'true');
        details.push(`✅ Added aria-label to ${issue.selector} → "${ariaLabel}"`);
        fixed++;
      }

      // Fix 3: Ajouter autocomplete si manquant
      if (shouldHaveAutocomplete(el)) {
        const currentAutocomplete = el.getAttribute('autocomplete');
        if (!currentAutocomplete || currentAutocomplete === '' || currentAutocomplete === 'on') {
          const suggestedValue = suggestAutocomplete(el);
          // Utiliser la première suggestion (avant "or")
          const autoValue = suggestedValue.split(' or ')[0].replace(/\(.*?\)/g, '').trim();
          el.setAttribute('autocomplete', autoValue);
          el.setAttribute('data-debug-autofixed', 'true');
          details.push(`✅ Added autocomplete to ${issue.selector} → "${autoValue}"`);
          fixed++;
        }
      }
    } catch (error) {
      skipped++;
      details.push(`❌ Failed to fix ${issue.selector}: ${error}`);
    }
  });

  return { fixed, skipped, details };
}

/**
 * Retire tous les fix temporaires appliqués
 */
export function removeTempFixes(): number {
  let removed = 0;

  document.querySelectorAll('[data-debug-autofixed="true"]').forEach((el) => {
    // Supprimer les attributs ajoutés automatiquement
    if (el.getAttribute('id')?.startsWith('debug-field-')) {
      el.removeAttribute('id');
      el.removeAttribute('name');
    }

    // Garder aria-label mais retirer le flag
    el.removeAttribute('data-debug-autofixed');
    removed++;
  });

  return removed;
}

/**
 * Génère un rapport HTML des issues détectées
 */
export function generateHTMLReport(issues: FormIssue[]): string {
  if (issues.length === 0) {
    return '<div style="color: #10b981; font-weight: bold;">✅ No form issues detected!</div>';
  }

  let html = `
    <div style="font-family: monospace; font-size: 12px;">
      <h3 style="color: #f59e0b;">⚠️ ${issues.length} Form Issues Detected</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background: #f3f4f6; text-align: left;">
            <th style="padding: 8px; border: 1px solid #e5e7eb;">#</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb;">Selector</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb;">Type</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb;">Issues</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb;">Suggestions</th>
          </tr>
        </thead>
        <tbody>
  `;

  issues.forEach((issue, index) => {
    html += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px;">${index + 1}</td>
        <td style="padding: 8px; color: #3b82f6; font-weight: bold;">${issue.selector}</td>
        <td style="padding: 8px;">${issue.type}</td>
        <td style="padding: 8px;">
          ${issue.issues.map(i => `<div>${i}</div>`).join('')}
        </td>
        <td style="padding: 8px; color: #6b7280; font-size: 11px;">
          ${issue.suggestions.map(s => `<div>💡 ${s}</div>`).join('')}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}
