import Dexie, { Table } from 'dexie';

export interface PendingCleaning {
  id?: number;
  roomId: string;
  userId: string;
  cleanedAt: string;
  date: string;
  synced: boolean;
}

export interface PendingIncident {
  id?: number;
  roomId: string;
  userId: string;
  description: string;
  photos: string[];
  createdAt: string;
  synced: boolean;
}

class OfflineDB extends Dexie {
  pendingCleanings!: Table<PendingCleaning>;
  pendingIncidents!: Table<PendingIncident>;

  constructor() {
    super('HotelHousekeepingDB');
    this.version(1).stores({
      pendingCleanings: '++id, roomId, userId, synced',
      pendingIncidents: '++id, roomId, userId, synced',
    });
  }
}

export const db = new OfflineDB();

