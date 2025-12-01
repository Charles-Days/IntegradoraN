'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { UserRole } from '@/lib/enums';
import Layout from '@/components/Layout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, TrashIcon } from '@/components/icons';

export default function AdminPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'user' | 'room' | null; id: string | null }>({ type: null, id: null });
  const [userFormData, setUserFormData] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
  }>({
    name: '',
    email: '',
    password: '',
    role: UserRole.HOUSEKEEPER,
  });
  const [roomFormData, setRoomFormData] = useState({
    number: '',
    floor: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userFormData) => {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateUserModal(false);
      setUserFormData({ name: '', email: '', password: '', role: UserRole.HOUSEKEEPER });
      setErrors({});
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof userFormData> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditUserModal(false);
      setEditingUser(null);
      setUserFormData({ name: '', email: '', password: '', role: UserRole.HOUSEKEEPER });
      setErrors({});
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirm({ type: null, id: null });
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: typeof roomFormData) => {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: data.number,
          floor: data.floor ? parseInt(data.floor) : null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create room');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setShowCreateRoomModal(false);
      setRoomFormData({ number: '', floor: '' });
      setErrors({});
    },
    onError: (error: Error) => {
      setErrors({ roomSubmit: error.message });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { number?: string; floor?: number | null } }) => {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          number: data.number,
          floor: data.floor,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update room');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setShowEditRoomModal(false);
      setEditingRoom(null);
      setRoomFormData({ number: '', floor: '' });
      setErrors({});
    },
    onError: (error: Error) => {
      setErrors({ roomSubmit: error.message });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete room');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setDeleteConfirm({ type: null, id: null });
    },
    onError: (error: Error) => {
      setErrors({ roomSubmit: error.message });
    },
  });

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (editingUser) {
      const updateData: any = {
        name: userFormData.name,
        email: userFormData.email,
        role: userFormData.role,
      };
      if (userFormData.password) {
        if (userFormData.password.length < 6) {
          setErrors({ password: 'La contraseña debe tener al menos 6 caracteres' });
          return;
        }
        updateData.password = userFormData.password;
      }
      updateUserMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      if (!userFormData.name || !userFormData.email || !userFormData.password) {
        setErrors({ submit: 'Todos los campos son requeridos' });
        return;
      }
      if (userFormData.password.length < 6) {
        setErrors({ password: 'La contraseña debe tener al menos 6 caracteres' });
        return;
      }
      createUserMutation.mutate(userFormData);
    }
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!roomFormData.number) {
      setErrors({ roomSubmit: 'El número de habitación es requerido' });
      return;
    }

    if (editingRoom) {
      updateRoomMutation.mutate({
        id: editingRoom.id,
        data: {
          number: roomFormData.number,
          floor: roomFormData.floor ? parseInt(roomFormData.floor) : (roomFormData.floor === '' ? null : undefined),
        },
      });
    } else {
      createRoomMutation.mutate(roomFormData);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || UserRole.HOUSEKEEPER,
    });
    setShowEditUserModal(true);
  };

  const handleEditRoom = (room: any) => {
    setEditingRoom(room);
    setRoomFormData({
      number: room.number || '',
      floor: room.floor ? String(room.floor) : '',
    });
    setShowEditRoomModal(true);
  };

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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case UserRole.RECEPTION:
        return 'bg-blue-100 text-blue-800';
      case UserRole.HOUSEKEEPER:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!session || session.user.role !== UserRole.ADMIN) {
    return (
      <Layout title="Acceso Denegado">
        <Card>
          <p className="text-center text-gray-600">No tienes permisos para acceder a esta página.</p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Administración">
      <div className="space-y-6">
        <Card
          title="Gestión de Usuarios"
          actions={
            <Button onClick={() => setShowCreateUserModal(true)} variant="primary" size="sm">
              <PlusIcon className="w-4 h-4 mr-1" />
              Crear Usuario
            </Button>
          }
        >
          {usersLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Creación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          {user.id !== session.user.id && (
                            <button
                              onClick={() => setDeleteConfirm({ type: 'user', id: user.id })}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Gestión de Habitaciones"
          actions={
            <Button onClick={() => setShowCreateRoomModal(true)} variant="primary" size="sm">
              <PlusIcon className="w-4 h-4 mr-1" />
              Crear Habitación
            </Button>
          }
        >
          {roomsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Piso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ocupada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rooms?.map((room: any) => (
                    <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{room.number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{room.floor || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {room.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          room.isOccupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {room.isOccupied ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditRoom(room)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'room', id: room.id })}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {showCreateUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Crear Nuevo Usuario</h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <Input
                  label="Nombre"
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  error={errors.password}
                  required
                />
                <Select
                  label="Rol"
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  options={[
                    { value: UserRole.RECEPTION, label: 'Recepción' },
                    { value: UserRole.HOUSEKEEPER, label: 'Camarera' },
                  ]}
                />
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {errors.submit}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={createUserMutation.isPending}
                    className="flex-1"
                  >
                    Crear Usuario
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setUserFormData({ name: '', email: '', password: '', role: UserRole.HOUSEKEEPER });
                      setErrors({});
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {showEditUserModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Editar Usuario</h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <Input
                  label="Nombre"
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                />
                <Input
                  label="Contraseña (dejar vacío para no cambiar)"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  error={errors.password}
                  placeholder="Nueva contraseña (opcional)"
                />
                <Select
                  label="Rol"
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  options={[
                    { value: UserRole.RECEPTION, label: 'Recepción' },
                    { value: UserRole.HOUSEKEEPER, label: 'Camarera' },
                  ]}
                />
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {errors.submit}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={updateUserMutation.isPending}
                    className="flex-1"
                  >
                    Guardar Cambios
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditUserModal(false);
                      setEditingUser(null);
                      setUserFormData({ name: '', email: '', password: '', role: UserRole.HOUSEKEEPER });
                      setErrors({});
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {showCreateRoomModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Crear Nueva Habitación</h3>
              <form onSubmit={handleRoomSubmit} className="space-y-4">
                <Input
                  label="Número de Habitación"
                  type="text"
                  value={roomFormData.number}
                  onChange={(e) => setRoomFormData({ ...roomFormData, number: e.target.value })}
                  placeholder="Ej: 101, 205, 310"
                  required
                />
                <Input
                  label="Piso (Opcional)"
                  type="number"
                  value={roomFormData.floor}
                  onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                  placeholder="Ej: 1, 2, 3"
                  min="1"
                />
                {errors.roomSubmit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {errors.roomSubmit}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={createRoomMutation.isPending}
                    className="flex-1"
                  >
                    Crear Habitación
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateRoomModal(false);
                      setRoomFormData({ number: '', floor: '' });
                      setErrors({});
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {showEditRoomModal && editingRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Editar Habitación</h3>
              <form onSubmit={handleRoomSubmit} className="space-y-4">
                <Input
                  label="Número de Habitación"
                  type="text"
                  value={roomFormData.number}
                  onChange={(e) => setRoomFormData({ ...roomFormData, number: e.target.value })}
                  required
                />
                <Input
                  label="Piso (Opcional)"
                  type="number"
                  value={roomFormData.floor}
                  onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                  placeholder="Ej: 1, 2, 3"
                  min="1"
                />
                {errors.roomSubmit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {errors.roomSubmit}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={updateRoomMutation.isPending}
                    className="flex-1"
                  >
                    Guardar Cambios
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditRoomModal(false);
                      setEditingRoom(null);
                      setRoomFormData({ number: '', floor: '' });
                      setErrors({});
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {deleteConfirm.type && deleteConfirm.id && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4 text-red-600">
                Confirmar Eliminación
              </h3>
              <p className="text-gray-700 mb-6">
                ¿Estás seguro de que deseas eliminar este {deleteConfirm.type === 'user' ? 'usuario' : 'habitación'}? 
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (deleteConfirm.type === 'user') {
                      deleteUserMutation.mutate(deleteConfirm.id!);
                    } else {
                      deleteRoomMutation.mutate(deleteConfirm.id!);
                    }
                  }}
                  variant="danger"
                  isLoading={deleteUserMutation.isPending || deleteRoomMutation.isPending}
                  className="flex-1"
                >
                  Eliminar
                </Button>
                <Button
                  onClick={() => setDeleteConfirm({ type: null, id: null })}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
