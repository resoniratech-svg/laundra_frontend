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
      return ['orders'].includes(moduleId);
    }
    if (role === 'Cashier') {
      return ['dashboard', 'pos', 'customers', 'orders', 'payments', 'wallet-loyalty', 'drawer', 'receipt'].includes(moduleId);
    }

    return true;
  };

  const titleMap: Record<string, string> = {
    'dashboard': 'Admin Dashboard',
    'pos': 'POS / New Order',
    'customers': 'Customer Management',
    'cashiers': 'Cashier Management',
    'delivery-staff': 'Delivery Staff Management',
    'services': 'Service Management',
    'orders': 'Order Management',
    'payments': 'Payments Catalog',
    'coupons': 'Coupons Management',
    'wallet-loyalty': 'Wallet & Loyalty Program',
    'expenses': 'Expenses Manager',
    'reports': 'Business Reports',
    'notifications': 'Central Notifications Center',
    'reviews': 'Customer Reviews',
    'settings': 'Company Settings',
    'audit-logs': 'Audit Activity Logs',
    'support': 'Platform Help & Support',
    'drawer': 'Drawer Shifts Management',
    'receipt': 'Thermal Receipt Simulator'
  };

  const currentTitle = titleMap[activeModule] || 'Manager Desk';

  // Sidebar tabs list matching exactly the required workflow
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'pos', label: 'POS / New Order', icon: '🛒' },
    { id: 'customers', label: 'Customer Management', icon: '👥' },
    { id: 'cashiers', label: 'Cashier Management', icon: '💳' },
    { id: 'delivery-staff', label: 'Delivery Staff', icon: '🚚' },
    { id: 'services', label: 'Service Management', icon: '🏷️' },
    { id: 'orders', label: 'Order Management', icon: '🧺' },
    { id: 'payments', label: 'Payments & Refunds', icon: '💰' },
    { id: 'coupons', label: 'Coupons Manager', icon: '🎁' },
    { id: 'wallet-loyalty', label: 'Wallet & Loyalty', icon: '💳' },
    { id: 'drawer', label: 'Drawer & Shifts', icon: '💵' },
    { id: 'receipt', label: 'Receipt Printer', icon: '🧾' },
    { id: 'expenses', label: 'Expenses Book', icon: '💸' },
    { id: 'reports', label: 'Business Reports', icon: '📊' },
    { id: 'notifications', label: 'Notification Center', icon: '✉️' },
    { id: 'reviews', label: 'Customer Reviews', icon: '⭐' },
    { id: 'settings', label: 'Company Settings', icon: '⚙️' },
    { id: 'audit-logs', label: 'Audit Activity Logs', icon: '📜' },
    { id: 'support', label: 'Help & Support', icon: '🎫' }
  ];

  return (
    <div className="workspace-wrapper active" id="workspacePanel" style={{ background: '#f8fafc' }}>
      
      {/* Top Workspace Header */}
      <div className="workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e3a8a', fontWeight: '800' }}>Operational Desk</h2>
          
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

      <div className="admin-layout-container" style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
        
        {/* Sidebar Panel */}
        <aside className="admin-sidebar" style={{ width: '260px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0 }}>
          <div className="sidebar-brand" style={{ padding: '0 20px 16px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e3a8a', display: 'block' }}>{brandName}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginTop: '4px' }}>🏢 {activeComp?.name || 'Laundra Corp'}</span>
          </div>

          <div className="sidebar-menu-wrapper" style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
            <ul className="sidebar-menu" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {menuItems
                .filter(item => isAllowed(item.id))
                .map(item => (
                  <li 
                    key={item.id}
                    onClick={() => onModuleChange(item.id)} 
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
                  </li>
                ))}
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

        {/* Content View */}
        <main className="admin-main-content" style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
          <div className="admin-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <h2 id="adminActiveModuleTitle" style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>{currentTitle}</h2>
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
