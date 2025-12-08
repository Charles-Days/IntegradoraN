'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@/lib/enums';
import { ReactNode, useState } from 'react';
import { SettingsIcon, HotelIcon, CleaningIcon, HistoryIcon } from '@/components/icons';

interface LayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
}

export default function Layout({ children, title, showBack = false }: LayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrador';
      case UserRole.RECEPTION:
        return 'Recepción';
      case UserRole.HOUSEKEEPER:
        return 'Camarera';
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-accent-100 text-accent-700';
      case UserRole.RECEPTION:
        return 'bg-primary-100 text-primary-700';
      case UserRole.HOUSEKEEPER:
        return 'bg-success-100 text-success-700';
      default:
        return 'bg-primary-100 text-primary-600';
    }
  };

  const navigation = [
    ...(session?.user.role === UserRole.ADMIN
      ? [{ label: 'Administración', path: '/admin', icon: SettingsIcon }]
      : []),
    ...(session?.user.role === UserRole.RECEPTION || session?.user.role === UserRole.ADMIN
      ? [{ label: 'Recepción', path: '/reception', icon: HotelIcon }]
      : []),
    ...(session?.user.role === UserRole.HOUSEKEEPER || session?.user.role === UserRole.ADMIN
      ? [
          { label: 'Camarera', path: '/housekeeper', icon: CleaningIcon },
          { label: 'Historial', path: '/housekeeper/history', icon: HistoryIcon },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-primary-100 sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Back button & Title */}
            <div className="flex items-center gap-3">
              {showBack && (
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-primary-100 rounded-xl transition-colors text-primary-500 hover:text-primary-900"
                  aria-label="Volver"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-bold text-primary-900">
                {title}
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                      transition-all duration-200
                      ${isActive
                        ? 'bg-primary-900 text-white'
                        : 'text-primary-500 hover:text-primary-900 hover:bg-primary-100'
                      }
                    `}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right side - User info & Actions */}
            <div className="flex items-center gap-3">
              {/* User Info - Desktop */}
              <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-primary-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-primary-900">{session?.user.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyle(session?.user.role || '')}`}>
                    {getRoleLabel(session?.user.role || '')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-600">
                    {session?.user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="p-2.5 text-primary-500 hover:text-primary-900 hover:bg-primary-100 rounded-xl transition-colors"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 text-primary-500 hover:text-primary-900 hover:bg-primary-100 rounded-xl transition-colors"
                aria-label="Menú"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-primary-100 bg-white animate-slide-up">
            <div className="px-4 py-3 space-y-1">
              {/* User Info Mobile */}
              <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-primary-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-primary-200 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-700">
                    {session?.user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-900">{session?.user.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyle(session?.user.role || '')}`}>
                    {getRoleLabel(session?.user.role || '')}
                  </span>
                </div>
              </div>

              {/* Navigation Items */}
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                      transition-all duration-200
                      ${isActive
                        ? 'bg-primary-900 text-white'
                        : 'text-primary-600 hover:bg-primary-100'
                      }
                    `}
                  >
                    <IconComponent className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 safe-bottom">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
