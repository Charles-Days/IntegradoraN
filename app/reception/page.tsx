'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import RoomCard from '@/components/RoomCard';
import Layout from '@/components/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import { RoomStatus, UserRole } from '@/lib/enums';
import { ClipboardIcon, WarningIcon, CheckIcon, UserIcon, HotelIcon, SearchIcon } from '@/components/icons';
import { useToast } from '@/components/ui/Toast';

export default function ReceptionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/rooms?date=${selectedDate}`);
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users', UserRole.HOUSEKEEPER],
    queryFn: async () => {
      const res = await fetch(`/api/users?role=${UserRole.HOUSEKEEPER}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const { data: incidents } = useQuery({
    queryKey: ['incidents', 'OPEN'],
    queryFn: async () => {
      const res = await fetch('/api/incidents?status=OPEN');
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return res.json();
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, status, isOccupied, roomNumber }: { id: string; status?: string; isOccupied?: boolean; roomNumber?: string }) => {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, isOccupied }),
      });
      if (!res.ok) throw new Error('Failed to update room');
      return { ...(await res.json()), roomNumber, isOccupied };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      if (data.isOccupied !== undefined) {
        showToast(
          data.isOccupied
            ? `Habitación ${data.roomNumber} ocupada`
            : `Habitación ${data.roomNumber} desocupada`,
          data.isOccupied ? 'info' : 'success'
        );
      }
    },
    onError: () => {
      showToast('Error al actualizar la habitación', 'error');
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ roomIds, userId }: { roomIds: string[]; userId: string }) => {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomIds, userId, date: selectedDate }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign rooms');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setShowAssignModal(false);
      setSelectedRooms([]);
      showToast('Habitaciones asignadas correctamente', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Error al asignar habitaciones', 'error');
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
      const res = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'RESOLVED', roomId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to resolve incident');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      showToast('Incidencia resuelta correctamente', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Error al resolver la incidencia', 'error');
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments?id=${assignmentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove assignment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      showToast('Asignación eliminada correctamente', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Error al eliminar la asignación', 'error');
    },
  });

  // Computed values - must be before conditional returns to maintain hooks order
  const allOpenRooms = rooms?.filter((r: any) => r.status !== RoomStatus.DISABLED) || [];
  const disabledRooms = rooms?.filter((r: any) => r.status === RoomStatus.DISABLED) || [];

  // Filter rooms by search query
  const openRooms = useMemo(() => {
    if (!searchQuery.trim()) return allOpenRooms;
    const query = searchQuery.toLowerCase().trim();
    return allOpenRooms.filter((r: any) =>
      r.number.toLowerCase().includes(query) ||
      r.floor?.toString().includes(query) ||
      r.assignments?.some((a: any) =>
        a.user?.name?.toLowerCase().includes(query) ||
        a.user?.email?.toLowerCase().includes(query)
      )
    );
  }, [allOpenRooms, searchQuery]);

  const occupiedCount = allOpenRooms.filter((r: any) => r.isOccupied).length;
  const pendingCleanCount = allOpenRooms.filter((r: any) =>
    r.status === RoomStatus.CLEANING_PENDING || r.status === RoomStatus.CHECKOUT_PENDING
  ).length;
  const checkoutCount = allOpenRooms.filter((r: any) => r.status === RoomStatus.CHECKOUT_PENDING).length;

  // Authorization check - after all hooks
  if (!session || (session.user.role !== UserRole.RECEPTION && session.user.role !== UserRole.ADMIN)) {
    return null;
  }

  const handleToggleOccupied = (roomId: string, currentStatus: boolean, roomNumber: string) => {
    updateRoomMutation.mutate({
      id: roomId,
      isOccupied: !currentStatus,
      roomNumber,
    });
  };

  const handleAssignRooms = (userId: string) => {
    if (selectedRooms.length === 0) return;
    assignMutation.mutate({ roomIds: selectedRooms, userId });
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    removeAssignmentMutation.mutate(assignmentId);
  };

  const handleReassignLastCleaner = (roomId: string, userId: string) => {
    assignMutation.mutate({ roomIds: [roomId], userId });
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="relative">
        <div className="w-10 h-10 border-4 border-primary-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-10 h-10 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );

  return (
    <Layout title="Recepción">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <HotelIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-primary-500">Total</p>
                <p className="text-xl font-bold text-primary-900">{openRooms.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center">
                <span className="w-3 h-3 bg-danger-500 rounded-full" />
              </div>
              <div>
                <p className="text-xs text-primary-500">Ocupadas</p>
                <p className="text-xl font-bold text-primary-900">{occupiedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                <span className="w-3 h-3 bg-warning-500 rounded-full" />
              </div>
              <div>
                <p className="text-xs text-primary-500">Pendientes</p>
                <p className="text-xl font-bold text-primary-900">{pendingCleanCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center">
                <span className="w-3 h-3 bg-accent-500 rounded-full" />
              </div>
              <div>
                <p className="text-xs text-primary-500">Checkout</p>
                <p className="text-xl font-bold text-primary-900">{checkoutCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-primary-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar habitación, piso o camarera..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-primary-200 rounded-xl
                             text-primary-900 placeholder:text-primary-400
                             transition-all duration-200 ease-out
                             hover:border-primary-300
                             focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-400 hover:text-primary-600"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {/* Date Input */}
              <div className="w-full sm:w-auto">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            {/* Selection and Assign Button */}
            <div className="flex items-center justify-between gap-4">
              {searchQuery && (
                <p className="text-sm text-primary-500">
                  {openRooms.length} resultado{openRooms.length !== 1 ? 's' : ''}
                </p>
              )}
              <div className="flex gap-2 ml-auto">
                {selectedRooms.length > 0 && (
                  <span className="inline-flex items-center px-3 py-2 bg-accent-100 text-accent-700 rounded-xl text-sm font-medium">
                    {selectedRooms.length} seleccionadas
                  </span>
                )}
                <Button
                  onClick={() => setShowAssignModal(true)}
                  variant="primary"
                  disabled={selectedRooms.length === 0}
                  leftIcon={<ClipboardIcon className="w-4 h-4" />}
                >
                  Asignar
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Incidents Alert */}
        {incidents && incidents.length > 0 && (
          <Card className="border-warning-200 bg-warning-50/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                <WarningIcon className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary-900">Incidencias Abiertas</h3>
                <p className="text-sm text-primary-500">{incidents.length} incidencia(s) requieren atención</p>
              </div>
            </div>
            <div className="space-y-3">
              {incidents.map((incident: any) => (
                <div key={incident.id} className="bg-white rounded-xl p-4 border border-warning-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-900 rounded-lg text-white text-sm font-bold">
                          {incident.room.number}
                        </span>
                        <span className="text-sm font-medium text-primary-900">Habitación {incident.room.number}</span>
                      </div>
                      <p className="text-sm text-primary-600 mt-2">{incident.description}</p>
                      <p className="text-xs text-primary-400 mt-2">
                        Reportado por {incident.user.name} · {new Date(incident.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Button
                      onClick={() => resolveIncidentMutation.mutate({ id: incident.id, roomId: incident.roomId })}
                      variant="success"
                      size="sm"
                      leftIcon={<CheckIcon className="w-4 h-4" />}
                    >
                      Resolver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Available Rooms */}
        <Card
          title="Habitaciones"
          subtitle={searchQuery ? `${openRooms.length} de ${allOpenRooms.length} habitaciones` : `${allOpenRooms.length} habitaciones disponibles`}
        >
          {roomsLoading ? (
            <LoadingSpinner />
          ) : openRooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {searchQuery ? (
                  <SearchIcon className="w-8 h-8 text-primary-400" />
                ) : (
                  <HotelIcon className="w-8 h-8 text-primary-400" />
                )}
              </div>
              <p className="text-primary-500">
                {searchQuery ? `No se encontraron resultados para "${searchQuery}"` : 'No hay habitaciones disponibles'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-sm text-accent-600 hover:text-accent-700 font-medium"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openRooms.map((room: any) => (
                <div key={room.id} className="relative">
                  <RoomCard
                    room={room}
                    onViewDetails={(id) => router.push(`/reception/rooms/${id}`)}
                    onRemoveAssignment={handleRemoveAssignment}
                    onReassignLastCleaner={handleReassignLastCleaner}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    {/* Occupy Switch */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={room.isOccupied}
                        onChange={() => handleToggleOccupied(room.id, room.isOccupied, room.number)}
                        size="sm"
                      />
                      <span className={`text-sm font-medium ${room.isOccupied ? 'text-danger-600' : 'text-primary-500'}`}>
                        {room.isOccupied ? 'Ocupada' : 'Libre'}
                      </span>
                    </div>
                    {/* Selection Checkbox */}
                    <label className="relative flex items-center justify-center w-8 h-8 rounded-lg border-2 border-primary-200 bg-white cursor-pointer hover:border-accent-500 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRooms([...selectedRooms, room.id]);
                          } else {
                            setSelectedRooms(selectedRooms.filter((id) => id !== room.id));
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-4 h-4 rounded border-2 border-primary-300 peer-checked:bg-accent-500 peer-checked:border-accent-500 transition-colors flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Disabled Rooms */}
        {disabledRooms.length > 0 && (
          <Card
            title="Habitaciones Inhabilitadas"
            subtitle={`${disabledRooms.length} habitaciones fuera de servicio`}
            className="border-danger-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disabledRooms.map((room: any) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onViewDetails={(id) => router.push(`/reception/rooms/${id}`)}
                  onRemoveAssignment={handleRemoveAssignment}
                  onReassignLastCleaner={handleReassignLastCleaner}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="modal-backdrop" onClick={() => setShowAssignModal(false)}>
            <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-primary-900">Asignar Habitaciones</h3>
                <p className="text-sm text-primary-500 mt-1">
                  {selectedRooms.length} habitación(es) seleccionada(s)
                </p>
              </div>

              {users && users.length > 0 ? (
                <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium text-primary-700 mb-3">Selecciona una camarera:</p>
                  {users.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => handleAssignRooms(user.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary-200 hover:border-accent-500 hover:bg-accent-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-success-700">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary-900">{user.name || user.email}</p>
                        <p className="text-xs text-primary-500">Camarera</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 mb-6">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <UserIcon className="w-6 h-6 text-primary-400" />
                  </div>
                  <p className="text-sm text-primary-500">No hay camareras disponibles</p>
                </div>
              )}

              <Button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedRooms([]);
                }}
                variant="ghost"
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
