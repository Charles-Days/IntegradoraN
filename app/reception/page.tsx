'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RoomCard from '@/components/RoomCard';
import Layout from '@/components/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { RoomStatus, UserRole } from '@/lib/enums';
import { ClipboardIcon, WarningIcon, CheckIcon, UserIcon } from '@/components/icons';

export default function ReceptionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

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
    mutationFn: async ({ id, status, isOccupied }: { id: string; status?: string; isOccupied?: boolean }) => {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, isOccupied }),
      });
      if (!res.ok) throw new Error('Failed to update room');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ roomIds, userId }: { roomIds: string[]; userId: string }) => {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomIds, userId, date: selectedDate }),
      });
      if (!res.ok) throw new Error('Failed to assign rooms');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setShowAssignModal(false);
      setSelectedRooms([]);
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
      const res = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'RESOLVED', roomId }),
      });
      if (!res.ok) throw new Error('Failed to resolve incident');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  if (!session || (session.user.role !== UserRole.RECEPTION && session.user.role !== UserRole.ADMIN)) {
    return null;
  }

  const handleToggleOccupied = (roomId: string, currentStatus: boolean) => {
    updateRoomMutation.mutate({
      id: roomId,
      isOccupied: !currentStatus,
      status: !currentStatus ? (RoomStatus.OCCUPIED as string) : (RoomStatus.VACANT as string),
    });
  };

  const handleAssignRooms = (userId: string) => {
    if (selectedRooms.length === 0) return;
    assignMutation.mutate({ roomIds: selectedRooms, userId });
  };

  const openRooms = rooms?.filter((r: any) => r.status !== RoomStatus.DISABLED) || [];
  const disabledRooms = rooms?.filter((r: any) => r.status === RoomStatus.DISABLED) || [];

  return (
    <Layout title="Recepción">
      <div className="space-y-6">
        <Card
          title="Filtros y Acciones"
          actions={
            <Button onClick={() => setShowAssignModal(true)} variant="primary" size="sm">
              <ClipboardIcon className="w-4 h-4 mr-1" />
              Asignar Habitaciones
            </Button>
          }
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                label="Fecha"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {incidents && incidents.length > 0 && (
          <Card
            title={
              <div className="flex items-center gap-2">
                <WarningIcon className="w-5 h-5 text-orange-600" />
                <span>Incidencias Abiertas ({incidents.length})</span>
              </div>
            }
            className="border-orange-200 bg-orange-50"
          >
            <div className="space-y-3">
              {incidents.map((incident: any) => (
                <div key={incident.id} className="bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Habitación {incident.room.number}</p>
                      <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Por: {incident.user.name} - {new Date(incident.createdAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <Button
                      onClick={() => resolveIncidentMutation.mutate({ id: incident.id, roomId: incident.roomId })}
                      variant="success"
                      size="sm"
                    >
                      Resolver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card title={`Habitaciones Disponibles (${openRooms.length})`}>
          {roomsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openRooms.map((room: any) => (
                <div key={room.id} className="relative">
                  <RoomCard
                    room={room}
                    onViewDetails={(id) => router.push(`/reception/rooms/${id}`)}
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      onClick={() => handleToggleOccupied(room.id, room.isOccupied)}
                      variant={room.isOccupied ? 'success' : 'secondary'}
                      size="sm"
                      className="flex-1"
                    >
                      {room.isOccupied ? (
                        <>
                          <CheckIcon className="w-4 h-4 mr-1" />
                          Desocupada
                        </>
                      ) : (
                        'Ocupada'
                      )}
                    </Button>
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
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {disabledRooms.length > 0 && (
          <Card title={`Habitaciones Inhabilitadas (${disabledRooms.length})`} className="border-red-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disabledRooms.map((room: any) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onViewDetails={(id) => router.push(`/reception/rooms/${id}`)}
                />
              ))}
            </div>
          </Card>
        )}

        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Asignar Habitaciones</h3>
              <p className="text-sm text-gray-600 mb-4">
                {selectedRooms.length} habitación(es) seleccionada(s)
              </p>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {users?.map((user: any) => (
                  <Button
                    key={user.id}
                    onClick={() => handleAssignRooms(user.id)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    {user.name || user.email}
                  </Button>
                ))}
              </div>
              <Button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedRooms([]);
                }}
                variant="secondary"
                className="w-full"
              >
                Cancelar
              </Button>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
