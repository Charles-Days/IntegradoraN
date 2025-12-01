'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const roomId = params.id as string;

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms`);
      if (!res.ok) throw new Error('Failed to fetch room');
      const rooms = await res.json();
      return rooms.find((r: any) => r.id === roomId);
    },
  });

  const { data: incidents } = useQuery({
    queryKey: ['incidents', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/incidents?roomId=${roomId}`);
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return res.json();
    },
  });

  const { data: cleanings } = useQuery({
    queryKey: ['cleanings', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/cleanings?roomId=${roomId}`);
      if (!res.ok) throw new Error('Failed to fetch cleanings');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Habitación no encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-primary-600 hover:text-primary-700"
            >
              ← Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Habitación {room.number}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Información</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Número</p>
              <p className="font-medium">{room.number}</p>
            </div>
            {room.floor && (
              <div>
                <p className="text-sm text-gray-600">Piso</p>
                <p className="font-medium">{room.floor}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Estado</p>
              <p className="font-medium">{room.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ocupada</p>
              <p className="font-medium">{room.isOccupied ? 'Sí' : 'No'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Historial de Incidencias</h2>
          {incidents && incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map((incident: any) => (
                <div key={incident.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{incident.description}</p>
                      <p className="text-sm text-gray-600">
                        Por: {incident.user.name} - {new Date(incident.createdAt).toLocaleString()}
                      </p>
                      <p className="text-sm">
                        Estado:{' '}
                        <span
                          className={
                            incident.status === 'OPEN'
                              ? 'text-orange-600 font-medium'
                              : 'text-green-600 font-medium'
                          }
                        >
                          {incident.status === 'OPEN' ? 'Abierta' : 'Resuelta'}
                        </span>
                      </p>
                    </div>
                  </div>
                  {incident.photos && incident.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {incident.photos.map((photo: any) => (
                        <img
                          key={photo.id}
                          src={photo.url}
                          alt="Incidencia"
                          className="w-full h-24 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No hay incidencias registradas</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Historial de Limpieza</h2>
          {cleanings && cleanings.length > 0 ? (
            <div className="space-y-2">
              {cleanings.map((cleaning: any) => (
                <div key={cleaning.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">
                      Limpiada por: {cleaning.user.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(cleaning.cleanedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No hay registros de limpieza</p>
          )}
        </div>
      </main>
    </div>
  );
}

