import React, { useState, useEffect } from 'react';
import { syncEngine, type SyncState } from '../services/SyncEngine';
import { offlineQueue, type OfflineAction } from '../services/OfflineQueue';

interface SyncStatusBadgeProps {
  companyId?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ companyId }) => {
  const [state, setState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null
  });
  const [showModal, setShowModal] = useState(false);
  const [pendingList, setPendingList] = useState<OfflineAction[]>([]);

  const refreshState = async () => {
    const s = await syncEngine.getState(companyId);
    setState(s);
  };

  useEffect(() => {
    refreshState();

    const handleSyncChange = () => refreshState();
    const handleQueueChange = () => refreshState();

    window.addEventListener('laundra_sync_state_changed', handleSyncChange);
    window.addEventListener('laundra_offline_queue_changed', handleQueueChange);

    return () => {
      window.removeEventListener('laundra_sync_state_changed', handleSyncChange);
      window.removeEventListener('laundra_offline_queue_changed', handleQueueChange);
    };
  }, [companyId]);

  const handleOpenModal = async () => {
    const list = await offlineQueue.getPendingActions(companyId);
    setPendingList(list);
    setShowModal(true);
  };

  const handleManualSync = async () => {
    await syncEngine.syncAllPendingActions(companyId);
    const list = await offlineQueue.getPendingActions(companyId);
    setPendingList(list);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        title={state.isOnline ? 'Online - Click for sync details' : 'Offline Mode - Orders stored locally on PC'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.78rem',
          fontWeight: '700',
          cursor: 'pointer',
          border: '1.5px solid',
          transition: 'all 0.2s ease',
          background: state.isSyncing
            ? '#eff6ff'
            : state.isOnline
            ? state.pendingCount > 0
              ? '#fffbeb'
              : '#f0fdf4'
            : '#fff7ed',
          borderColor: state.isSyncing
            ? '#3b82f6'
            : state.isOnline
            ? state.pendingCount > 0
              ? '#f59e0b'
              : '#22c55e'
            : '#ea580c',
          color: state.isSyncing
            ? '#1d4ed8'
            : state.isOnline
            ? state.pendingCount > 0
              ? '#b45309'
              : '#15803d'
            : '#c2410c',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {state.isSyncing ? (
          <>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔄</span>
            <span>Syncing to Cloud...</span>
          </>
        ) : state.isOnline ? (
          state.pendingCount > 0 ? (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              <span>Online ({state.pendingCount} On Hold)</span>
            </>
          ) : (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span>Online</span>
            </>
          )
        ) : (
          <>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }} />
            <span>Offline ({state.pendingCount} On Hold)</span>
          </>
        )}
      </button>

      {/* Sync Details Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>{state.isOnline ? '🟢' : '🟡'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: '800' }}>
                    {state.isOnline ? 'System Online (Cloud Connected)' : 'Offline Mode (Local Storage Active)'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    {state.isOnline
                      ? 'All new counter transactions sync immediately to Cloud PostgreSQL.'
                      : 'Internet is disconnected. Orders & receipts are saved locally on this PC.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: '700', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Actions in Local Hold Queue:</span>
                <span style={{ fontWeight: '800', color: state.pendingCount > 0 ? '#ea580c' : '#15803d' }}>
                  {state.pendingCount} item(s)
                </span>
              </div>
              {state.lastSyncTime && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Last Cloud Sync:</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{state.lastSyncTime}</span>
                </div>
              )}
            </div>

            {/* List of Pending Actions */}
            {pendingList.length > 0 ? (
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '18px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Items Waiting to Sync:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {pendingList.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 12px',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ color: '#1e3a8a' }}>{item.type}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {new Date(item.createdAt).toLocaleTimeString()} · {item.id}
                        </div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700', background: '#fef3c7', color: '#92400e' }}>
                        {item.syncStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: '#15803d', fontSize: '0.85rem', fontWeight: '600' }}>
                ✅ All local actions are synced with the Cloud Database!
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={state.isSyncing || !state.isOnline || state.pendingCount === 0}
                style={{
                  padding: '9px 18px',
                  background: state.isOnline && state.pendingCount > 0 ? '#2563eb' : '#cbd5e1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: state.isOnline && state.pendingCount > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {state.isSyncing ? '🔄 Syncing...' : '🚀 Sync to Cloud Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
