import React, { useState, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function PrepaidPackagesManager({ token, db }: { token: string, db: any }) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/prepaid-packages/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      alert("Please select at least one eligible service.");
      return;
    }
    
    try {
      const res = await fetch(`${BASE_URL}/api/v1/prepaid-packages/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          code,
          description,
          original_price: parseFloat(originalPrice),
          offer_price: parseFloat(offerPrice),
          total_quantity: parseInt(totalQuantity),
          validity_days: parseInt(validityDays) || null,
          eligible_services: selectedServices,
          is_active: true
        })
      });
      if (res.ok) {
        alert("Prepaid package created successfully!");
        setShowForm(false);
        fetchPackages();
        // Reset
        setName(''); setCode(''); setDescription('');
        setOriginalPrice(''); setOfferPrice(''); setTotalQuantity('');
        setValidityDays(''); setSelectedServices([]);
      } else {
        const err = await res.json();
        alert("Failed to create package: " + (err.detail || JSON.stringify(err)));
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    }
  };

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(prev => prev.filter(s => s !== id));
    } else {
      setSelectedServices(prev => [...prev, id]);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Prepaid Subscription Packages</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ Create New Package'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
          <h3>Create Package</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Package Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Package Code</label>
              <input required value={code} onChange={e => setCode(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Original Price (QR)</label>
              <input required type="number" step="0.01" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Offer Price (QR)</label>
              <input required type="number" step="0.01" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Total Quantity (Items)</label>
              <input required type="number" value={totalQuantity} onChange={e => setTotalQuantity(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Validity (Days)</label>
              <input required type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} placeholder="e.g. 30" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Eligible Services</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              {db.services?.map((s: any) => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: selectedServices.includes(s.id) ? '#dbeafe' : '#f1f5f9', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={() => toggleService(s.id)} />
                  {s.name} ({s.category})
                </label>
              ))}
            </div>
          </div>

          <button type="submit" style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            Save Package
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {packages.map(p => (
          <div key={p.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {p.name} <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#64748b' }}>{p.code}</span>
              </h3>
              <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '0.9rem' }}>{p.description}</p>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#334155' }}>
                <span>📦 {p.total_quantity} Items</span>
                <span>⏱ {p.validity_days} Days</span>
                <span>🏷 <strike style={{ color: '#94a3b8' }}>QR {p.original_price}</strike> <strong style={{ color: '#059669' }}>QR {p.offer_price}</strong></span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Eligible Services</div>
              <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.eligible_services.length} Selected</div>
            </div>
          </div>
        ))}
        {packages.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
            No prepaid packages defined yet.
          </div>
        )}
      </div>
    </div>
  );
}
