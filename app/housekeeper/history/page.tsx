'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Layout from '@/components/Layout';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { UserRole } from '@/lib/enums';
import { CheckIcon, CleaningIcon, HotelIcon, UserIcon } from '@/components/icons';

interface Cleaning {
  id: string;
  cleanedAt: string;
  date: string;
  room: {
    id: string;
    number: string;
    floor?: number | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function CleaningHistoryPage() {
  const { data: session } = useSession();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const isAdmin = session?.user?.role === UserRole.ADMIN;

  const { data: users } = useQuery({
    queryKey: ['users', 'housekeepers'],
    queryFn: async () => {
      const res = await fetch('/api/users?role=HOUSEKEEPER');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: cleanings, isLoading } = useQuery({
    queryKey: ['cleanings', 'history', startDate, endDate, selectedUserId],
    queryFn: async () => {
      let url = `/api/cleanings/history?startDate=${startDate}&endDate=${endDate}`;
      if (selectedUserId) {
        url += `&userId=${selectedUserId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch cleaning history');
      return res.json();
    },
    enabled: !!session?.user,
  });

  if (!session || (session.user.role !== UserRole.HOUSEKEEPER && session.user.role !== UserRole.ADMIN)) {
    return null;
  }

  const groupedByDate = cleanings?.reduce((groups: Record<string, Cleaning[]>, cleaning: Cleaning) => {
    const date = new Date(cleaning.date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(cleaning);
    return groups;
  }, {}) || {};

  const totalCleanings = cleanings?.length || 0;

  return (
    <Layout title="Historial de Limpiezas" showBack>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                <CheckIcon className="w-6 h-6 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-primary-500">Total de Limpiezas</p>
                <p className="text-2xl font-bold text-primary-900">{totalCleanings}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
                <HotelIcon className="w-6 h-6 text-accent-600" />
              </div>
              <div>
                <p className="text-sm text-primary-500">Habitaciones Distintas</p>
                <p className="text-2xl font-bold text-primary-900">
                  {new Set(cleanings?.map((c: Cleaning) => c.room.id) || []).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card title="Filtros">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Fecha Inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Fecha Fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {isAdmin && users && (
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  Camarera
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-primary-200 rounded-xl
                           text-primary-900 transition-all duration-200 ease-out
                           hover:border-primary-300
                           focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                >
                  <option value="">Todas las camareras</option>
                  {users.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>

        {/* History List */}
        <Card
          title="Historial"
          subtitle={`${totalCleanings} limpieza(s) en el periodo seleccionado`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <div className="w-10 h-10 border-4 border-primary-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-10 h-10 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
            </div>
          ) : Object.keys(groupedByDate).length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CleaningIcon className="w-8 h-8 text-primary-400" />
              </div>
              <p className="text-primary-900 font-medium">Sin registros</p>
              <p className="text-sm text-primary-500 mt-1">No hay limpiezas en el periodo seleccionado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([date, dateCleanings]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-primary-500 mb-3 capitalize">{date}</h3>
                  <div className="space-y-3">
                    {(dateCleanings as Cleaning[]).map((cleaning) => (
                      <div
                        key={cleaning.id}
                        className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100 hover:bg-primary-100 transition-colors"
                      >
                        <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <CheckIcon className="w-6 h-6 text-success-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary-900">
                              Habitacion {cleaning.room.number}
                            </span>
                            {cleaning.room.floor && (
                              <span className="text-xs text-primary-500 bg-primary-200 px-2 py-0.5 rounded-lg">
                                Piso {cleaning.room.floor}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-primary-500 mt-0.5">
                            {new Date(cleaning.cleanedAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-2 text-sm text-primary-600">
                            <UserIcon className="w-4 h-4" />
                            <span>{cleaning.user.name || cleaning.user.email}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
