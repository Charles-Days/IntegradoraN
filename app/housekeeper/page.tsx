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
import { SignalIcon, CameraIcon, CleaningIcon, CheckIcon, HotelIcon, HistoryIcon } from '@/components/icons';
import { useToast } from '@/components/ui/Toast';

export default function HousekeeperPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOnline, setIsOnline] = useState(true);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [offlineCleanedRooms, setOfflineCleanedRooms] = useState<string[]>([]);
  const [viewAll, setViewAll] = useState(false);

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

  // Count pending sync items
  useEffect(() => {
    const countPending = async () => {
      try {
        const pendingCleanings = await db.pendingCleanings.filter((c) => !c.synced).count();
        const pendingIncidents = await db.pendingIncidents.filter((i) => !i.synced).count();
        setPendingSyncCount(pendingCleanings + pendingIncidents);
      } catch (error) {
        console.error('Error counting pending items:', error);
      }
    };
    countPending();
  }, [offlineCleanedRooms]);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', 'housekeeper', selectedDate, session?.user?.id, viewAll],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(viewAll ? { viewAll: 'true' } : { userId: session?.user?.id || '' }),
      });
      const res = await fetch(`/api/rooms?${params}`);
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
    enabled: !!session?.user?.id && isOnline,
  });

  const markCleanMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const res = await fetch('/api/cleanings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, date: selectedDate }),
      });
      if (!res.ok) throw new Error('Failed to mark room as clean');
      return res.json();
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
        // Clear offline state and show success message
        setOfflineCleanedRooms([]);
        setPendingSyncCount(0);
        showToast(`Datos sincronizados correctamente (${pendingCleanings.length + pendingIncidents.length} elementos)`, 'success');
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    } catch (error) {
      console.error('Sync error:', error);
      showToast('Error al sincronizar los datos', 'error');
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

  const handleMarkClean = async (roomId: string) => {
    if (!isOnline) {
      // Handle offline case directly
      try {
        await db.pendingCleanings.add({
          roomId,
          userId: session?.user?.id || '',
          cleanedAt: new Date().toISOString(),
          date: selectedDate,
          synced: false,
        });
        setOfflineCleanedRooms((prev) => [...prev, roomId]);
        showToast('Limpieza guardada. Se sincronizará cuando vuelva la conexión.', 'info');
      } catch (error) {
        console.error('Error saving offline cleaning:', error);
        showToast('Error al guardar la limpieza', 'error');
      }
    } else {
      // Online case - use mutation
      markCleanMutation.mutate(roomId, {
        onSuccess: () => {
          showToast('Habitación marcada como limpia', 'success');
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
        },
        onError: () => {
          showToast('Error al marcar la habitación como limpia', 'error');
        },
      });
    }
  };

  const handleCreateIncident = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowIncidentModal(true);
  };

  // Filter rooms based on view mode
  const pendingRooms = rooms?.filter((r: any) => {
    // If marked as cleaned offline, don't show as pending
    if (offlineCleanedRooms.includes(r.id)) return false;

    if (viewAll) {
      // For "all rooms" view, show rooms that need cleaning
      return (
        r.status === RoomStatus.CLEANING_PENDING ||
        r.status === RoomStatus.CHECKOUT_PENDING ||
        (r.status !== RoomStatus.CLEAN && r.status !== RoomStatus.OCCUPIED && !r.cleanings?.length)
      );
    }

    // For assigned rooms view
    if (!r.cleanings?.length) return true;
    if (r.assignedAt) {
      const assignedAt = new Date(r.assignedAt);
      const cleanedAt = new Date(r.cleanings[0].cleanedAt);
      return assignedAt > cleanedAt;
    }
    return false;
  }) || [];

  // Clean rooms for today
  const cleanRooms = rooms?.filter((r: any) => {
    // If marked as cleaned offline, show as clean
    if (offlineCleanedRooms.includes(r.id)) return true;

    if (viewAll) {
      // For "all rooms" view, show rooms that are clean today
      return r.status === RoomStatus.CLEAN || (r.cleanings?.length > 0);
    }

    // For assigned rooms view
    if (!r.cleanings?.length) return false;
    if (r.assignedAt) {
      const assignedAt = new Date(r.assignedAt);
      const cleanedAt = new Date(r.cleanings[0].cleanedAt);
      return cleanedAt >= assignedAt;
    }
    return true;
  }) || [];

  // Other rooms (occupied, etc.) - only shown in "all rooms" view
  const otherRooms = viewAll
    ? rooms?.filter((r: any) => {
        if (offlineCleanedRooms.includes(r.id)) return false;
        return r.status === RoomStatus.OCCUPIED || r.status === RoomStatus.VACANT;
      }) || []
    : [];

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="relative">
        <div className="w-10 h-10 border-4 border-primary-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-10 h-10 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );

  return (
    <Layout title="Mis Habitaciones">
      <div className="space-y-6">
        {/* Connection Status */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
          isOnline
            ? 'bg-success-50 border-success-200'
            : 'bg-warning-50 border-warning-200'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative ${
            isOnline ? 'bg-success-100' : 'bg-warning-100'
          }`}>
            <SignalIcon className={`w-5 h-5 ${isOnline ? 'text-success-600' : 'text-warning-600'}`} />
            {!isOnline && pendingSyncCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-warning-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingSyncCount}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${isOnline ? 'text-success-900' : 'text-warning-900'}`}>
              {isOnline ? 'Conectado' : 'Modo Offline'}
            </p>
            <p className={`text-xs ${isOnline ? 'text-success-600' : 'text-warning-600'}`}>
              {isOnline
                ? 'Todos los cambios se guardan automáticamente'
                : pendingSyncCount > 0
                  ? `${pendingSyncCount} cambio(s) pendiente(s) de sincronizar`
                  : 'Los datos se sincronizarán cuando vuelva la conexión'}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                <CleaningIcon className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-xs text-primary-500">Pendientes</p>
                <p className="text-xl font-bold text-primary-900">{pendingRooms.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
                <CheckIcon className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-xs text-primary-500">Completadas</p>
                <p className="text-xl font-bold text-primary-900">{cleanRooms.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access to History */}
        <button
          onClick={() => router.push('/housekeeper/history')}
          className="w-full bg-white rounded-2xl border border-primary-100 shadow-soft p-4 flex items-center justify-between hover:bg-primary-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center">
              <HistoryIcon className="w-5 h-5 text-accent-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-primary-900">Ver Historial</p>
              <p className="text-xs text-primary-500">Consulta tus limpiezas anteriores</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 max-w-xs">
              <Input
                label="Fecha"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            {/* View Toggle */}
            <div className="flex items-end">
              <div className="flex bg-primary-100 rounded-xl p-1">
                <button
                  onClick={() => setViewAll(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !viewAll
                      ? 'bg-white text-primary-900 shadow-sm'
                      : 'text-primary-500 hover:text-primary-700'
                  }`}
                >
                  Mis asignadas
                </button>
                <button
                  onClick={() => setViewAll(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewAll
                      ? 'bg-white text-primary-900 shadow-sm'
                      : 'text-primary-500 hover:text-primary-700'
                  }`}
                >
                  Todas
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Pending Rooms */}
        <Card
          title="Pendientes de Limpiar"
          subtitle={viewAll ? `${pendingRooms.length} habitación(es)` : `${pendingRooms.length} habitación(es) asignadas`}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : pendingRooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-success-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-8 h-8 text-success-500" />
              </div>
              <p className="text-primary-900 font-medium">Todo limpio</p>
              <p className="text-sm text-primary-500 mt-1">No tienes habitaciones pendientes</p>
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

        {/* Cleaned Rooms */}
        {cleanRooms.length > 0 && (
          <Card
            title="Habitaciones Limpias"
            subtitle={`${cleanRooms.length} habitación(es) completadas hoy`}
            className="border-success-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cleanRooms.map((room: any) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  showActions
                  onCreateIncident={handleCreateIncident}
                  isPendingSync={offlineCleanedRooms.includes(room.id)}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Other Rooms (only in viewAll mode) */}
        {viewAll && otherRooms.length > 0 && (
          <Card
            title="Otras Habitaciones"
            subtitle={`${otherRooms.length} habitación(es) ocupadas o vacantes`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherRooms.map((room: any) => (
                <RoomCard
                  key={room.id}
                  room={room}
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
  const { showToast } = useToast();

  const handlePhotoCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (photos.length + files.length > 3) {
        showToast('Máximo 3 fotos permitidas', 'warning');
        return;
      }
      setPhotos([...photos, ...files]);
    };
    input.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Por favor, describe la incidencia', 'warning');
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

        showToast('Incidencia guardada localmente. Se sincronizará cuando haya conexión.', 'info');
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
      showToast('Incidencia reportada correctamente', 'success');
      onClose();
    } catch (error) {
      console.error('Error creating incident:', error);
      showToast('Error al crear la incidencia', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-xl font-semibold text-primary-900 mb-6">Reportar Incidencia</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Descripción <span className="text-danger-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-primary-200 rounded-xl
                         text-primary-900 placeholder:text-primary-400
                         transition-all duration-200 ease-out
                         hover:border-primary-300
                         focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500
                         resize-none"
                rows={4}
                placeholder="Describe el problema encontrado..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Fotos
                <span className="text-primary-400 font-normal ml-1">({photos.length}/3)</span>
              </label>
              <Button
                type="button"
                onClick={handlePhotoCapture}
                disabled={photos.length >= 3}
                variant="outline"
                leftIcon={<CameraIcon className="w-4 h-4" />}
              >
                {photos.length >= 3 ? 'Máximo alcanzado' : 'Agregar Foto'}
              </Button>

              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl border border-primary-200"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-danger-500 text-white rounded-full
                                 flex items-center justify-center text-sm font-medium
                                 opacity-0 group-hover:opacity-100 transition-opacity
                                 hover:bg-danger-600 shadow-lg"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
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
                variant="ghost"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
