import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useDatabase } from '../DatabaseContext';

import { getApiBaseUrl } from '../config';

interface Props {
  companyId: string;
}

export const ServiceCatalogUploader: React.FC<Props> = ({ companyId }) => {
  const { db, setItems, setServiceTypes, setServiceVariants, setItemPrices } = useDatabase();
  const BASE_URL = getApiBaseUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  // Catalog manager state
  const [services, setServices] = useState<any[]>([]);
  const [fetchingServices, setFetchingServices] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / forms state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Pressing');
  const [formPrice, setFormPrice] = useState('');
  const [formExpressPrice, setFormExpressPrice] = useState('');

  const fetchServices = async () => {
    setFetchingServices(true);
    try {
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data);

        // Sync with DatabaseContext
        const syncedItems: any[] = [];
        const syncedServiceTypes: any[] = [];
        const syncedServiceVariants: any[] = [];
        const syncedItemPrices: any[] = [];

        const otherItems = db.items.filter(i => i.companyId !== companyId);
        const otherServiceTypes = db.serviceTypes.filter(st => st.companyId !== companyId);
        const companyTypeIds = db.serviceTypes.filter(st => st.companyId === companyId).map(st => st.id);
        const otherServiceVariants = db.serviceVariants.filter(sv => !companyTypeIds.includes(sv.serviceTypeId));
        const otherItemPrices = db.itemPrices.filter(ip => ip.companyId !== companyId);

        const itemMap = new Map();
        const typeMap = new Map();

        data.forEach((s: any) => {
          const itemKey = s.name.trim().toLowerCase();
          let itemId = itemMap.get(itemKey);
          if (!itemId) {
            itemId = `item-${companyId}-${itemKey.replace(/\s+/g, '-')}`;
            itemMap.set(itemKey, itemId);
            syncedItems.push({
              id: itemId,
              companyId,
              englishName: s.name,
              arabicName: s.name,
              status: 'Active'
            });
          }

          const catKey = s.category.trim().toLowerCase();
          let typeId = typeMap.get(catKey);
          if (!typeId) {
            typeId = `st-${companyId}-${catKey.replace(/\s+/g, '-')}`;
            typeMap.set(catKey, typeId);
            syncedServiceTypes.push({
              id: typeId,
              companyId,
              name: s.category
            });

            syncedServiceVariants.push({
              id: `sv-${typeId}-normal`,
              serviceTypeId: typeId,
              name: 'Normal'
            });
            syncedServiceVariants.push({
              id: `sv-${typeId}-express`,
              serviceTypeId: typeId,
              name: 'Express'
            });
          }

          if (s.price !== null && s.price !== undefined) {
            syncedItemPrices.push({
              id: `ip-${itemId}-normal`,
              companyId,
              itemId,
              serviceVariantId: `sv-${typeId}-normal`,
              price: parseFloat(s.price)
            });
          }

          if (s.express_price !== null && s.express_price !== undefined) {
            syncedItemPrices.push({
              id: `ip-${itemId}-express`,
              companyId,
              itemId,
              serviceVariantId: `sv-${typeId}-express`,
              price: parseFloat(s.express_price)
            });
          }
        });

        setItems([...otherItems, ...syncedItems]);
        setServiceTypes([...otherServiceTypes, ...syncedServiceTypes]);
        setServiceVariants([...otherServiceVariants, ...syncedServiceVariants]);
        setItemPrices([...otherItemPrices, ...syncedItemPrices]);
      }
    } catch (e) {
      console.error('Failed to fetch services:', e);
    }
    setFetchingServices(false);
  };

  useEffect(() => {
    if (companyId) {
      fetchServices();
    }
  }, [companyId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];

        if (data.length < 2) {
          throw new Error('Excel file must contain headers and at least one row of data.');
        }
        setPreviewData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Error parsing Excel file.');
        setPreviewData(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    console.log('handleImport called. selectedFile:', selectedFile);
    if (!selectedFile) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('ll_auth_token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      console.log('Sending import request to:', `${BASE_URL}/api/v1/companies/${companyId}/services/import`);
      const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      console.log('Import request response status:', res.status);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      alert('Catalog imported successfully!');
      setPreviewData(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Force full page reload to refresh all database contexts cleanly
      window.location.reload();
    } catch (err: any) {
      console.error('Import failed:', err);
      alert(`Failed to import catalog: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          price: parseFloat(formPrice) || 0,
          express_price: formExpressPrice ? parseFloat(formExpressPrice) : null
        })
      });
      if (res.ok) {
        alert('Service added successfully!');
        setShowAddModal(false);
        setFormName('');
        setFormPrice('');
        setFormExpressPrice('');
        fetchServices();
      } else {
        const errText = await res.text();
        alert(`Error: ${errText}`);
      }
    } catch (e) {
      alert('Failed to add service');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          price: parseFloat(formPrice) || 0,
          express_price: formExpressPrice ? parseFloat(formExpressPrice) : null
        })
      });
      if (res.ok) {
        alert('Service updated successfully!');
        setEditingService(null);
        setFormName('');
        setFormPrice('');
        setFormExpressPrice('');
        fetchServices();
      } else {
        const errText = await res.text();
        alert(`Error: ${errText}`);
      }
    } catch (e) {
      alert('Failed to update service');
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this service from the catalog?')) return;
    try {
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services/${serviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Service deleted successfully!');
        fetchServices();
      } else {
        const errText = await res.text();
        alert(`Error: ${errText}`);
      }
    } catch (e) {
      alert('Failed to delete service');
    }
  };

  const openEditModal = (service: any) => {
    setEditingService(service);
    setFormName(service.name);
    setFormCategory(service.category);
    setFormPrice(service.price.toString());
    setFormExpressPrice(service.express_price ? service.express_price.toString() : '');
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setFormName('');
    setFormCategory('Pressing');
    setFormPrice('');
    setFormExpressPrice('');
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service_catalog_${companyId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('No service catalog items found to export.');
      }
    } catch (e) {
      alert('Failed to download catalog file');
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ─── UPLOADER COMPONENT ─── */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: '#0f172a' }}>
          <span>📊</span> Service Catalog Upload Engine
        </h3>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
              Upload an Excel file to import or update services. Existing prices will be updated, missing prices will be kept as NULL.
            </p>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ display: 'block', width: '100%', padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
            {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '10px', fontWeight: '700' }}>⚠️ {error}</div>}
          </div>

          <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Active Catalog</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#1e40af', marginTop: '4px' }}>{services.length} <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Services</span></div>
              </div>
              {services.length > 0 && (
                <button 
                  onClick={handleExport}
                  style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', transition: 'all 0.2s' }}
                >
                  📥 Download Excel File
                </button>
              )}
            </div>
          </div>
        </div>

        {previewData && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>👀 Preview Import</h4>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setPreviewData(null)} style={{ padding: '10px 16px', background: 'transparent', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleImport} disabled={loading} style={{ padding: '10px 24px', background: loading ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? '⌛ Importing...' : '✅ Confirm & Import'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── SERVICES MANAGER TABLE ─── */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>📋 Active Service Catalog</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Manage, edit, or delete items from the company catalog below.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="🔍 Search catalog..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', width: '220px' }}
            />
            <button onClick={openAddModal} style={{ padding: '8px 16px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ➕ Add Catalog Item
            </button>
          </div>
        </div>

        {fetchingServices ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>⌛ Loading catalog...</div>
        ) : filteredServices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
            No service catalog items found for this company. Upload an Excel file or click "Add Catalog Item" to get started!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Item Name</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Category</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Normal Price</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Express Price</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1e293b' }}>{s.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800', background: '#f0f9ff', color: '#0369a1', border: '1px solid #e0f2fe' }}>
                        {s.category}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: '#10b981' }}>
                      QR {parseFloat(s.price).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: '#f59e0b' }}>
                      {s.express_price !== null && s.express_price !== undefined ? `QR ${parseFloat(s.express_price).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button onClick={() => openEditModal(s)} style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>✏️ Edit</button>
                        <button onClick={() => handleDelete(s.id)} style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── ADD SERVICE MODAL ─── */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>➕ Add Manual Service</h3>
              <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Item Name</label>
                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="e.g. Jeans, Shirt, Blanket" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Category</label>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                  <option value="Pressing">Pressing</option>
                  <option value="Dry Cleaning">Dry Cleaning</option>
                  <option value="Wash & Press">Wash & Press</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Normal Price</label>
                  <input type="number" step="0.01" min="0" required value={formPrice} onChange={e => setFormPrice(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="0.00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Express Price</label>
                  <input type="number" step="0.01" min="0" value={formExpressPrice} onChange={e => setFormExpressPrice(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="Optional" />
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT SERVICE MODAL ─── */}
      {editingService && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>✏️ Edit Service</h3>
              <button onClick={() => setEditingService(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Item Name</label>
                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Category</label>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                  <option value="Pressing">Pressing</option>
                  <option value="Dry Cleaning">Dry Cleaning</option>
                  <option value="Wash & Press">Wash & Press</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Normal Price</label>
                  <input type="number" step="0.01" min="0" required value={formPrice} onChange={e => setFormPrice(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Express Price</label>
                  <input type="number" step="0.01" min="0" value={formExpressPrice} onChange={e => setFormExpressPrice(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" onClick={() => setEditingService(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
