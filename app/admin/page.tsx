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
import { PlusIcon, EditIcon, TrashIcon, UserIcon, HotelIcon } from '@/components/icons';

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
        return 'bg-accent-100 text-accent-700';
      case UserRole.RECEPTION:
        return 'bg-primary-100 text-primary-700';
      case UserRole.HOUSEKEEPER:
        return 'bg-success-100 text-success-700';
      default:
        return 'bg-primary-100 text-primary-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      'OCCUPIED': { bg: 'bg-danger-50', text: 'text-danger-700', label: 'Ocupada' },
      'VACANT': { bg: 'bg-primary-50', text: 'text-primary-600', label: 'Vacante' },
      'CLEANING_PENDING': { bg: 'bg-warning-50', text: 'text-warning-700', label: 'Pendiente' },
      'CLEAN': { bg: 'bg-success-50', text: 'text-success-700', label: 'Limpia' },
      'DISABLED': { bg: 'bg-danger-100', text: 'text-danger-800', label: 'Inhabilitada' },
    };
    return statusMap[status] || { bg: 'bg-primary-50', text: 'text-primary-600', label: status };
  };

  if (!session || session.user.role !== UserRole.ADMIN) {
    return (
      <Layout title="Acceso Denegado">
        <Card>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-primary-600">No tienes permisos para acceder a esta página.</p>
          </div>
        </Card>
      </Layout>
    );
  }

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="relative">
        <div className="w-10 h-10 border-4 border-primary-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-10 h-10 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );

  return (
    <Layout title="Administración">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-accent-600" />
              </div>
              <div>
                <p className="text-sm text-primary-500">Total Usuarios</p>
                <p className="text-2xl font-bold text-primary-900">{users?.length || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-primary-100 shadow-soft p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                <HotelIcon className="w-6 h-6 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-primary-500">Total Habitaciones</p>
                <p className="text-2xl font-bold text-primary-900">{rooms?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Section */}
        <Card
          title="Gestión de Usuarios"
          subtitle={`${users?.length || 0} usuarios registrados`}
          actions={
            <Button
              onClick={() => setShowCreateUserModal(true)}
              variant="primary"
              size="sm"
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              Nuevo Usuario
            </Button>
          }
        >
          {usersLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-primary-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider hidden sm:table-cell">
                      Creado
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-primary-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-50">
                  {users?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-primary-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary-600">
                              {user.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-primary-900 truncate">{user.name}</p>
                            <p className="text-xs text-primary-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-primary-500">
                          {new Date(user.createdAt).toLocaleDateString('es-ES')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-primary-500 hover:text-primary-900 hover:bg-primary-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          {user.id !== session.user.id && (
                            <button
                              onClick={() => setDeleteConfirm({ type: 'user', id: user.id })}
                              className="p-2 text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded-lg transition-colors"
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

        {/* Rooms Section */}
        <Card
          title="Gestión de Habitaciones"
          subtitle={`${rooms?.length || 0} habitaciones registradas`}
          actions={
            <Button
              onClick={() => setShowCreateRoomModal(true)}
              variant="primary"
              size="sm"
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              Nueva Habitación
            </Button>
          }
        >
          {roomsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-primary-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">
                      Habitación
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider hidden sm:table-cell">
                      Ocupación
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-primary-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-50">
                  {rooms?.map((room: any) => {
                    const statusBadge = getStatusBadge(room.status);
                    return (
                      <tr key={room.id} className="hover:bg-primary-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-white">{room.number}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-primary-900">Habitación {room.number}</p>
                              <p className="text-xs text-primary-500">
                                {room.floor ? `Piso ${room.floor}` : 'Sin piso asignado'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            room.isOccupied ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${room.isOccupied ? 'bg-danger-500' : 'bg-success-500'}`} />
                            {room.isOccupied ? 'Ocupada' : 'Libre'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditRoom(room)}
                              className="p-2 text-primary-500 hover:text-primary-900 hover:bg-primary-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'room', id: room.id })}
                              className="p-2 text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create User Modal */}
        {showCreateUserModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateUserModal(false)}>
            <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-primary-900 mb-6">Crear Nuevo Usuario</h3>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <Input
                  label="Nombre"
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  required
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  error={errors.password}
                  placeholder="Mínimo 6 caracteres"
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
                  <div className="flex items-center gap-2 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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
                    variant="ghost"
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
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditUserModal && editingUser && (
          <div className="modal-backdrop" onClick={() => setShowEditUserModal(false)}>
            <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-primary-900 mb-6">Editar Usuario</h3>
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
                  label="Nueva Contraseña"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  error={errors.password}
                  placeholder="Dejar vacío para mantener"
                  hint="Dejar vacío para no cambiar la contraseña"
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
                  <div className="flex items-center gap-2 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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
                    variant="ghost"
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
            </div>
          </div>
        )}

        {/* Create Room Modal */}
        {showCreateRoomModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateRoomModal(false)}>
            <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-primary-900 mb-6">Crear Nueva Habitación</h3>
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
                  label="Piso"
                  type="number"
                  value={roomFormData.floor}
                  onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                  placeholder="Ej: 1, 2, 3"
                  hint="Opcional"
                  min="1"
                />
                {errors.roomSubmit && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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
                    variant="ghost"
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
            </div>
          </div>
        )}

        {/* Edit Room Modal */}
        {showEditRoomModal && editingRoom && (
          <div className="modal-backdrop" onClick={() => setShowEditRoomModal(false)}>
            <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-primary-900 mb-6">Editar Habitación</h3>
              <form onSubmit={handleRoomSubmit} className="space-y-4">
                <Input
                  label="Número de Habitación"
                  type="text"
                  value={roomFormData.number}
                  onChange={(e) => setRoomFormData({ ...roomFormData, number: e.target.value })}
                  required
                />
                <Input
                  label="Piso"
                  type="number"
                  value={roomFormData.floor}
                  onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                  placeholder="Ej: 1, 2, 3"
                  hint="Opcional"
                  min="1"
                />
                {errors.roomSubmit && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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
                    variant="ghost"
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
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.type && deleteConfirm.id && (
          <div className="modal-backdrop" onClick={() => setDeleteConfirm({ type: null, id: null })}>
            <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrashIcon className="w-8 h-8 text-danger-600" />
                </div>
                <h3 className="text-xl font-semibold text-primary-900 mb-2">
                  Confirmar Eliminación
                </h3>
                <p className="text-primary-600">
                  ¿Estás seguro de que deseas eliminar {deleteConfirm.type === 'user' ? 'este usuario' : 'esta habitación'}?
                  Esta acción no se puede deshacer.
                </p>
              </div>
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
                  variant="ghost"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
