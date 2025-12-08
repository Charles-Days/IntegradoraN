'use client';

import { RoomStatus } from '@/lib/enums';
import Button from '@/components/ui/Button';
import { WarningIcon, CheckIcon, UserIcon, TrashIcon, RefreshIcon } from '@/components/icons';

interface Assignment {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface LastCleanedBy {
  id: string;
  name: string | null;
  email: string;
}

interface RoomCardProps {
  room: {
    id: string;
    number: string;
    floor?: number | null;
    status: RoomStatus;
    isOccupied: boolean;
    lastCleanedBy?: LastCleanedBy | null;
    cleanings?: Array<{ cleanedAt: Date; user?: { id: string; name: string | null } }>;
    incidents?: Array<{ status: string }>;
    assignments?: Assignment[];
  };
  onMarkClean?: (roomId: string) => void;
  onCreateIncident?: (roomId: string) => void;
  onViewDetails?: (roomId: string) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
  onReassignLastCleaner?: (roomId: string, userId: string) => void;
  showActions?: boolean;
  isPendingSync?: boolean;
}

const statusConfig = {
  [RoomStatus.OCCUPIED]: {
    bg: 'bg-danger-50',
    text: 'text-danger-700',
    dot: 'bg-danger-500',
    label: 'Ocupada',
  },
  [RoomStatus.VACANT]: {
    bg: 'bg-primary-50',
    text: 'text-primary-600',
    dot: 'bg-primary-400',
    label: 'Vacante',
  },
  [RoomStatus.CLEANING_PENDING]: {
    bg: 'bg-warning-50',
    text: 'text-warning-700',
    dot: 'bg-warning-500',
    label: 'Pendiente',
  },
  [RoomStatus.CHECKOUT_PENDING]: {
    bg: 'bg-accent-50',
    text: 'text-accent-700',
    dot: 'bg-accent-500',
    label: 'Checkout',
  },
  [RoomStatus.CLEAN]: {
    bg: 'bg-success-50',
    text: 'text-success-700',
    dot: 'bg-success-500',
    label: 'Limpia',
  },
  [RoomStatus.DISABLED]: {
    bg: 'bg-danger-100',
    text: 'text-danger-800',
    dot: 'bg-danger-600',
    label: 'Inhabilitada',
  },
};

export default function RoomCard({
  room,
  onMarkClean,
  onCreateIncident,
  onViewDetails,
  onRemoveAssignment,
  onReassignLastCleaner,
  showActions = false,
  isPendingSync = false,
}: RoomCardProps) {
  const isClean = room.cleanings && room.cleanings.length > 0;
  const hasOpenIncident = room.incidents && room.incidents.some((i) => i.status === 'OPEN');
  const config = statusConfig[room.status] || statusConfig[RoomStatus.VACANT];
  const hasAssignments = room.assignments && room.assignments.length > 0;
  const isCheckoutPending = room.status === RoomStatus.CHECKOUT_PENDING;
  const canReassignToLastCleaner = isCheckoutPending && room.lastCleanedBy && !hasAssignments;

  return (
    <div className="bg-white rounded-2xl border border-primary-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 overflow-hidden group">
      {/* Header con número de habitación */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* Room Number Badge */}
            <div className="w-14 h-14 bg-primary-900 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-bold text-lg">{room.number}</span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-primary-900">
                Habitación {room.number}
              </h3>
              {room.floor && (
                <p className="text-sm text-primary-500 mt-0.5">
                  Piso {room.floor}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {/* Main Status Badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>

          {/* Occupied Badge */}
          {room.isOccupied && room.status !== RoomStatus.OCCUPIED && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-50 text-danger-700">
              <span className="w-1.5 h-1.5 rounded-full bg-danger-500" />
              Ocupada
            </span>
          )}

          {/* Incident Badge */}
          {hasOpenIncident && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-50 text-warning-700">
              <WarningIcon className="w-3.5 h-3.5" />
              Incidencia
            </span>
          )}

          {/* Pending Sync Badge */}
          {isPendingSync && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-50 text-accent-700">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Pendiente de sincronizar
            </span>
          )}
        </div>

        {/* Assigned To */}
        {hasAssignments && (
          <div className="mt-4 pt-4 border-t border-primary-100">
            <p className="text-xs text-primary-500 mb-2">Asignada a</p>
            <div className="space-y-2">
              {room.assignments!.map((assignment) => (
                <div key={assignment.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4 text-accent-600" />
                  </div>
                  <p className="text-sm font-medium text-primary-900 truncate flex-1">
                    {assignment.user.name || assignment.user.email}
                  </p>
                  {onRemoveAssignment && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAssignment(assignment.id);
                      }}
                      className="w-7 h-7 bg-danger-100 hover:bg-danger-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                      title="Quitar asignación"
                    >
                      <TrashIcon className="w-4 h-4 text-danger-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Reassign to Last Cleaner */}
        {canReassignToLastCleaner && onReassignLastCleaner && (
          <div className="mt-4 pt-4 border-t border-primary-100">
            <p className="text-xs text-primary-500 mb-2">Reasignación rápida</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReassignLastCleaner(room.id, room.lastCleanedBy!.id);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-accent-50 hover:bg-accent-100 rounded-xl transition-colors group/btn"
            >
              <div className="w-8 h-8 bg-accent-200 group-hover/btn:bg-accent-300 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                <RefreshIcon className="w-4 h-4 text-accent-700" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-primary-900">
                  Reasignar a {room.lastCleanedBy!.name || room.lastCleanedBy!.email}
                </p>
                <p className="text-xs text-primary-500">Última persona en limpiar esta habitación</p>
              </div>
            </button>
          </div>
        )}

        {/* Last Cleaned Info */}
        {isClean && room.cleanings && (
          <div className={`mt-4 pt-4 border-t border-primary-100 ${hasAssignments ? 'mt-3 pt-3' : ''}`}>
            <div className="flex items-center gap-2 text-sm text-primary-500">
              <CheckIcon className="w-4 h-4 text-success-500" />
              <span>
                Limpiada el{' '}
                <span className="font-medium text-primary-700">
                  {new Date(room.cleanings[0].cleanedAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {room.cleanings[0].user?.name && (
                  <span className="text-primary-400"> por {room.cleanings[0].user.name}</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-5 pb-5">
          <div className="flex gap-2 pt-4 border-t border-primary-100">
            {onMarkClean && room.status !== RoomStatus.CLEAN && (
              <Button
                onClick={() => onMarkClean(room.id)}
                variant="success"
                size="sm"
                className="flex-1"
                leftIcon={<CheckIcon className="w-4 h-4" />}
              >
                Limpia
              </Button>
            )}
            {onCreateIncident && (
              <Button
                onClick={() => onCreateIncident(room.id)}
                variant="outline"
                size="sm"
                className="flex-1"
                leftIcon={<WarningIcon className="w-4 h-4" />}
              >
                Incidencia
              </Button>
            )}
            {onViewDetails && (
              <Button
                onClick={() => onViewDetails(room.id)}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                Detalles
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
