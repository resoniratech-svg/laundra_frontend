import React, { useState, useEffect } from 'react';

import { getApiBaseUrl } from './config';

const BASE_URL = getApiBaseUrl();

export default function CustomerPrepaidPackages({ customerId, token }: { customerId: string, token: string }) {
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [myPackages, setMyPackages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'my-packages'>('my-packages');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch available
      const resAvail = await fetch(`${BASE_URL}/api/v1/prepaid-packages/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resAvail.ok) {
        setAvailablePackages(await resAvail.json());
      }
      
      // Fetch my packages
      const resMy = await fetch(`${BASE_URL}/api/v1/prepaid-packages/customer/${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resMy.ok) {
        setMyPackages(await resMy.json());
      }
    } catch (err) {
      console.error("Error fetching packages", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkgId: string, price: number) => {
    if (!confirm(`Are you sure you want to purchase this package for QR ${price}?`)) return;
    try {
      // Mock payment simulation
      const res = await fetch(`${BASE_URL}/api/v1/prepaid-packages/${pkgId}/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          payment_method: 'Card'
        })
      });
      if (res.ok) {
        alert('Package purchased successfully!');
        fetchData();
        setActiveTab('my-packages');
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to purchase package');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  if (loading) return <div>Loading Packages...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('my-packages')}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'my-packages' ? '#8b5cf6' : 'transparent', color: activeTab === 'my-packages' ? 'white' : '#64748b' }}
        >
          My Packages & QR
        </button>
        <button 
          onClick={() => setActiveTab('available')}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'available' ? '#8b5cf6' : 'transparent', color: activeTab === 'available' ? 'white' : '#64748b' }}
        >
          Buy New Package
        </button>
      </div>

      {activeTab === 'available' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {availablePackages.map(p => (
            <div key={p.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>{p.name}</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{p.description}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Total Items:</span>
                <span style={{ fontWeight: 'bold' }}>{p.total_quantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Validity:</span>
                <span style={{ fontWeight: 'bold' }}>{p.validity_days ? `${p.validity_days} Days` : 'Lifetime'}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                <div>
                  <strike style={{ color: '#94a3b8', fontSize: '0.8rem' }}>QR {p.original_price}</strike>
                  <div style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.2rem' }}>QR {p.offer_price}</div>
                </div>
                <button 
                  onClick={() => handlePurchase(p.id, p.offer_price)}
                  style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Purchase
                </button>
              </div>
            </div>
          ))}
          {availablePackages.length === 0 && (
            <div style={{ color: '#64748b', textAlign: 'center', gridColumn: '1 / -1', padding: '20px' }}>No packages currently available.</div>
          )}
        </div>
      )}

      {activeTab === 'my-packages' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {myPackages.map(mp => (
            <div key={mp.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: `2px solid ${mp.status === 'ACTIVE' ? '#8b5cf6' : '#cbd5e1'}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>{mp.package_name}</h3>
                <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: mp.status === 'ACTIVE' ? '#ede9fe' : '#f1f5f9', color: mp.status === 'ACTIVE' ? '#8b5cf6' : '#64748b' }}>
                  {mp.status}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Remaining Balance:</span>
                <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{mp.remaining_quantity} / {mp.total_quantity} Items</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Expires:</span>
                <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{mp.expiry_date ? new Date(mp.expiry_date).toLocaleDateString() : 'Never'}</span>
              </div>
              
              {/* QR Code display */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(mp.qr_token)}`} alt="Package QR Code" width="150" height="150" />
                <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Show this QR Code at checkout</p>
                <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', marginTop: '4px', color: '#94a3b8' }}>{mp.qr_token}</div>
              </div>
              
              {/* Usage History Mini */}
              {mp.usage_history && mp.usage_history.length > 0 && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px' }}>Recent Usage:</div>
                  {mp.usage_history.slice(0, 3).map((h: any) => (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                      <span>Order #{h.order_id}</span>
                      <span style={{ color: '#ef4444' }}>-{h.quantity_used} items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {myPackages.length === 0 && (
            <div style={{ color: '#64748b', textAlign: 'center', gridColumn: '1 / -1', padding: '40px', background: 'white', borderRadius: '12px' }}>
              You don't have any active packages.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
