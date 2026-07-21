import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { getApiBaseUrl } from './config';

const BASE_URL = getApiBaseUrl();

export const QRScanPage: React.FC = () => {
  const { qr_token } = useParams<{ qr_token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.background = 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)';
    document.body.style.minHeight = '100vh';
    document.body.style.fontFamily = "'Outfit', 'Inter', sans-serif";

    if (qr_token) {
      fetch(`${BASE_URL}/api/v1/prepaid-packages/qr/${qr_token}`)
        .then(res => {
          if (!res.ok) throw new Error('Package not found or invalid QR code.');
          return res.json();
        })
        .then(resData => {
          setData(resData.package);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      setError("No QR token provided.");
      setLoading(false);
    }
    
    return () => {
      document.body.style.background = '';
      document.body.style.minHeight = '';
      document.body.style.fontFamily = '';
    };
  }, [qr_token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
        Loading Package Data...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', padding: '40px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🚫</div>
          <h2 style={{ color: '#0f172a', margin: '0 0 10px 0' }}>Invalid QR Code</h2>
          <p style={{ color: '#64748b' }}>{error}</p>
          <Link to="/" style={{ display: 'inline-block', marginTop: '20px', padding: '12px 24px', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Return Home</Link>
        </div>
      </div>
    );
  }

  const used = data.total_quantity - data.remaining_quantity;
  const percentage = Math.min(100, Math.max(0, (used / data.total_quantity) * 100));
  
  const isExpired = data.expiry_date && new Date(data.expiry_date) < new Date();
  const isActive = data.status === 'ACTIVE' && data.remaining_quantity > 0 && !isExpired;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(16px)', 
        borderRadius: '30px', 
        padding: '40px 30px', 
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.3)', 
        maxWidth: '450px', 
        width: '100%',
        animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Header Badge */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: isActive ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)' }}></div>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', letterSpacing: '-0.5px' }}>{data.package_name}</h1>
          <div style={{ display: 'inline-block', padding: '6px 14px', background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#059669' : '#dc2626', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {isActive ? '● Active' : '● Inactive'}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '30px' }}>
          <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Total Items</div>
            <div style={{ fontSize: '1.8rem', color: '#1e293b', fontWeight: '900' }}>{data.total_quantity}</div>
          </div>
          <div style={{ background: isActive ? '#eff6ff' : '#fef2f2', padding: '16px', borderRadius: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: isActive ? '#3b82f6' : '#ef4444', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Remaining</div>
            <div style={{ fontSize: '1.8rem', color: isActive ? '#1d4ed8' : '#b91c1c', fontWeight: '900' }}>{data.remaining_quantity}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>
            <span>Usage Progress</span>
            <span>{used} / {data.total_quantity} Used</span>
          </div>
          <div style={{ height: '14px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ 
              height: '100%', 
              width: `${percentage}%`, 
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', 
              borderRadius: '10px',
              transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
            }}></div>
          </div>
        </div>

        <div style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: '12px' }}>
            <span style={{ color: '#64748b', fontWeight: '600' }}>Package Valid Until:</span>
            <span style={{ color: '#0f172a', fontWeight: '800' }}>{data.expiry_date ? new Date(data.expiry_date).toLocaleDateString() : 'No Expiry'}</span>
          </div>
        </div>

        {/* Usage History */}
        {data.usage_history && data.usage_history.length > 0 ? (
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Usage History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.usage_history.slice(0, 4).map((h: any) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>Order #{h.order_id}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>{new Date(h.used_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontWeight: '900', color: '#ef4444', fontSize: '1.1rem' }}>
                    -{h.quantity_used}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            No usage history recorded yet.
          </div>
        )}

      </div>
      
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
