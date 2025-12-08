import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string | ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  actions,
  padding = 'md',
  hover = false,
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        bg-white rounded-2xl border border-primary-100
        shadow-soft overflow-hidden
        ${hover ? 'hover:shadow-soft-lg hover:border-primary-200 transition-all duration-300' : ''}
        ${className}
      `}
    >
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-primary-100 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {title && (
              typeof title === 'string' ? (
                <h3 className="text-lg font-semibold text-primary-900 truncate">{title}</h3>
              ) : (
                <div className="text-lg font-semibold text-primary-900">{title}</div>
              )
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-primary-500 truncate">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
          )}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
    </div>
  );
}
