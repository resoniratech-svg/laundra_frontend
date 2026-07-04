import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from './DatabaseContext';

export const SuperAdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { db, createCompany, deleteCompany } = useDatabase();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies'>('dashboard');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompSlug, setNewCompSlug] = useState('');
  const [newCompAdminEmail, setNewCompAdminEmail] = useState('');
  const [newCompAdminPass, setNewCompAdminPass] = useState('');

  // Authentication check
  useEffect(() => {
    const session = localStorage.getItem('ll_super_admin_session');
    if (session !== 'active') {
      alert('Access Denied. Please log in as Super Admin.');
      navigate('/');
    }
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem('ll_super_admin_session');
    navigate('/');
  };

  // Compute aggregate stats across all companies
  const getAggregateStats = () => {
    let totalOrders = 0;
    let totalRevenue = 0;

    db.companies.forEach(c => {
      const ordersKey = `ll_${c.id}_orders`;
      const savedOrders = localStorage.getItem(ordersKey);
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          totalOrders += parsed.length;
          parsed.forEach((o: any) => {
            totalRevenue += (o.totalAmount || o.total || 0);
          });
        } catch (e) {
          console.error(e);
        }
      } else if (c.id === 'comp-default') {
        const legacy = localStorage.getItem('ll_orders');
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            totalOrders += parsed.length;
            parsed.forEach((o: any) => {
              totalRevenue += (o.totalAmount || o.total || 0);
            });
          } catch (e) {
            console.error(e);
          }
        }
      }
    });

    return { totalOrders, totalRevenue };
  };

  const { totalOrders, totalRevenue } = getAggregateStats();

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCompName.trim();
    const slug = newCompSlug.toLowerCase().trim().replace(/\s+/g, '-');
    const email = newCompAdminEmail.trim().toLowerCase();
    const pass = newCompAdminPass;

    if (!name || !slug || !email || !pass) {
      alert('All fields are required!');
      return;
    }

    // Check slug uniqueness
    if (db.companies.some(c => c.slug === slug)) {
      alert('A company with this Slug/Subdomain already exists!');
      return;
    }

    createCompany(name, slug, email, pass);
    
    // Reset modal
    setNewCompName('');
    setNewCompSlug('');
    setNewCompAdminEmail('');
    setNewCompAdminPass('');
    setShowAddModal(false);
    alert(`Laundry Company "${name}" has been created successfully!`);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌐</span> Super Admin
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Central Console</p>
        </div>

        <ul style={{ listStyle: 'none', padding: '20px 16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <li 
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              color: activeTab === 'dashboard' ? 'white' : '#475569',
              background: activeTab === 'dashboard' ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s'
            }}
          >
            📊 <span>Stats Dashboard</span>
          </li>
          <li 
            onClick={() => setActiveTab('companies')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.88rem',
              color: activeTab === 'companies' ? 'white' : '#475569',
              background: activeTab === 'companies' ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s'
            }}
          >
            🏢 <span>Laundry Companies</span>
          </li>
        </ul>

        <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button 
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1.5px solid #ef4444',
              background: 'transparent',
              color: '#ef4444',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
              {activeTab === 'dashboard' ? 'Overview Statistics' : 'Manage Laundry Companies'}
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              {activeTab === 'dashboard' ? 'Aggregated system metrics across all registered companies.' : 'Create, update, and manage laundry company instances.'}
            </p>
          </div>
          {activeTab === 'companies' && (
            <button 
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ➕ Create Company
            </button>
          )}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              
              {/* Card 1 */}
              <div className="card-premium" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>🏢</div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Laundry Companies</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>{db.companies.length}</div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="card-premium" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>📦</div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Orders</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>{totalOrders}</div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="card-premium" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>💰</div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Revenue</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>QR {totalRevenue.toFixed(2)}</div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '0 20px' }}>
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>ID</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Company Name</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Slug / Subdomain</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Admin Email</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Date Created</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.companies.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 12px', fontWeight: '700', color: '#64748b' }}>{c.id}</td>
                      <td style={{ padding: '16px 12px', fontWeight: '700', color: '#1e293b' }}>{c.name}</td>
                      <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem' }}>
                        <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px', fontFamily: 'monospace' }}>{c.slug}</span>
                      </td>
                      <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem' }}>{c.adminEmail}</td>
                      <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem' }}>{c.createdAt}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        {c.id === 'comp-default' ? (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>System Default</span>
                        ) : (
                          <button 
                            onClick={() => {
                              if (confirm(`Are you absolutely sure you want to delete company "${c.name}"? This deletes all their services, orders, and users permanently!`)) {
                                deleteCompany(c.id);
                              }
                            }}
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '700', color: '#ef4444', background: '#fef2f2', border: '1.5px solid #fee2e2', cursor: 'pointer' }}
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* CREATE COMPANY MODAL */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Create Laundry Company</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Company Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. AquaClean Laundry"
                  value={newCompName}
                  onChange={(e) => {
                    setNewCompName(e.target.value);
                    // auto generate slug
                    setNewCompSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                  }}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Slug / Subdomain</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. aquaclean"
                  value={newCompSlug}
                  onChange={(e) => setNewCompSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Default Admin Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. admin@aquaclean.com"
                  value={newCompAdminEmail}
                  onChange={(e) => setNewCompAdminEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Default Admin Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={newCompAdminPass}
                  onChange={(e) => setNewCompAdminPass(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  Create Company
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
