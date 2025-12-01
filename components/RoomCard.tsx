'use client';

import { RoomStatus } from '@/lib/enums';
import Button from '@/components/ui/Button';
import { WarningIcon, CheckIcon } from '@/components/icons';

interface RoomCardProps {
  room: {
    id: string;
    number: string;
    floor?: number | null;
    status: RoomStatus;
    isOccupied: boolean;
    cleanings?: Array<{ cleanedAt: Date }>;
    incidents?: Array<{ status: string }>;
  };
  onMarkClean?: (roomId: string) => void;
  onCreateIncident?: (roomId: string) => void;
  onViewDetails?: (roomId: string) => void;
  showActions?: boolean;
}

const statusColors = {
  [RoomStatus.OCCUPIED]: 'bg-red-100 text-red-800',
  [RoomStatus.VACANT]: 'bg-gray-100 text-gray-800',
  [RoomStatus.CLEANING_PENDING]: 'bg-yellow-100 text-yellow-800',
  [RoomStatus.CLEAN]: 'bg-green-100 text-green-800',
  [RoomStatus.DISABLED]: 'bg-red-200 text-red-900',
};

const statusLabels = {
  [RoomStatus.OCCUPIED]: 'Ocupada',
  [RoomStatus.VACANT]: 'Desocupada',
  [RoomStatus.CLEANING_PENDING]: 'Pendiente',
  [RoomStatus.CLEAN]: 'Limpia',
  [RoomStatus.DISABLED]: 'Inhabilitada',
};

export default function RoomCard({
  room,
  onMarkClean,
  onCreateIncident,
  onViewDetails,
  showActions = false,
}: RoomCardProps) {
  const isClean = room.cleanings && room.cleanings.length > 0;
  const hasOpenIncident = room.incidents && room.incidents.some((i) => i.status === 'OPEN');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <span className="text-primary-700 font-bold text-lg">{room.number}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Habitación {room.number}</h3>
              {room.floor && (
                <p className="text-sm text-gray-500">Piso {room.floor}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                statusColors[room.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {statusLabels[room.status] || room.status}
            </span>
            {room.isOccupied && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                Ocupada
              </span>
            )}
            {hasOpenIncident && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                <WarningIcon className="w-3 h-3" />
                Incidencia
              </span>
            )}
          </div>
          {isClean && room.cleanings && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Limpiada:</span>{' '}
                {new Date(room.cleanings[0].cleanedAt).toLocaleString('es-ES')}
              </p>
            </div>
          )}
        </div>
      </div>
      {showActions && (
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          {onMarkClean && room.status !== RoomStatus.CLEAN && (
            <Button
              onClick={() => onMarkClean(room.id)}
              variant="success"
              size="sm"
              className="flex-1"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Marcar Limpia
            </Button>
          )}
          {onCreateIncident && (
            <Button
              onClick={() => onCreateIncident(room.id)}
              variant="danger"
              size="sm"
              className="flex-1"
            >
              <WarningIcon className="w-4 h-4 mr-1" />
              Incidencia
            </Button>
          )}
          {onViewDetails && (
            <Button
              onClick={() => onViewDetails(room.id)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Ver Detalles
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

