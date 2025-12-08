'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckIcon, WarningIcon } from '@/components/icons';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: {
      bg: 'bg-success-50',
      border: 'border-success-200',
      icon: <CheckIcon className="w-5 h-5 text-success-600" />,
      iconBg: 'bg-success-100',
      text: 'text-success-900',
      subtext: 'text-success-700',
    },
    error: {
      bg: 'bg-danger-50',
      border: 'border-danger-200',
      icon: (
        <svg className="w-5 h-5 text-danger-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      iconBg: 'bg-danger-100',
      text: 'text-danger-900',
      subtext: 'text-danger-700',
    },
    warning: {
      bg: 'bg-warning-50',
      border: 'border-warning-200',
      icon: <WarningIcon className="w-5 h-5 text-warning-600" />,
      iconBg: 'bg-warning-100',
      text: 'text-warning-900',
      subtext: 'text-warning-700',
    },
    info: {
      bg: 'bg-accent-50',
      border: 'border-accent-200',
      icon: (
        <svg className="w-5 h-5 text-accent-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      iconBg: 'bg-accent-100',
      text: 'text-accent-900',
      subtext: 'text-accent-700',
    },
  };

  const styles = config[toast.type];

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} border rounded-2xl p-4 shadow-soft-lg
        animate-slide-up flex items-start gap-3
      `}
    >
      <div className={`${styles.iconBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
        {styles.icon}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <p className={`text-sm font-medium ${styles.text}`}>{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className={`flex-shrink-0 p-1 rounded-lg ${styles.subtext} hover:bg-black/5 transition-colors`}
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
