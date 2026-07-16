import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../DatabaseContext';

interface PortalLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange: (mod: string) => void;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children, activeModule, onModuleChange }) => {
  const navigate = useNavigate();
  const { db, saveDB } = useDatabase();
  const [showNotifications, setShowNotifications] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState(activeModule === 'pos');

  React.useEffect(() => {
    setIsFullScreen(activeModule === 'pos');
  }, [activeModule]);

  React.useEffect(() => {
    const loadAdminCompany = async () => {
      const token = localStorage.getItem('ll_auth_token');
      if (token) {
        try {
          const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
          const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.tenant_id) {
              const compRes = await fetch(`${BASE_URL}/api/v1/companies/public`);
              if (compRes.ok) {
                const comps = await compRes.json();
                const matched = comps.find((c: any) => c.id === data.tenant_id);
                if (matched) setCompanyName(matched.name);
              }
            }
          }
        } catch (e) {
          console.error('Failed to load company for admin portal', e);
        }
      }
    };
    loadAdminCompany();
  }, []);

  // Role checking
  const role = db.activeRole;

  // Handle Logout
  const handleSignOut = () => {
    saveDB({
      activeRole: 'Admin',
      currentDeliveryBoy: null
    });
    localStorage.removeItem('ll_active_delivery_boy');
    localStorage.removeItem('ll_active_admin_module');
    localStorage.removeItem('ll_active_workspace');
    localStorage.removeItem('ll_active_customer_id');
    localStorage.removeItem(`ll_${db.activeCompanyId}_active_customer_id`);
    navigate('/');
  };

  // Toggle Theme
  const toggleTheme = () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', nextTheme);
    localStorage.setItem('ll_theme', nextTheme);
  };

  // Clear Notifications
  const clearNotifications = () => {
    saveDB({ notifications: [] });
  };

  // Sidebar brand name based on role
  const brandName = role === 'Admin' ? 'Manager Desk' : role === 'Delivery Staff' ? 'Delivery Portal' : `${role} Desk`;

  // Get active company context for feature checking
  const activeComp = db.companies.find(c => c.id === db.activeCompanyId);

  // Filter allowed modules based on Super Admin flags
  const isAllowed = (moduleId: string) => {
    if (!activeComp) return true;

    // Feature toggles
    if (moduleId === 'cashiers' && activeComp.features?.cashierModule === false) return false;
    if (moduleId === 'delivery-staff' && activeComp.features?.deliveryModule === false) return false;
    if (moduleId === 'expenses' && activeComp.features?.expenseModule === false) return false;
    if (moduleId === 'reports' && activeComp.features?.reports === false) return false;
    if (moduleId === 'coupons' && activeComp.features?.coupons === false) return false;
    if (moduleId === 'wallet-loyalty' && activeComp.features?.wallet === false && activeComp.features?.loyaltyProgram === false) return false;

    // Role-based restrictions
    if (role === 'Delivery Staff' || role === 'Delivery Boy') {
      return ['orders', 'announcements'].includes(moduleId);
    }
    if (db.activeRole === 'Cashier' || db.activeRole === 'cashier') {
      return ['dashboard', 'pos', 'customers', 'orders', 'wallet-loyalty', 'announcements'].includes(moduleId);
    }

    return true;
  };

  const titleMap: Record<string, string> = {
    'dashboard': 'Admin Dashboard',
    'pos': 'POS / New Order',
    'customers': 'Customer Management',
    'cashiers': 'Cashier Management',
    'delivery-staff': 'Delivery Staff Management',
    'delivery-payment': 'Delivery Payment Module',
    'services': 'Service Management',
    'orders': 'Order Management Engine',
    'coupons': 'Coupons Management',
    'wallet-loyalty': 'Customer Wallet & Loyalty Rewards',
    'expenses': 'Expenses Manager',
    'reports': 'Business Reports Engine',
    'announcements': 'Company Announcements',
    'reviews': 'Customer Reviews',
    'settings': 'Company Settings',
    'customer-support': 'Customer/Delivery Support',
    'audit-logs': 'Audit Activity Logs',
    'support': 'Platform Help & Support'
  };

  const currentTitle = titleMap[activeModule] || 'Manager Desk';

  // Sidebar tabs list matching exactly the required workflow
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'pos', label: 'POS / New Order', icon: '🛒' },
    { id: 'orders', label: 'Order Management', icon: '📦' },
    { id: 'customers', label: 'Customer Management', icon: '👥' },
    { id: 'cashiers', label: 'Cashier Management', icon: '🧑‍💼' },
    { id: 'delivery-staff', label: 'Delivery Staff', icon: '🚚' },
    { id: 'delivery-payment', label: 'Delivery Payments', icon: '💰' },
    { id: 'services', label: 'Service Management', icon: '🏷️' },
    { id: 'coupons', label: 'Coupons Manager', icon: '🎁' },
    { id: 'wallet-loyalty', label: 'Wallet & Loyalty', icon: '💳' },
    { id: 'expenses', label: 'Expenses Book', icon: '💸' },
    { id: 'reports', label: 'Business Reports', icon: '📊' },
    { id: 'announcements', label: 'Announcements', icon: '📢' },
    { id: 'reviews', label: 'Customer Reviews', icon: '⭐' },
    { id: 'customer-support', label: 'Customer/Delivery Support', icon: '🎧' },
    { id: 'audit-logs', label: 'Audit Activity Logs', icon: '📜' },
    { id: 'support', label: 'Help & Support', icon: '🎫' }
  ];

  return (
    <div className="workspace-wrapper active" id="workspacePanel" style={{ background: '#f8fafc' }}>
      
      {/* Top Workspace Header */}
      <div className="workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e3a8a', fontWeight: '800' }}>Operational Desk</h2>
          
          {activeModule === 'pos' && (
            <button 
              onClick={() => onModuleChange('dashboard')} 
              style={{ height: '36px', padding: '0 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', boxShadow: '0 2px 4px rgba(59,130,246,0.2)', transition: 'background 0.15s' }}
            >
              ⬅️ Back to Menu
            </button>
          )}
          
          {/* Branch Selector */}
          <select 
            value={db.activeBranch} 
            onChange={(e) => saveDB({ activeBranch: e.target.value })}
            className="header-select-btn" 
            style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="Downtown HQ">Downtown HQ (Branch A)</option>
            <option value="Uptown Premium">Uptown Premium (Branch B)</option>
            <option value="Metro Express">Metro Express (Branch C)</option>
          </select>

          {/* Role Selector (Demo switcher) */}
          <select 
            value={db.activeRole} 
            onChange={(e) => {
              const r = e.target.value;
              saveDB({ activeRole: r });
              if (r === 'Delivery Staff' || r === 'Delivery Boy') {
                onModuleChange('orders');
              } else {
                onModuleChange('dashboard');
              }
            }}
            className="header-select-btn" 
            style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="Admin">Admin</option>
            <option value="Cashier">Cashier</option>
            <option value="Delivery Staff">Delivery Staff</option>
          </select>

          {/* Notification Bell */}
          <div className="notification-bell-wrapper" style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="icon-btn" 
              style={{ background: '#f1f5f9', border: '1px solid var(--border-color)' }}
            >
              🔔
              {db.notifications.filter(n => n.unread).length > 0 && (
                <span className="badge" style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>
                  {db.notifications.filter(n => n.unread).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown active" style={{ top: '42px', right: 0, position: 'absolute', background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '320px', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <div className="dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>Notifications</h3>
                  <button onClick={clearNotifications} className="text-btn" style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>Clear All</button>
                </div>
                <div className="dropdown-list" style={{ maxHeight: '240px', overflowY: 'auto', padding: '8px 0' }}>
                  {db.notifications.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>No new notifications</div>
                  ) : (
                    db.notifications.map(n => (
                      <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', background: n.unread ? '#f0f7ff' : 'transparent' }}>
                        <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: n.unread ? '600' : '400' }}>{n.text}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>{n.time}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="icon-btn" title="Toggle Theme" style={{ background: '#f1f5f9', border: '1px solid var(--border-color)' }}>
            🌓
          </button>
        </div>

        <div className="cta-row" style={{ margin: 0, display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/customer')} className="secondary-btn sub-tab-nav" style={{ fontWeight: '700' }}>Customer Hub</button>
          {activeComp?.features?.deliveryModule !== false && (
            <button onClick={() => { saveDB({ activeRole: 'Delivery Staff' }); onModuleChange('orders'); }} className="secondary-btn sub-tab-nav" style={{ fontWeight: '700' }}>Delivery Hub</button>
          )}
          <button onClick={() => navigate('/')} className="primary-btn" style={{ fontWeight: '700' }}>Home</button>
        </div>
      </div>

      <div className="admin-layout-container" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {!isFullScreen && (
          <aside className="admin-sidebar" style={{ width: '260px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0, position: 'sticky', top: '24px', height: 'calc(100vh - 48px)' }}>
          <div className="sidebar-brand" style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e3a8a', display: 'block', lineHeight: '1.3' }}>
              {companyName || activeComp?.name || 'Company Name'}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {brandName}
            </span>
          </div>

          <div className="sidebar-menu-wrapper" style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
            <ul className="sidebar-menu" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(() => {
                const unreadAnnouncements = db.notifications.filter(n => n.unread && n.text.includes('📢')).length;
                const unreadSupport = db.notifications.filter(n => n.unread && n.text.includes('🎫')).length;

                // Reactive DB context count states
                const unrepliedReviewsCount = db.unreadReviewsCount || 0;
                const unresolvedSupportCount = db.unresolvedSupportCount || 0;

                return menuItems
                  .filter(item => isAllowed(item.id))
                  .map(item => (
                    <li 
                      key={item.id}
                      onClick={() => {
                        onModuleChange(item.id);
                        if (item.id === 'announcements') {
                          const updated = db.notifications.map(n => n.text.includes('📢') ? { ...n, unread: false } : n);
                          saveDB({ notifications: updated });
                        }
                        if (item.id === 'support') {
                          const updated = db.notifications.map(n => n.text.includes('🎫') ? { ...n, unread: false } : n);
                          saveDB({ notifications: updated });
                        }
                        if (item.id === 'reviews') {
                          const updated = db.notifications.map(n => n.text.includes('⭐') ? { ...n, unread: false } : n);
                          saveDB({ notifications: updated });
                        }
                        if (item.id === 'customer-support') {
                          const updated = db.notifications.map(n => n.text.includes('🎧') ? { ...n, unread: false } : n);
                          saveDB({ notifications: updated });
                        }
                      }} 
                      className={`sidebar-menu-item ${activeModule === item.id ? 'active' : ''}`}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        color: activeModule === item.id ? '#2563eb' : '#475569',
                        background: activeModule === item.id ? '#eff6ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span>{item.icon}</span> <span>{item.label}</span>
                      {item.id === 'delivery-staff' && db.users.filter(u => u.role === 'delivery' && u.status === 'Pending').length > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800', marginLeft: 'auto' }}>
                          {db.users.filter(u => u.role === 'delivery' && u.status === 'Pending').length}
                        </span>
                      )}
                      {item.id === 'announcements' && unreadAnnouncements > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800', marginLeft: 'auto' }}>
                          {unreadAnnouncements}
                        </span>
                      )}
                      {item.id === 'support' && unreadSupport > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800', marginLeft: 'auto' }}>
                          {unreadSupport}
                        </span>
                      )}
                      {item.id === 'reviews' && unrepliedReviewsCount > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800', marginLeft: 'auto' }}>
                          {unrepliedReviewsCount}
                        </span>
                      )}
                      {item.id === 'customer-support' && unresolvedSupportCount > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800', marginLeft: 'auto' }}>
                          {unresolvedSupportCount}
                        </span>
                      )}
                    </li>
                  ));
              })()}
            </ul>
          </div>

          <div style={{ padding: '16px 20px 0', borderTop: '1px solid #f1f5f9', marginTop: '16px' }}>
            <button 
              onClick={handleSignOut} 
              className="secondary-btn" 
              style={{ width: '100%', justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444', height: '40px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', cursor: 'pointer', borderRadius: '8px' }}
            >
              🚪 Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* Content View */}
        <main className="admin-main-content" style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
          <div className="admin-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 id="adminActiveModuleTitle" style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>{currentTitle}</h2>
              {activeModule === 'pos' && isFullScreen && (
                <button 
                  onClick={() => setIsFullScreen(false)} 
                  style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                >
                  ⬅️ Show Sidebar Menu
                </button>
              )}
              {activeModule === 'pos' && !isFullScreen && (
                <button 
                  onClick={() => setIsFullScreen(true)} 
                  style={{ padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                >
                  🖥️ Full Screen POS
                </button>
              )}
            </div>
            <div className="breadcrumb" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
              Operational Desk / {currentTitle}
            </div>
          </div>
          {children}
        </main>

      </div>
    </div>
  );
};
