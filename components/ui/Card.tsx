import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string | ReactNode;
  actions?: ReactNode;
}

export default function Card({ children, className = '', title, actions }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          {title && (
            typeof title === 'string' ? (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            ) : (
              <div className="text-lg font-semibold text-gray-900">{title}</div>
            )
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

