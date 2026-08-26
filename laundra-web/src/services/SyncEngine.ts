// Laundra POS - Background Auto-Sync Engine
import { offlineQueue, type OfflineAction } from './OfflineQueue';
import { getApiBaseUrl } from '../config';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}

class SyncEngineService {
  private isSyncing = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncEngine] Network connection restored 🟢');
        this.isOnline = true;
        this.notifyState();
        this.syncAllPendingActions();
      });

      window.addEventListener('offline', () => {
        console.log('[SyncEngine] Network connection lost 🔴');
        this.isOnline = false;
        this.notifyState();
      });

      // Periodic check every 30 seconds if online and items are pending
      setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.syncAllPendingActions();
        }
      }, 30000);
    }
  }

  // Get current sync state snapshot
  async getState(companyId?: string): Promise<SyncState> {
    const pendingCount = await offlineQueue.getPendingCount(companyId);
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError
    };
  }

  // Trigger manual or automatic sync of all pending actions
  async syncAllPendingActions(companyId?: string): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    const pending = await offlineQueue.getPendingActions(companyId);
    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyState();
    console.log(`[SyncEngine] Starting sync of ${pending.length} pending actions...`);

    let synced = 0;
    let failed = 0;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ll_auth_token') : null;
    const BASE_URL = getApiBaseUrl();

    for (const action of pending) {
      try {
        const success = await this.processAction(action, BASE_URL, token);
        if (success) {
          await offlineQueue.markAsSynced(action.id);
          synced++;
          console.log(`[SyncEngine] Successfully synced action ${action.id} (${action.type})`);
        } else {
          await offlineQueue.markAsFailed(action.id, 'Server returned error status');
          failed++;
        }
      } catch (err: any) {
        console.error(`[SyncEngine] Error syncing action ${action.id}:`, err);
        await offlineQueue.markAsFailed(action.id, err?.message || 'Network sync failure');
        failed++;
      }
    }

    this.isSyncing = false;
    this.lastSyncTime = new Date().toLocaleTimeString();
    if (failed > 0) {
      this.lastError = `${failed} item(s) pending retry`;
    } else {
      this.lastError = null;
    }

    this.notifyState();
    return { synced, failed };
  }

  // Process individual action based on type
  private async processAction(action: OfflineAction, baseUrl: string, token: string | null): Promise<boolean> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (action.companyId && action.companyId !== 'comp-default') {
      headers['X-Tenant-ID'] = action.companyId;
    }

    switch (action.type) {
      case 'ORDER_CREATE': {
        const orderData = action.payload;
        // Transform local order to backend order payload
        const res = await fetch(`${baseUrl}/api/v1/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(orderData)
        });
        if (res.ok) {
          const cloudOrder = await res.json();
          // Update local storage order reference if needed
          this.updateLocalOrderWithCloudId(orderData.id || action.id, cloudOrder.id);
          return true;
        }
        return false;
      }

      case 'PACKAGE_DEDUCT': {
        const res = await fetch(`${baseUrl}/api/v1/prepaid-packages/deduct`, {
          method: 'POST',
          headers,
          body: JSON.stringify(action.payload)
        });
        return res.ok;
      }

      case 'CUSTOMER_CREATE': {
        const res = await fetch(`${baseUrl}/api/v1/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify(action.payload)
        });
        return res.ok;
      }

      case 'ORDER_STATUS_UPDATE': {
        const { orderId, status } = action.payload;
        const res = await fetch(`${baseUrl}/api/v1/orders/${orderId}/status?status=${status}`, {
          method: 'POST',
          headers
        });
        return res.ok;
      }

      default:
        // Other custom actions
        return true;
    }
  }

  private updateLocalOrderWithCloudId(localId: string, cloudId: string) {
    try {
      const companyId = localStorage.getItem('ll_active_company_id') || 'comp-default';
      const key = `ll_${companyId}_orders`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const orders = JSON.parse(raw);
        const updated = orders.map((o: any) => {
          if (o.id === localId) {
            return { ...o, backendId: cloudId, syncStatus: 'SYNCED' };
          }
          return o;
        });
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {}
  }

  private notifyState() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('laundra_sync_state_changed'));
    }
  }
}

export const syncEngine = new SyncEngineService();
