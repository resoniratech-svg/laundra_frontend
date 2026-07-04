import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, type Company } from './DatabaseContext';

interface Ticket {
  id: string;
  company: string;
  subject: string;
  status: 'Open' | 'Closed';
  date: string;
  message: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

interface AuditLog {
  id: string;
  action: string;
  description: string;
  date: string;
}

export const SuperAdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { db, createCompany, deleteCompany, updateCompany } = useDatabase();
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies' | 'subscriptions' | 'features' | 'tickets' | 'announcements' | 'audit' | 'settings'>('dashboard');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompSlug, setNewCompSlug] = useState('');
  const [newCompAdminEmail, setNewCompAdminEmail] = useState('');
  const [newCompAdminPass, setNewCompAdminPass] = useState('');

  // Password editing state
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminPass, setEditAdminPass] = useState('');

  // Subscription editing state
  const [subComp, setSubComp] = useState<Company | null>(null);
  const [subTier, setSubTier] = useState<'Free Trial' | 'Premium' | 'Enterprise'>('Free Trial');
  const [subStatus, setSubStatus] = useState<'Active' | 'Expired'>('Active');
  const [subExpires, setSubExpires] = useState('');

  // Local storage mock tables states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Announcements form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Support ticket form
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCompany, setTicketCompany] = useState('Laundra HQ');

  // Global platform settings
  const [platformName, setPlatformName] = useState('Laundra Platform');
  const [supportEmail, setSupportEmail] = useState('support@laundra.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [stripeKey, setStripeKey] = useState('sk_test_51N...');
  const [twilioSid, setTwilioSid] = useState('AC...');

  // System Health mock state
  const [systemLoad, setSystemLoad] = useState({ cpu: 2.1, ram: 42, activeSockets: 18 });

  // Security Check
  useEffect(() => {
    const session = localStorage.getItem('ll_super_admin_session');
    if (session !== 'active') {
      alert('Access Denied. Please log in as Super Admin.');
      navigate('/');
    }
  }, [navigate]);

  // Load mock datasets
  useEffect(() => {
    // 1. Tickets
    const savedTickets = localStorage.getItem('ll_platform_tickets');
    if (savedTickets) {
      setTickets(JSON.parse(savedTickets));
    } else {
      const initialTickets: Ticket[] = [
        { id: 'tkt-1', company: 'Laundra HQ', subject: 'Stripe Webhook Issue', status: 'Open', date: '2026-07-04', message: 'Stripe webhook responses are taking over 5 seconds. Please investigate.' },
        { id: 'tkt-2', company: 'bhanu company', subject: 'SMS Alerts configuration', status: 'Closed', date: '2026-07-03', message: 'How do we enable SMS delivery notifications?' }
      ];
      localStorage.setItem('ll_platform_tickets', JSON.stringify(initialTickets));
      setTickets(initialTickets);
    }

    // 2. Announcements
    const savedAnn = localStorage.getItem('ll_platform_announcements');
    if (savedAnn) {
      setAnnouncements(JSON.parse(savedAnn));
    } else {
      const initialAnn: Announcement[] = [
        { id: 'ann-1', title: 'Platform Engine Upgrade v2.5', content: 'We are upgrading the core analytics engine tonight at 3:00 AM UTC. Expect brief service blips.', date: '2026-07-04' }
      ];
      localStorage.setItem('ll_platform_announcements', JSON.stringify(initialAnn));
      setAnnouncements(initialAnn);
    }

    // 3. Audit Logs
    const savedLogs = localStorage.getItem('ll_platform_audit_logs');
    if (savedLogs) {
      setAuditLogs(JSON.parse(savedLogs));
    } else {
      const initialLogs: AuditLog[] = [
        { id: 'log-1', action: 'BOOT', description: 'System loaded default multi-tenant console', date: '2026-07-04 10:15:30' }
      ];
      localStorage.setItem('ll_platform_audit_logs', JSON.stringify(initialLogs));
      setAuditLogs(initialLogs);
    }

    // 4. Global Settings
    const savedSettings = localStorage.getItem('ll_platform_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setPlatformName(parsed.platformName || 'Laundra Platform');
      setSupportEmail(parsed.supportEmail || 'support@laundra.com');
      setMaintenanceMode(!!parsed.maintenanceMode);
      setStripeKey(parsed.stripeKey || 'sk_test_51N...');
      setTwilioSid(parsed.twilioSid || 'AC...');
    }
  }, []);

  // System Health fluctuations mock
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemLoad({
        cpu: parseFloat((1.5 + Math.random() * 2).toFixed(1)),
        ram: Math.floor(38 + Math.random() * 8),
        activeSockets: Math.floor(15 + Math.random() * 6)
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('ll_super_admin_session');
    navigate('/');
  };

  const addAuditLog = (action: string, description: string) => {
    const newLog: AuditLog = {
      id: 'log-' + (auditLogs.length + 1) + '-' + Math.floor(Math.random() * 100),
      action,
      description,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    const nextLogs = [newLog, ...auditLogs];
    setAuditLogs(nextLogs);
    localStorage.setItem('ll_platform_audit_logs', JSON.stringify(nextLogs));
  };

  // Create Announcement
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    const newAnn: Announcement = {
      id: 'ann-' + (announcements.length + 1),
      title: annTitle.trim(),
      content: annContent.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    const nextAnn = [newAnn, ...announcements];
    setAnnouncements(nextAnn);
    localStorage.setItem('ll_platform_announcements', JSON.stringify(nextAnn));
    addAuditLog('ANNOUNCEMENT_CREATE', `Published announcement: "${newAnn.title}"`);
    setAnnTitle('');
    setAnnContent('');
    alert('Announcement published successfully to all tenant stores!');
  };

  // Submit Support Ticket Mock
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    const newTicket: Ticket = {
      id: 'tkt-' + (tickets.length + 1) + '-' + Math.floor(100 + Math.random() * 900),
      company: ticketCompany,
      subject: ticketSubject.trim(),
      status: 'Open',
      date: new Date().toISOString().split('T')[0],
      message: ticketMessage.trim()
    };

    const nextTickets = [newTicket, ...tickets];
    setTickets(nextTickets);
    localStorage.setItem('ll_platform_tickets', JSON.stringify(nextTickets));
    setTicketSubject('');
    setTicketMessage('');
    alert('Support ticket submitted successfully!');
  };

  // Resolve Ticket
  const handleResolveTicket = (ticketId: string) => {
    const nextTickets = tickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: 'Closed' as const };
      }
      return t;
    });
    setTickets(nextTickets);
    localStorage.setItem('ll_platform_tickets', JSON.stringify(nextTickets));
    addAuditLog('TICKET_RESOLVE', `Closed ticket ID: ${ticketId}`);
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { platformName, supportEmail, maintenanceMode, stripeKey, twilioSid };
    localStorage.setItem('ll_platform_settings', JSON.stringify(payload));
    addAuditLog('SETTINGS_UPDATE', 'Updated global developer configurations');
    alert('Global settings saved successfully!');
  };

  // Backup localStorage
  const handleDownloadBackup = () => {
    const backupData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ll_')) {
        backupData[key] = localStorage.getItem(key) || '';
      }
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laundra_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    addAuditLog('BACKUP_DOWNLOAD', 'Exported local storage JSON database dump');
  };

  // Restore localStorage
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("Are you sure you want to restore? This will overwrite your current local storage database!")) {
          // Clear current keys starting with ll_
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ll_')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          
          // Restore new keys
          Object.entries(data).forEach(([key, val]) => {
            localStorage.setItem(key, val as string);
          });
          alert("Database restored successfully! Reloading page...");
          window.location.reload();
        }
      } catch (err) {
        alert("Invalid backup file format!");
      }
    };
    reader.readAsText(file);
  };

  // Handle Create Company Submit
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

    if (db.companies.some(c => c.slug === slug)) {
      alert('A company with this Slug/Subdomain already exists!');
      return;
    }

    createCompany(name, slug, email, pass);
    addAuditLog('COMPANY_CREATE', `Created company "${name}" (slug: ${slug})`);
    
    setNewCompName('');
    setNewCompSlug('');
    setNewCompAdminEmail('');
    setNewCompAdminPass('');
    setShowAddModal(false);
    alert(`Laundry Company "${name}" has been created successfully!`);
  };

  // Handle Edit Admin Credentials
  const handleEditAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    // Update the company object adminEmail
    updateCompany(editingCompany.id, { adminEmail: editAdminEmail.trim().toLowerCase() });

    // Update the actual user record inside that company's user catalog
    const usersKey = `ll_${editingCompany.id}_users`;
    const savedUsers = localStorage.getItem(usersKey);
    if (savedUsers) {
      const parsed = JSON.parse(savedUsers);
      const updated = parsed.map((u: any) => {
        if (u.role === 'admin') {
          return { ...u, email: editAdminEmail.trim().toLowerCase(), password: editAdminPass };
        }
        return u;
      });
      localStorage.setItem(usersKey, JSON.stringify(updated));
    }

    addAuditLog('COMPANY_ADMIN_EDIT', `Updated admin credentials for company: ${editingCompany.name}`);
    setEditingCompany(null);
    alert('Company Admin credentials updated successfully!');
  };

  // Toggle company suspension status
  const handleToggleSuspension = (company: Company) => {
    const nextStatus = company.status === 'Suspended' ? 'Active' as const : 'Suspended' as const;
    updateCompany(company.id, { status: nextStatus });
    addAuditLog('COMPANY_STATUS_TOGGLE', `Changed company status of "${company.name}" to ${nextStatus}`);
  };

  // Handle Subscription Change Submit
  const handleSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subComp) return;

    updateCompany(subComp.id, {
      subscription: {
        tier: subTier,
        status: subStatus,
        expiresAt: subExpires
      }
    });

    addAuditLog('SUBSCRIPTION_UPDATE', `Updated subscription of "${subComp.name}" to Tier: ${subTier}, Status: ${subStatus}`);
    setSubComp(null);
    alert(`Subscription for "${subComp.name}" has been updated successfully!`);
  };

  // Toggle Feature Flag Permission
  const handleToggleFeature = (companyId: string, featureKey: 'expressWash' | 'expenses' | 'promos' | 'deliveryOperations') => {
    const company = db.companies.find(c => c.id === companyId);
    if (!company) return;

    const nextFeatures = { ...company.features, [featureKey]: !company.features[featureKey] };
    updateCompany(companyId, { features: nextFeatures });
    addAuditLog('FEATURE_TOGGLE', `Toggled feature flag "${featureKey}" to ${nextFeatures[featureKey]} for company: ${company.name}`);
  };

  // Local Storage Usage calculation
  const getLocalStorageUsage = () => {
    let total = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += ((localStorage[x] || '').length + x.length) * 2;
      }
    }
    return (total / 1024).toFixed(2); // KB
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Sidebar navigation */}
      <aside style={{ width: '260px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌐</span> Super Admin
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Central Console</p>
        </div>

        <ul style={{ listStyle: 'none', padding: '20px 16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          {[
            { id: 'dashboard', label: 'Stats Dashboard', icon: '📊' },
            { id: 'companies', label: 'Company Management', icon: '🏢' },
            { id: 'subscriptions', label: 'Subscription Manager', icon: '💳' },
            { id: 'features', label: 'Feature Permissions', icon: '⚙️' },
            { id: 'tickets', label: 'Support & Tickets', icon: '💬' },
            { id: 'announcements', label: 'Announcements', icon: '📢' },
            { id: 'audit', label: 'Audit Logs', icon: '📜' },
            { id: 'settings', label: 'Global Settings', icon: '⚙️' }
          ].map(tab => (
            <li 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.88rem',
                color: activeTab === tab.id ? 'white' : '#475569',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s'
              }}
            >
              <span>{tab.icon}</span> <span>{tab.label}</span>
            </li>
          ))}
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

      {/* Main View Area */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
              {activeTab === 'dashboard' && 'Platform Overview & Health'}
              {activeTab === 'companies' && 'Company Lifecycle Management'}
              {activeTab === 'subscriptions' && 'Tenant Subscriptions & Billing'}
              {activeTab === 'features' && 'Feature Permissions Toggles'}
              {activeTab === 'tickets' && 'Support Tickets Portal'}
              {activeTab === 'announcements' && 'Global Broadcast Announcements'}
              {activeTab === 'audit' && 'System Audit Trails'}
              {activeTab === 'settings' && 'Global Platform Configurations'}
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              {activeTab === 'dashboard' && 'Aggregated developer diagnostics and system performance metrics.'}
              {activeTab === 'companies' && 'Suspend, reactivate, delete, or manage logins for tenant companies.'}
              {activeTab === 'subscriptions' && 'Upgrade tiers, manage expirations, and configure billing rules.'}
              {activeTab === 'features' && 'Granular module toggling (Express Wash, Expenses, Promos, Deliveries).'}
              {activeTab === 'tickets' && 'View, address, and close customer service tickets.'}
              {activeTab === 'announcements' && 'Publish alerts that appear in all store admin dashboards.'}
              {activeTab === 'audit' && 'Security event logging and administrator action trail.'}
              {activeTab === 'settings' && 'Developer credentials, payment configurations, and backup tools.'}
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

        {/* TAB: DASHBOARD / SYSTEM HEALTH */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
              <div className="card-premium" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>🏢</div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Active Companies</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>
                    {db.companies.filter(c => c.status === 'Active').length} / {db.companies.length}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB: COMPANIES (LIFECYCLE) */}
        {activeTab === 'companies' && (
          <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '0 20px' }}>
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>ID</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Company Name</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Admin Email</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Status</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.companies.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 12px', fontWeight: '700', color: '#64748b' }}>{c.id}</td>
                      <td style={{ padding: '16px 12px', fontWeight: '700', color: '#1e293b' }}>{c.name}</td>
                      <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem' }}>{c.adminEmail}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          background: c.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                          color: c.status === 'Active' ? '#16a34a' : '#ef4444'
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          onClick={() => {
                            setEditingCompany(c);
                            setEditAdminEmail(c.adminEmail);
                            setEditAdminPass('');
                          }}
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '700', color: '#2563eb', background: '#eff6ff', border: '1.5px solid #dbeafe', cursor: 'pointer' }}
                        >
                          ✏️ Edit Admin
                        </button>
                        
                        {c.id !== 'comp-default' && (
                          <>
                            <button 
                              onClick={() => handleToggleSuspension(c)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                fontWeight: '700',
                                color: c.status === 'Suspended' ? '#16a34a' : '#d97706',
                                background: c.status === 'Suspended' ? '#f0fdf4' : '#fffbeb',
                                border: c.status === 'Suspended' ? '1.5px solid #bbf7d0' : '1.5px solid #fef3c7',
                                cursor: 'pointer'
                              }}
                            >
                              {c.status === 'Suspended' ? '🔓 Activate' : '🔒 Suspend'}
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`Are you absolutely sure you want to delete company "${c.name}"? This deletes all data permanently!`)) {
                                  deleteCompany(c.id);
                                }
                              }}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '700', color: '#ef4444', background: '#fef2f2', border: '1.5px solid #fee2e2', cursor: 'pointer' }}
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '0 20px' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Company</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Subscription Tier</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Expires At</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.companies.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 12px', fontWeight: '700', color: '#1e293b' }}>{c.name}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        background: c.subscription?.tier === 'Enterprise' ? '#faf5ff' : c.subscription?.tier === 'Premium' ? '#f0f9ff' : '#f1f5f9',
                        color: c.subscription?.tier === 'Enterprise' ? '#7c3aed' : c.subscription?.tier === 'Premium' ? '#0284c7' : '#475569'
                      }}>
                        ⭐ {c.subscription?.tier}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        background: c.subscription?.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                        color: c.subscription?.status === 'Active' ? '#16a34a' : '#ef4444'
                      }}>
                        {c.subscription?.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.88rem' }}>{c.subscription?.expiresAt}</td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => {
                          setSubComp(c);
                          setSubTier(c.subscription?.tier || 'Free Trial');
                          setSubStatus(c.subscription?.status || 'Active');
                          setSubExpires(c.subscription?.expiresAt || '');
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '700', color: '#2563eb', background: '#eff6ff', border: '1.5px solid #dbeafe', cursor: 'pointer' }}
                      >
                        💳 Upgrade / Renew
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: FEATURE PERMISSIONS */}
        {activeTab === 'features' && (
          <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '0 20px' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Company</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Express Wash Module</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Expenses Management</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Promo Codes</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Delivery Operations</th>
                </tr>
              </thead>
              <tbody>
                {db.companies.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 12px', fontWeight: '700', color: '#1e293b' }}>{c.name}</td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={!!c.features?.expressWash} 
                        onChange={() => handleToggleFeature(c.id, 'expressWash')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={!!c.features?.expenses} 
                        onChange={() => handleToggleFeature(c.id, 'expenses')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={!!c.features?.promos} 
                        onChange={() => handleToggleFeature(c.id, 'promos')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={!!c.features?.deliveryOperations} 
                        onChange={() => handleToggleFeature(c.id, 'deliveryOperations')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: SUPPORT TICKETS */}
        {activeTab === 'tickets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Create Mock Ticket (Simulate user submitting ticket) */}
            <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800' }}>Simulate Support Ticket Submission</h3>
              <form onSubmit={handleCreateTicket} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Select Company</label>
                  <select 
                    value={ticketCompany} 
                    onChange={(e) => setTicketCompany(e.target.value)} 
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                  >
                    {db.companies.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Subject</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Printer Configuration" 
                    value={ticketSubject} 
                    onChange={(e) => setTicketSubject(e.target.value)} 
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Message Description</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Brief description of the problem..." 
                    value={ticketMessage} 
                    onChange={(e) => setTicketMessage(e.target.value)} 
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                  />
                </div>
                <button type="submit" style={{ padding: '11px 20px', borderRadius: '8px', background: '#1e3a8a', color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer' }}>Submit Ticket</button>
              </form>
            </div>

            {/* Tickets Table */}
            <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '0 20px' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>ID</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Company</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Subject</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Date</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Status</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 12px', fontWeight: '700', color: '#64748b' }}>{t.id}</td>
                      <td style={{ padding: '16px 12px', fontWeight: '700', color: '#1e293b' }}>{t.company}</td>
                      <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.88rem' }}>
                        <div style={{ fontWeight: '600' }}>{t.subject}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>{t.message}</div>
                      </td>
                      <td style={{ padding: '16px 12px', color: '#64748b', fontSize: '0.85rem' }}>{t.date}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          background: t.status === 'Open' ? '#fffbeb' : '#f0fdf4',
                          color: t.status === 'Open' ? '#d97706' : '#16a34a'
                        }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        {t.status === 'Open' ? (
                          <button 
                            onClick={() => handleResolveTicket(t.id)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '700', color: '#16a34a', background: '#f0fdf4', border: '1.5px solid #bbf7d0', cursor: 'pointer' }}
                          >
                            ✓ Mark Resolved
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Create Announcement */}
            <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800' }}>Broadcast Platform Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Announcement Title</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Maintenance Mode Notice" 
                    value={annTitle} 
                    onChange={(e) => setAnnTitle(e.target.value)} 
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Content Body</label>
                  <textarea 
                    required 
                    rows={4}
                    placeholder="Write details of announcement here..." 
                    value={annContent} 
                    onChange={(e) => setAnnContent(e.target.value)} 
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'inherit' }}
                  />
                </div>
                <button type="submit" style={{ width: 'fit-content', padding: '10px 24px', borderRadius: '8px', background: '#2563eb', color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer' }}>Broadcast Announcement</button>
              </form>
            </div>

            {/* Announcements List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {announcements.map(ann => (
                <div key={ann.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: '#1e3a8a', fontWeight: '800', fontSize: '1rem' }}>{ann.title}</h4>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{ann.date}</span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>{ann.content}</p>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '0 20px' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Timestamp</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Action Event</th>
                  <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>Event Description</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 12px', color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.date}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        background: '#f1f5f9',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        color: '#0f172a',
                        fontFamily: 'monospace'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem' }}>{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: GLOBAL SETTINGS & BACKUP */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Backup & Database Tools */}
            <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800' }}>Platform Database Backup & Restore</h3>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleDownloadBackup}
                  style={{ padding: '12px 24px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  📥 Export JSON Backup
                </button>
                <label 
                  style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'inline-block' }}
                >
                  📤 Upload & Restore Backup
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleRestoreBackup} 
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <p style={{ margin: '12px 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                * Overwrites the client-side database context state mapping. Always download a backup before performing a restore.
              </p>
            </div>

            {/* Config Form */}
            <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800' }}>Developer Configurations</h3>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Platform Name</label>
                    <input 
                      type="text" 
                      value={platformName} 
                      onChange={(e) => setPlatformName(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Support System Email</label>
                    <input 
                      type="email" 
                      value={supportEmail} 
                      onChange={(e) => setSupportEmail(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Stripe Secret key (Mock)</label>
                    <input 
                      type="text" 
                      value={stripeKey} 
                      onChange={(e) => setStripeKey(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Twilio SID (Mock)</label>
                    <input 
                      type="text" 
                      value={twilioSid} 
                      onChange={(e) => setTwilioSid(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="maintenanceCheck"
                    checked={maintenanceMode} 
                    onChange={(e) => setMaintenanceMode(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="maintenanceCheck" style={{ fontWeight: '700', fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer' }}>
                    ⚠️ Toggle Maintenance Mode (Blocks all tenant interfaces)
                  </label>
                </div>

                <button type="submit" style={{ width: 'fit-content', padding: '10px 24px', borderRadius: '8px', background: '#1e3a8a', color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                  Save Developer Config
                </button>
              </form>
            </div>

          </div>
        )}

      </main>

      {/* MODAL: CREATE COMPANY */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Create Laundry Company</h3>
              <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
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
                    setNewCompSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                  }}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
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
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
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
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
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
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Create Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ADMIN CREDENTIALS */}
      {editingCompany && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Edit Admin Details: {editingCompany.name}</h3>
              <button onClick={() => setEditingCompany(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleEditAdminSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Admin Email Address</label>
                <input 
                  type="email" 
                  required
                  value={editAdminEmail}
                  onChange={(e) => setEditAdminEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>New Admin Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Set new admin password..."
                  value={editAdminPass}
                  onChange={(e) => setEditAdminPass(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingCompany(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Update Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPGRADE / RENEW SUBSCRIPTION */}
      {subComp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Manage Subscription: {subComp.name}</h3>
              <button onClick={() => setSubComp(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleSubSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Subscription Tier</label>
                <select 
                  value={subTier} 
                  onChange={(e) => setSubTier(e.target.value as any)} 
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '600' }}
                >
                  <option value="Free Trial">Free Trial (30 Days)</option>
                  <option value="Premium">Premium tier</option>
                  <option value="Enterprise">Enterprise tier</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Status</label>
                <select 
                  value={subStatus} 
                  onChange={(e) => setSubStatus(e.target.value as any)} 
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '600' }}
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Expiration Date</label>
                <input 
                  type="date" 
                  required
                  value={subExpires}
                  onChange={(e) => setSubExpires(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSubComp(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
