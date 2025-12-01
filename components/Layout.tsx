'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@/lib/enums';
import { ReactNode } from 'react';
import { SettingsIcon, HotelIcon, CleaningIcon } from '@/components/icons';

interface LayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
}

export default function Layout({ children, title, showBack = false }: LayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

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

  const navigation = [
    ...(session?.user.role === UserRole.ADMIN
      ? [{ label: 'Administración', path: '/admin', icon: SettingsIcon }]
      : []),
    ...(session?.user.role === UserRole.RECEPTION || session?.user.role === UserRole.ADMIN
      ? [{ label: 'Recepción', path: '/reception', icon: HotelIcon }]
      : []),
    ...(session?.user.role === UserRole.HOUSEKEEPER || session?.user.role === UserRole.ADMIN
      ? [{ label: 'Camarera', path: '/housekeeper', icon: CleaningIcon }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {showBack && (
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-2">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => router.push(item.path)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        pathname === item.path
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{session?.user.name}</p>
                  <p className="text-xs text-gray-500">{getRoleLabel(session?.user.role || '')}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

