'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RoomCard from '@/components/RoomCard';
import Layout from '@/components/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { UserRole, RoomStatus } from '@/lib/enums';
import { db } from '@/lib/db';
import { SignalIcon, CameraIcon } from '@/components/icons';

export default function HousekeeperPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOnline, setIsOnline] = useState(true);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', 'housekeeper', selectedDate, session?.user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/rooms?userId=${session?.user?.id}&date=${selectedDate}`);
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
    enabled: !!session?.user?.id && isOnline,
  });

  const markCleanMutation = useMutation({
    mutationFn: async (roomId: string) => {
      if (!isOnline) {
        await db.pendingCleanings.add({
          roomId,
          userId: session?.user?.id || '',
          cleanedAt: new Date().toISOString(),
          date: selectedDate,
          synced: false,
        });
        return { offline: true };
      }

      const res = await fetch('/api/cleanings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, date: selectedDate }),
      });
      if (!res.ok) throw new Error('Failed to mark room as clean');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const syncPendingData = async () => {
    if (!isOnline) return;

    try {
      const pendingCleanings = await db.pendingCleanings.filter((c) => !c.synced).toArray();
      const pendingIncidents = await db.pendingIncidents.filter((i) => !i.synced).toArray();

      if (pendingCleanings.length === 0 && pendingIncidents.length === 0) return;

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanings: pendingCleanings,
          incidents: pendingIncidents,
        }),
      });

      if (res.ok) {
        for (const cleaning of pendingCleanings) {
          if (cleaning.id) {
            await db.pendingCleanings.delete(cleaning.id);
          }
        }
        for (const incident of pendingIncidents) {
          if (incident.id) {
            await db.pendingIncidents.delete(incident.id);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  useEffect(() => {
    if (isOnline) {
      syncPendingData();
    }
  }, [isOnline]);

  if (!session || (session.user.role !== UserRole.HOUSEKEEPER && session.user.role !== UserRole.ADMIN)) {
    return null;
  }

  const handleMarkClean = (roomId: string) => {
    markCleanMutation.mutate(roomId);
  };

  const handleCreateIncident = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowIncidentModal(true);
  };

  const pendingRooms = rooms?.filter((r: any) => r.status === RoomStatus.CLEANING_PENDING || !r.cleanings?.length) || [];
  const cleanRooms = rooms?.filter((r: any) => r.cleanings && r.cleanings.length > 0) || [];

  return (
    <Layout title="Mis Habitaciones">
      <div className="space-y-6">
        {!isOnline && (
          <Card className="border-orange-200 bg-orange-50">
            <div className="flex items-center gap-3">
              <SignalIcon className="w-6 h-6 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">Modo Offline</p>
                <p className="text-sm text-orange-700">Los datos se sincronizarán cuando vuelva la conexión</p>
              </div>
            </div>
          </Card>
        )}

        <Card title="Filtros">
          <Input
            label="Fecha"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </Card>

        <Card title={`Pendientes de Limpiar (${pendingRooms.length})`}>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRooms.map((room: any) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  showActions
                  onMarkClean={handleMarkClean}
                  onCreateIncident={handleCreateIncident}
                />
              ))}
            </div>
          )}
        </Card>

        {cleanRooms.length > 0 && (
          <Card title={`Habitaciones Limpias (${cleanRooms.length})`} className="border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cleanRooms.map((room: any) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  showActions
                  onCreateIncident={handleCreateIncident}
                />
              ))}
            </div>
          </Card>
        )}

        {showIncidentModal && selectedRoomId && (
          <IncidentModal
            roomId={selectedRoomId}
            onClose={() => {
              setShowIncidentModal(false);
              setSelectedRoomId(null);
            }}
            isOnline={isOnline}
          />
        )}
      </div>
    </Layout>
  );
}

function IncidentModal({
  roomId,
  onClose,
  isOnline,
}: {
  roomId: string;
  onClose: () => void;
  isOnline: boolean;
}) {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const handlePhotoCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (photos.length + files.length > 3) {
        alert('Máximo 3 fotos permitidas');
        return;
      }
      setPhotos([...photos, ...files]);
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Por favor, describe la incidencia');
      return;
    }

    setLoading(true);

    try {
      if (!isOnline) {
        const photoUrls: string[] = [];
        for (const photo of photos) {
          const reader = new FileReader();
          const url = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(photo);
          });
          photoUrls.push(url);
        }

        const { db } = await import('@/lib/db');
        await db.pendingIncidents.add({
          roomId,
          userId: session?.user?.id || '',
          description,
          photos: photoUrls,
          createdAt: new Date().toISOString(),
          synced: false,
        });

        alert('Incidencia guardada localmente. Se sincronizará cuando haya conexión.');
        onClose();
        return;
      }

      const formData = new FormData();
      formData.append('roomId', roomId);
      formData.append('description', description);
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      const res = await fetch('/api/incidents', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to create incident');

      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      onClose();
    } catch (error) {
      console.error('Error creating incident:', error);
      alert('Error al crear la incidencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">Reportar Incidencia</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos ({photos.length}/3)
            </label>
            <Button
              type="button"
              onClick={handlePhotoCapture}
              disabled={photos.length >= 3}
              variant="outline"
            >
              <CameraIcon className="w-4 h-4 mr-1" />
              Tomar Foto
            </Button>
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={loading}
              variant="danger"
              isLoading={loading}
              className="flex-1"
            >
              Enviar Incidencia
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
