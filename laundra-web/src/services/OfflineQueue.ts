// Laundra POS - IndexedDB Offline Queue Service

export interface OfflineAction {
  id: string;
  type: 'ORDER_CREATE' | 'ORDER_STATUS_UPDATE' | 'PACKAGE_DEDUCT' | 'CUSTOMER_CREATE' | 'EXPENSE_CREATE' | 'DRAWER_TX';
  payload: any;
  companyId: string;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount?: number;
  lastError?: string;
}

const DB_NAME = 'LaundraOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_actions';

class OfflineQueueService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not available'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('companyId', 'companyId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        resolve((e.target as IDBOpenDBRequest).result);
      };

      request.onerror = (e) => {
        console.error('[OfflineQueue] IndexedDB open error:', e);
        reject((e.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  // Add an action to the offline queue
  async enqueueAction(
    type: OfflineAction['type'],
    payload: any,
    companyId: string
  ): Promise<OfflineAction> {
    const action: OfflineAction = {
      id: `OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      payload,
      companyId: companyId || 'comp-default',
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING',
      retryCount: 0
    };

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(action);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      console.log(`[OfflineQueue] Enqueued offline ${type}:`, action.id);
      this.notifyQueueChanged();
      return action;
    } catch (e) {
      console.warn('[OfflineQueue] Fallback saving to localStorage:', e);
      this.saveToLocalStorageFallback(action);
      this.notifyQueueChanged();
      return action;
    }
  }

  // Get all pending actions
  async getPendingActions(companyId?: string): Promise<OfflineAction[]> {
    try {
      const db = await this.getDB();
      return new Promise<OfflineAction[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const all: OfflineAction[] = req.result || [];
          const pending = all.filter(
            (a) => a.syncStatus === 'PENDING' || a.syncStatus === 'FAILED'
          );
          if (companyId) {
            resolve(pending.filter((a) => a.companyId === companyId));
          } else {
            resolve(pending);
          }
        };

        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      const fallback = this.getLocalStorageFallback();
      return companyId ? fallback.filter((a) => a.companyId === companyId) : fallback;
    }
  }

  // Get total pending count
  async getPendingCount(companyId?: string): Promise<number> {
    const pending = await this.getPendingActions(companyId);
    return pending.length;
  }

  // Mark an action as SYNCED
  async markAsSynced(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      this.removeFromLocalStorageFallback(id);
    }
    this.notifyQueueChanged();
  }

  // Mark an action as FAILED
  async markAsFailed(id: string, errorMsg: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const action = getReq.result as OfflineAction;
          if (action) {
            action.syncStatus = 'FAILED';
            action.retryCount = (action.retryCount || 0) + 1;
            action.lastError = errorMsg;
            store.put(action);
          }
          resolve();
        };
        getReq.onerror = () => reject(getReq.error);
      });
    } catch (e) {}
    this.notifyQueueChanged();
  }

  // Notify listeners that queue count has changed
  private notifyQueueChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('laundra_offline_queue_changed'));
    }
  }

  // Fallback LocalStorage mechanisms if IndexedDB is blocked in private window
  private saveToLocalStorageFallback(action: OfflineAction) {
    try {
      const existing = this.getLocalStorageFallback();
      existing.push(action);
      localStorage.setItem('ll_offline_queue_fallback', JSON.stringify(existing));
    } catch (e) {}
  }

  private getLocalStorageFallback(): OfflineAction[] {
    try {
      const raw = localStorage.getItem('ll_offline_queue_fallback');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private removeFromLocalStorageFallback(id: string) {
    try {
      const existing = this.getLocalStorageFallback().filter((a) => a.id !== id);
      localStorage.setItem('ll_offline_queue_fallback', JSON.stringify(existing));
    } catch (e) {}
  }
}

export const offlineQueue = new OfflineQueueService();
