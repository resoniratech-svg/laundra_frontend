import React, { useState, useEffect } from 'react';

import { getApiBaseUrl } from './config';

const BASE_URL = getApiBaseUrl();

export default function PrepaidPackagesManager({ token, db, services }: { token: string, db: any, services: any[] }) {
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
  const [isActive, setIsActive] = useState(true);
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  
  // Auto-calculate Original Price and Total Quantity
  useEffect(() => {
    let price = 0;
    let qty = 0;
    Object.keys(selectedServices).forEach(id => {
      const count = selectedServices[id];
      const s = services?.find((srv: any) => srv.id === id);
      if (s && count > 0) {
        price += (parseFloat(s.price) || 0) * count;
        qty += count;
      }
    });
    if (qty > 0) {
      setOriginalPrice(price.toFixed(2));
      setTotalQuantity(qty.toString());
    }
  }, [selectedServices, services]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'Pressing' | 'Wash & Press' | 'Dry Cleaning'>('Pressing');
  
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
    const activeServicesList = Object.keys(selectedServices)
      .filter(id => selectedServices[id] > 0)
      .map(id => {
        const srv = services?.find((s: any) => s.id === id);
        return {
          id,
          qty: selectedServices[id],
          price: srv ? parseFloat(srv.price) || 0 : 0
        };
      });

    if (activeServicesList.length === 0) {
      alert("Please select at least one eligible service.");
      return;
    }
    
    try {
      const url = editingId ? `${BASE_URL}/api/v1/prepaid-packages/${editingId}` : `${BASE_URL}/api/v1/prepaid-packages/`;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
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
          eligible_services: activeServicesList,
          is_active: isActive
        })
      });
      if (res.ok) {
        alert(`Prepaid package ${editingId ? 'updated' : 'created'} successfully!`);
        setShowForm(false);
        setEditingId(null);
        fetchPackages();
        // Reset
        setName(''); setCode(''); setDescription('');
        setOriginalPrice(''); setOfferPrice(''); setTotalQuantity('');
        setValidityDays(''); setSelectedServices({});
      } else {
        const err = await res.json();
        alert(`Failed to ${editingId ? 'update' : 'create'} package: ` + (err.detail || JSON.stringify(err)));
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    }
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setName(p.name);
    setCode(p.code);
    setDescription(p.description || '');
    setOriginalPrice(p.original_price?.toString() || '');
    setOfferPrice(p.offer_price?.toString() || '');
    setTotalQuantity(p.total_quantity?.toString() || '');
    setValidityDays(p.validity_days?.toString() || '');
    setIsActive(p.is_active !== false);
    
    const sel: Record<string, number> = {};
    if (p.eligible_services) {
      p.eligible_services.forEach((s: any) => {
        const id = typeof s === 'string' ? s : s.id;
        sel[id] = 1;
      });
    }
    setSelectedServices(sel);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/prepaid-packages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Package deleted successfully");
        fetchPackages();
      } else {
        alert("Failed to delete package");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting package");
    }
  };

  const toggleView = (id: string) => {
    if (viewingId === id) setViewingId(null);
    else setViewingId(id);
  };

  const updateServiceQty = (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedServices(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', width: '100%', boxSizing: 'border-box' }}>
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
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Status</label>
              <select 
                value={isActive ? "true" : "false"} 
                onChange={e => setIsActive(e.target.value === "true")}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }}
              >
                <option value="true">ACTIVE</option>
                <option value="false">INACTIVE</option>
              </select>
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '12px' }}>Eligible Services</label>
            
            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', overflowX: 'auto' }}>
              {(() => {
                const defaultCats = ['Pressing', 'Wash & Press', 'Dry Cleaning', 'Premium Services', 'Wash & Fold'];
                const customCats = (services || []).map((s: any) => s.category).filter(Boolean);
                const packageCategories = Array.from(new Set([...defaultCats, ...customCats]));
                return packageCategories.map((cat: any) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                        color: isActive ? '#2563eb' : '#64748b',
                        fontWeight: '800',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginBottom: '-2px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat === 'Pressing' ? '♨️' : cat === 'Wash & Press' ? '🌊' : cat === 'Dry Cleaning' ? '🧥' : cat === 'Premium Services' ? '👑' : '🏷️'} {cat}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Service Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {services?.filter((s: any) => activeCategory === 'All' || s.category === activeCategory).map((s: any) => {
                const count = selectedServices[s.id] || 0;
                const isSelected = count > 0;
                return (
                  <div 
                    key={s.id} 
                    onClick={() => { if (!isSelected) updateServiceQty(s.id, 1); }}
                    style={{ 
                      background: isSelected ? '#eff6ff' : 'white', 
                      border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`, 
                      borderRadius: '12px', 
                      padding: '12px', 
                      cursor: isSelected ? 'default' : 'pointer', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 4px 6px -1px rgba(59,130,246,0.2)' : 'none',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                      {s.name.includes('Shirt') ? '👔' : s.name.includes('Dress') || s.name.includes('Gown') ? '👗' : s.name.includes('Suit') ? '🧥' : s.name.includes('BedSheet') || s.name.includes('Linen') || s.name.includes('Blanket') ? '🛏️' : '👕'}
                    </div>
                    <div style={{ fontWeight: '700', color: isSelected ? '#1e40af' : '#334155', fontSize: '0.85rem', lineHeight: '1.2' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>QR {s.price || '0.00'}</div>
                    
                    {isSelected && (
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', borderRadius: '20px', padding: '4px' }}>
                        <button 
                          type="button" 
                          onClick={(e) => updateServiceQty(s.id, -1, e)}
                          style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'white', color: '#3b82f6', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >-</button>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', minWidth: '16px' }}>{count}</span>
                        <button 
                          type="button" 
                          onClick={(e) => updateServiceQty(s.id, 1, e)}
                          style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'white', color: '#3b82f6', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {services?.filter((s: any) => s.category === activeCategory).length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>
                No services found in {activeCategory} category.
              </div>
            )}
          </div>

          <button type="submit" style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            Save Package
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {packages.map(p => (
          <div key={p.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>{p.eligible_services.length} Selected</div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => toggleView(p.id)}
                    style={{ padding: '6px 12px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    {viewingId === p.id ? 'Hide' : 'View'}
                  </button>
                  <button 
                    onClick={() => handleEdit(p)}
                    style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded View */}
            {viewingId === p.id && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Package Details</div>
                    <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>{p.name} <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 'normal' }}>({p.code})</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Offer Price</div>
                    <div style={{ fontWeight: '900', color: '#059669', fontSize: '1.2rem' }}>QR {p.offer_price}</div>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#334155' }}>Included Services:</h4>
                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <tr>
                        <th style={{ padding: '10px 16px', color: '#475569', fontWeight: '600' }}>Service</th>
                        <th style={{ padding: '10px 16px', color: '#475569', fontWeight: '600' }}>Category</th>
                        <th style={{ padding: '10px 16px', color: '#475569', fontWeight: '600', textAlign: 'center' }}>Quantity</th>
                        <th style={{ padding: '10px 16px', color: '#475569', fontWeight: '600', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.eligible_services?.map((s: any, idx: number) => {
                        const sId = typeof s === 'string' ? s : s.id;
                        const sQty = typeof s === 'string' ? 1 : (s.qty || 1);
                        const foundService = services?.find(srv => srv.id === sId);
                        
                        if (!foundService) return null; // Skip unknown services

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 16px', fontWeight: '600', color: '#1e293b' }}>{foundService.name}</td>
                            <td style={{ padding: '10px 16px', color: '#64748b' }}>
                              {foundService.category ? (
                                <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{foundService.category}</span>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '10px 16px', color: '#4f46e5', fontWeight: 'bold', textAlign: 'center' }}>
                              <span style={{ background: '#e0e7ff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{sQty}x</span>
                            </td>
                            <td style={{ padding: '10px 16px', color: '#64748b', textAlign: 'right', fontWeight: '500' }}>QR {(parseFloat(foundService.price) * sQty).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {(!p.eligible_services || p.eligible_services.length === 0) && (
                        <tr>
                          <td colSpan={4} style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>No specific services selected.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
