'use client';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelLeft?: string;
  labelRight?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function Switch({
  checked,
  onChange,
  label,
  labelLeft,
  labelRight,
  disabled = false,
  size = 'md',
}: SwitchProps) {
  const sizeClasses = {
    sm: {
      track: 'w-9 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      {labelLeft && (
        <span className={`text-sm font-medium ${!checked ? 'text-primary-900' : 'text-primary-400'}`}>
          {labelLeft}
        </span>
      )}
      {label && !labelLeft && !labelRight && (
        <span className="text-sm font-medium text-primary-700">{label}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex flex-shrink-0 ${sizes.track}
          border-2 border-transparent rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:ring-offset-2
          ${checked ? 'bg-danger-500' : 'bg-success-500'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block ${sizes.thumb}
            rounded-full bg-white shadow-lg
            transform transition-transform duration-200 ease-in-out
            ${checked ? sizes.translate : 'translate-x-0'}
          `}
        />
      </button>
      {labelRight && (
        <span className={`text-sm font-medium ${checked ? 'text-primary-900' : 'text-primary-400'}`}>
          {labelRight}
        </span>
      )}
    </label>
  );
}
