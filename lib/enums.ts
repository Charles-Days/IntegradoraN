export const UserRole = {
  ADMIN: 'ADMIN',
  RECEPTION: 'RECEPTION',
  HOUSEKEEPER: 'HOUSEKEEPER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const RoomStatus = {
  OCCUPIED: 'OCCUPIED',
  VACANT: 'VACANT',
  CLEANING_PENDING: 'CLEANING_PENDING',
  CLEAN: 'CLEAN',
  DISABLED: 'DISABLED',
} as const;

export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus];

export const IncidentStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
} as const;

export type IncidentStatus = typeof IncidentStatus[keyof typeof IncidentStatus];

