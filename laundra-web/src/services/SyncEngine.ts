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
    const token = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('ll_admin_auth_token') || localStorage.getItem('ll_auth_token') || localStorage.getItem('token') || '')
      : '';
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

        // 1. Auto-resolve or create Customer UUID in PostgreSQL
        let realCustId = orderData.customer_id;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realCustId || '');
        if (!isUuid) {
          try {
            const custRes = await fetch(`${baseUrl}/api/v1/customers`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                name: orderData.customer_name || 'Walk-in / Guest',
                phone: orderData.phone || `555-${Math.floor(1000 + Math.random() * 9000)}`,
                email: orderData.email || `customer_${Date.now()}@laundra.com`,
                address: orderData.address || 'Branch Pickup'
              })
            });
            if (custRes.ok) {
              const custData = await custRes.json();
              realCustId = custData.id;
            }
          } catch (e) {
            console.warn('[SyncEngine] Auto customer registration fallback:', e);
          }
        }

        // 2. Auto-resolve Services List for valid service UUIDs
        let backendServices: any[] = [];
        try {
          const srvRes = await fetch(`${baseUrl}/api/v1/services`, { headers });
          if (srvRes.ok) {
            backendServices = await srvRes.json();
          }
        } catch (e) {}

        const itemsPayload = (orderData.items || []).map((i: any) => {
          let srvId = i.service_id || i.serviceId || i.variantId || i.itemId;
          const matched = backendServices.find((bs: any) =>
            bs.id === srvId || (bs.name && i.name && bs.name.toLowerCase() === i.name.toLowerCase())
          ) || backendServices[0];
          if (matched && matched.id) {
            srvId = matched.id;
          }
          return {
            service_id: srvId,
            quantity: i.quantity || i.qty || 1
          };
        });

        // 3. Send valid payload to create order in PostgreSQL
        const computedPaymentStatus = orderData.payment_method === 'Pay Later' ? 'UNPAID' : (orderData.payment_status || 'PAID');
        const computedPaidAmount = orderData.payment_method === 'Pay Later' ? 0 : (orderData.paid_amount ?? orderData.total_amount ?? 0);

        const res = await fetch(`${baseUrl}/api/v1/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            customer_id: realCustId,
            items: itemsPayload,
            coupon_code: orderData.coupon_code || null,
            is_express: Boolean(orderData.is_express),
            pay_with_package_id: orderData.pay_with_package_id || null,
            pickup_address: orderData.address || undefined,
            delivery_address: orderData.address || undefined,
            payment_status: computedPaymentStatus,
            paid_amount: computedPaidAmount,
            special_instructions: orderData.special_instructions || undefined
          })
        });

        if (res.ok) {
          const cloudOrder = await res.json();
          this.updateLocalOrderWithCloudId(orderData.id || action.id, cloudOrder.id);
          return true;
        }
        return false;
      }

      case 'ORDER_DELETE': {
        const { orderId, backendId } = action.payload;
        const targetId = backendId || orderId;
        const res = await fetch(`${baseUrl}/api/v1/orders/${targetId}`, {
          method: 'DELETE',
          headers
        });
        return res.ok || res.status === 404; // 404 means already deleted on cloud
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
