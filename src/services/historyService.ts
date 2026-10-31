import { openDB, IDBPDatabase } from 'idb';
import type { HistoryItem, TemplateItem, PrintQueueItem } from '@/types/label';

const DB_NAME = 'ThermalLabelerDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
          templateStore.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const historyService = {
  async saveHistory(item: HistoryItem): Promise<void> {
    try {
      const db = await getDB();
      await db.put('history', item);
    } catch (e) {
      console.error('IndexedDB saveHistory error:', e);
    }
  },

  async getHistory(): Promise<HistoryItem[]> {
    try {
      const db = await getDB();
      const items = await db.getAllFromIndex('history', 'timestamp');
      return items.reverse(); // Newest first
    } catch (e) {
      console.error('IndexedDB getHistory error:', e);
      return [];
    }
  },

  async deleteHistory(id: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete('history', id);
    } catch (e) {
      console.error('IndexedDB deleteHistory error:', e);
    }
  },

  async clearHistory(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear('history');
    } catch (e) {
      console.error('IndexedDB clearHistory error:', e);
    }
  },

  async toggleFavorite(id: string): Promise<boolean> {
    try {
      const db = await getDB();
      const item = await db.get('history', id) as HistoryItem | undefined;
      if (item) {
        item.isFavorite = !item.isFavorite;
        await db.put('history', item);
        return item.isFavorite;
      }
    } catch (e) {
      console.error('IndexedDB toggleFavorite error:', e);
    }
    return false;
  },

  async saveTemplate(template: TemplateItem): Promise<void> {
    try {
      const db = await getDB();
      await db.put('templates', template);
    } catch (e) {
      console.error('IndexedDB saveTemplate error:', e);
    }
  },

  async getTemplates(): Promise<TemplateItem[]> {
    try {
      const db = await getDB();
      const items = await db.getAllFromIndex('templates', 'createdAt');
      return items.reverse();
    } catch (e) {
      console.error('IndexedDB getTemplates error:', e);
      return [];
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete('templates', id);
    } catch (e) {
      console.error('IndexedDB deleteTemplate error:', e);
    }
  },

  async saveQueue(queue: PrintQueueItem[]): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('queue', 'readwrite');
      await tx.objectStore('queue').clear();
      for (const item of queue) {
        await tx.objectStore('queue').put(item);
      }
      await tx.done;
    } catch (e) {
      console.error('IndexedDB saveQueue error:', e);
    }
  },

  async getQueue(): Promise<PrintQueueItem[]> {
    try {
      const db = await getDB();
      return await db.getAll('queue');
    } catch (e) {
      console.error('IndexedDB getQueue error:', e);
      return [];
    }
  }
};
