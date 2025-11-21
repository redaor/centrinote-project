// 📧 Composant champ email stable et contrôlé
import React, { useEffect, useId } from 'react';

interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
}

export function EmailField({ 
  value, 
  onChange, 
  onBlur, 
  name = 'email', 
  required = false,
  disabled = false,
  readOnly = false,
  placeholder = 'email@exemple.com',
  className = '',
  'data-testid': testId
}: EmailFieldProps) {
  const id = useId();

  // 🔧 Instrumentation pour debugging (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[EmailField] mounted');
      return () => console.log('[EmailField] unmounted');
    }
  }, []);

  return (
    <div className="space-y-1">
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 sr-only"
      >
        Adresse email
      </label>
      <input
        id={id}
        name={name}
        type="email"
        inputMode="email"
        
        // 🛡️ Protection contre les password managers
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-lpignore="true"        // LastPass
        data-1p-ignore="true"       // 1Password
        data-form-type="other"      // Generic PM hint
        data-testid={testId}
        
        // 🎯 Props contrôlées
        value={value}
        onChange={(e) => onChange(e.target.value)}  // Aucun format/mask pendant la saisie
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        
        className={`w-full px-3 py-2 rounded border transition-colors ${className}`}
        aria-label="Adresse email"
      />
    </div>
  );
}