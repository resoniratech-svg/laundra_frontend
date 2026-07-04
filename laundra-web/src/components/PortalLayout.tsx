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
  const brandName = role === 'Admin' ? 'Manager Desk' : role === 'Delivery Boy' ? 'Delivery Portal' : `${role} Desk`;

  // Filter allowed modules
  const isAllowed = (moduleId: string) => {
    if (role === 'Delivery Boy') {
      return ['pending-orders', 'your-orders'].includes(moduleId);
    }
    if (['pending-orders', 'your-orders'].includes(moduleId)) {
      return false;
    }
    if (role === 'Cashier') {
      return !['user-management', 'services'].includes(moduleId);
    }
    return true; // Admin has full access to everything else
  };

  // Sub-tab permissions for operations header (hidden in css but implemented)
  const isTabAllowed = (tabId: string) => {
    if (role === 'Delivery Boy') {
      return tabId === 'delivery';
    }
    return tabId !== 'delivery';
  };

  const titleMap: Record<string, string> = {
    'sales-overview': 'Sales Overview',
    'pos': 'Manual Order',
    'daily-orders': 'Daily Orders',
    'pending-orders': 'Pending Orders',
    'your-orders': 'Your Orders',
    'delivery-status': 'Delivery Status',
    'revenue-analytics': 'Revenue Analytics',
    'user-management': 'User Management',
    'customer-crm': 'Customer CRM',
    'expense-daybook': 'Expense Daybook',
    'customer-users': 'Customer Users',
    'monthly-orders': 'Monthly Orders',
    'services': 'Services Catalog'
  };

  const currentTitle = titleMap[activeModule] || 'Manager Desk';
  const prefix = role === 'Delivery Boy' ? 'Delivery Portal' : 'Manager Desk';

  return (
    <div className="workspace-wrapper active" id="workspacePanel">
      
      {/* Top Workspace Header (Includes branch selector, role select, notifications, sub-tab nav) */}
      <div className="workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Operational Desk</h2>
          
          {/* Branch Selector */}
          <select 
            value={db.activeBranch} 
            onChange={(e) => saveDB({ activeBranch: e.target.value })}
            className="header-select-btn" 
            style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="Downtown HQ">Downtown HQ (Branch A)</option>
            <option value="Uptown Premium">Uptown Premium (Branch B)</option>
            <option value="Metro Express">Metro Express (Branch C)</option>
          </select>

          {/* Role Selector */}
          <select 
            value={db.activeRole} 
            onChange={(e) => saveDB({ activeRole: e.target.value })}
            className="header-select-btn" 
            style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="Admin">Admin</option>
            <option value="Cashier">Cashier</option>
            <option value="Delivery Boy">Delivery Staff</option>
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

        <div className="cta-row" style={{ margin: 0 }}>
          {isTabAllowed('customer') && <button onClick={() => navigate('/customer')} className="secondary-btn sub-tab-nav">Customer Hub</button>}
          {isTabAllowed('delivery') && <button onClick={() => onModuleChange('pending-orders')} className="secondary-btn sub-tab-nav">Delivery Hub</button>}
          <button onClick={() => navigate('/')} className="primary-btn">Home</button>
        </div>
      </div>
      <div className="admin-layout-container">
        
        {/* Sidebar Panel */}
        <aside className="admin-sidebar">
          <div className="sidebar-brand">
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}>{brandName}</span>
          </div>


          <ul className="sidebar-menu">
            {isAllowed('sales-overview') && (
              <li 
                onClick={() => onModuleChange('sales-overview')} 
                className={`sidebar-menu-item ${activeModule === 'sales-overview' ? 'active' : ''}`}
              >
                📊 <span>Sales Overview</span>
              </li>
            )}
            {isAllowed('pos') && (
              <li 
                onClick={() => onModuleChange('pos')} 
                className={`sidebar-menu-item ${activeModule === 'pos' ? 'active' : ''}`}
              >
                ➕ <span>Manual Order</span>
              </li>
            )}
            {isAllowed('daily-orders') && (
              <li 
                onClick={() => onModuleChange('daily-orders')} 
                className={`sidebar-menu-item ${activeModule === 'daily-orders' ? 'active' : ''}`}
              >
                📝 <span>Daily Orders</span>
              </li>
            )}
            {isAllowed('monthly-orders') && (
              <li 
                onClick={() => onModuleChange('monthly-orders')} 
                className={`sidebar-menu-item ${activeModule === 'monthly-orders' ? 'active' : ''}`}
              >
                📆 <span>Monthly Orders</span>
              </li>
            )}
            {isAllowed('pending-orders') && (
              <li 
                onClick={() => onModuleChange('pending-orders')} 
                className={`sidebar-menu-item ${activeModule === 'pending-orders' ? 'active' : ''}`}
              >
                🕒 <span>Pending Orders</span>
              </li>
            )}
            {isAllowed('your-orders') && (
              <li 
                onClick={() => onModuleChange('your-orders')} 
                className={`sidebar-menu-item ${activeModule === 'your-orders' ? 'active' : ''}`}
              >
                📦 <span>Your Orders</span>
              </li>
            )}
            {isAllowed('delivery-status') && (
              <li 
                onClick={() => onModuleChange('delivery-status')} 
                className={`sidebar-menu-item ${activeModule === 'delivery-status' ? 'active' : ''}`}
              >
                🚚 <span>Delivery Status</span>
              </li>
            )}
            {isAllowed('services') && (
              <li 
                onClick={() => onModuleChange('services')} 
                className={`sidebar-menu-item ${activeModule === 'services' ? 'active' : ''}`}
              >
                🏷️ <span>Services Catalog</span>
              </li>
            )}
            {isAllowed('customer-users') && (
              <li 
                onClick={() => onModuleChange('customer-users')} 
                className={`sidebar-menu-item ${activeModule === 'customer-users' ? 'active' : ''}`}
              >
                👥 <span>Customer Users</span>
              </li>
            )}
            {isAllowed('user-management') && (
              <li 
                onClick={() => onModuleChange('user-management')} 
                className={`sidebar-menu-item ${activeModule === 'user-management' ? 'active' : ''}`}
              >
                👤 <span>User Management</span>
              </li>
            )}
          </ul>

          <div style={{ marginTop: 'auto', padding: '16px' }}>
            <button 
              onClick={handleSignOut} 
              className="secondary-btn" 
              style={{ width: '100%', justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444', height: '40px', fontWeight: '700' }}
            >
              🚪 Sign Out
            </button>
          </div>
        </aside>

        {/* Content View */}
        <main className="admin-main-content">
          <div className="admin-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 id="adminActiveModuleTitle" style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>{currentTitle}</h2>
            <div className="breadcrumb" style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {prefix} / {currentTitle}
            </div>
          </div>
          {children}
        </main>

      </div>
    </div>
  );
};
