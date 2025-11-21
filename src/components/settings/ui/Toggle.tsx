/**
 * Composant Toggle/Switch
 * Conformément au cahier des charges - Section 5.2
 */

import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  isDark?: boolean;
  id?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  isDark = false,
  id
}: ToggleProps) {
  const toggleId = id || `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label
          htmlFor={toggleId}
          className={`
            block font-medium mb-1 cursor-pointer
            ${isDark ? 'text-white' : 'text-gray-900'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {label}
        </label>
        {description && (
          <p
            className={`
              text-sm
              ${isDark ? 'text-gray-400' : 'text-gray-600'}
              ${disabled ? 'opacity-50' : ''}
            `}
          >
            {description}
          </p>
        )}
      </div>

      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-4 focus:ring-blue-500/20
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${checked
            ? 'bg-blue-500'
            : isDark
              ? 'bg-gray-700'
              : 'bg-gray-200'
          }
        `}
        style={{ minWidth: '44px', minHeight: '24px' }}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white
            transition-transform duration-200 ease-out
            shadow-sm
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
