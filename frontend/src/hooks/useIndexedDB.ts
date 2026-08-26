/**
 * IndexedDB service for caching parcel ID address pairings
 */

interface CachedPairings {
  id: string;
  pairings: Array<{ parcelId: string; fullAddress: string }>;
  timestamp: string;
  year: number;
}

const DB_NAME = 'AssessingPropertiesDB';
// Bump when pairings schema/source changes so clients discard stale caches.
// v3: drop the truncated 8k/9k pairings file served on 2026-08-26.
const DB_VERSION = 3;
const STORE_NAME = 'parcelIdAddressPairings';
/** Re-fetch pairings at least this often so mid-year regenerations are picked up. */
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Drop and recreate so schema bumps clear stale pairings (e.g. Layer 0 → Layer 13).
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('year', 'year', { unique: false });
      };
    });
  }

  async storePairings(pairings: Array<{ parcelId: string; fullAddress: string }>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const cachedData: CachedPairings = {
      id: 'current',
      pairings,
      timestamp: new Date().toISOString(),
      year: new Date().getFullYear()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cachedData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPairings(): Promise<CachedPairings | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get('current');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async isCacheValid(): Promise<boolean> {
    const cached = await this.getPairings();
    if (!cached) return false;

    const currentYear = new Date().getFullYear();
    if (cached.year !== currentYear) return false;

    const cachedAt = Date.parse(cached.timestamp);
    if (Number.isNaN(cachedAt)) return false;

    return Date.now() - cachedAt < CACHE_MAX_AGE_MS;
  }

  async clearCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const indexedDBService = new IndexedDBService(); 