import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  darkMode?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  darkMode = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}: SwitchProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex-1">
        {label && (
          <label className={`font-medium cursor-pointer ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {label}
          </label>
        )}
        {description && (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
        )}
      </div>
      
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedby}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${checked 
            ? 'bg-blue-600' 
            : darkMode ? 'bg-gray-700' : 'bg-gray-200'
          }
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
