import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, type Order, type Service, type Customer } from './DatabaseContext';

export const CustomerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { db, saveDB } = useDatabase();

  // Active Customer Session Check
  const [customer, setCustomer] = useState<Customer | null>(null);
  const activeCustId = localStorage.getItem(`ll_${db.activeCompanyId}_active_customer_id`) || localStorage.getItem('ll_active_customer_id');

  useEffect(() => {
    if (!activeCustId) {
      navigate('/');
      return;
    }
    const match = db.customers.find((c) => c.id === activeCustId);
    if (!match) {
      localStorage.removeItem(`ll_${db.activeCompanyId}_active_customer_id`);
      localStorage.removeItem('ll_active_customer_id');
      navigate('/');
    } else {
      setCustomer(match);
    }
  }, [activeCustId, db.customers, db.activeCompanyId, navigate]);

  // Profile editing state
  const [profName, setProfName] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profAddress, setProfAddress] = useState('');

  useEffect(() => {
    if (customer) {
      setProfName(customer.name);
      setProfPhone(customer.phone || '');
      setProfAddress(customer.address || '');
    }
  }, [customer]);

  const handleSaveProfile = () => {
    if (!customer) return;
    if (!profName.trim()) {
      alert('Name cannot be empty.');
      return;
    }

    const updatedCustomers = db.customers.map((c) => {
      if (c.id === customer.id) {
        return {
          ...c,
          name: profName,
          phone: profPhone,
          address: profAddress,
        };
      }
      return c;
    });

    const updatedUsers = db.users.map((u) => {
      if (u.role === 'customer' && u.email.toLowerCase() === customer.email.toLowerCase()) {
        return {
          ...u,
          name: profName,
          phone: profPhone,
          address: profAddress,
        };
      }
      return u;
    });

    saveDB({
      customers: updatedCustomers,
      users: updatedUsers,
    });

    alert('Profile updated successfully!');
  };

  // Sidebar Menu State
  const [activeTab, setActiveTab] = useState<'myOrders' | 'myServices' | 'profile'>('myOrders');

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // --- ORDER WIZARD STATE ---
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 = Frequency, 2 = Plan/Qty, 3 = Details, 4 = Payment, 5 = Success
  
  const [freq, setFreq] = useState<'One-time / Daily' | 'Monthly'>('One-time / Daily');

  const [wizardService, setWizardService] = useState<Service | null>(null);
  const [wizardPlan, setWizardPlan] = useState<'normal' | 'express'>('normal');
  const [wizardQty, setWizardQty] = useState(1);

  const [oName, setOName] = useState('');
  const [oEmail, setOEmail] = useState('');
  const [oPhone, setOPhone] = useState('');
  const [oAddress, setOAddress] = useState('');
  const [oNotes, setONotes] = useState('');

  const [payMethod, setPayMethod] = useState<'upi' | 'phonepe' | 'gpay' | 'credit' | 'debit' | 'wallet'>('upi');
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<any>(null);
  const [promoError, setPromoError] = useState('');

  // Service list filter categories
  const categories = ['All', 'Wash & Fold', 'Dry Cleaning', 'Steam Press', 'Premium Services', 'Express Services', 'Hotel Laundry', 'Commercial Laundry'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Pre-fill details when customer logs in and starts wizard
  useEffect(() => {
    if (customer) {
      setOName(customer.name);
      setOEmail(customer.email);
      setOPhone(customer.phone);
      setOAddress(customer.address);
    }
  }, [customer, showWizard]);

  if (!customer) return null;

  // Sign out customer
  const handleLogout = () => {
    localStorage.removeItem(`ll_${db.activeCompanyId}_active_customer_id`);
    localStorage.removeItem('ll_active_customer_id');
    localStorage.removeItem('ll_active_workspace');
    navigate('/');
  };

  // Service list filter categories
  // (Moved state to top level)
  const filteredServices = db.services.filter((s) => {
    if (selectedCategory === 'All') return s.active;
    return s.active && s.category === selectedCategory;
  });

  // Calculate pricing
  const getServicePrice = (srv: Service | null, plan: 'normal' | 'express') => {
    if (!srv) return 0;
    let base = srv.price;
    if (plan === 'express') {
      base = base * 1.5; // +50% Express Surcharge
    }
    return base;
  };

  const getSubtotal = () => {
    const baseTotal = getServicePrice(wizardService, wizardPlan) * wizardQty;
    return freq === 'Monthly' ? baseTotal * 30 : baseTotal;
  };

  const getDiscount = () => {
    if (!promoApplied) return 0;
    const sub = getSubtotal();
    if (promoApplied.type === 'Percentage') {
      return (sub * promoApplied.value) / 100;
    }
    return Math.min(promoApplied.value, sub);
  };

  const getGrandTotal = () => {
    return Math.max(0, getSubtotal() - getDiscount());
  };

  const handleApplyPromo = () => {
    setPromoError('');
    setPromoApplied(null);
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    const promo = db.promos.find((p) => p.code === code);
    if (!promo) {
      setPromoError('Invalid promo code.');
      return;
    }
    setPromoApplied(promo);
  };

  const handlePlaceOrder = () => {
    const activeCompany = db.companies.find(c => c.id === db.activeCompanyId);
    const limits = activeCompany?.limits || { maxOrdersPerMonth: 2000 };
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyOrdersCount = db.orders.filter(o => o.date.startsWith(currentMonth)).length;
    if (monthlyOrdersCount >= (limits.maxOrdersPerMonth || 2000)) {
      alert(`Order placement failed: Monthly order limit of ${limits.maxOrdersPerMonth || 2000} reached for this company portal. Contact company admin.`);
      return;
    }

    const grandTotal = getGrandTotal();
    let updatedCustomers = db.customers;

    if (payMethod === 'wallet') {
      if (customer.walletBalance < grandTotal) {
        alert('Insufficient wallet balance! Please choose another payment method or add funds.');
        return;
      }
      updatedCustomers = db.customers.map(c => {
        if (c.id === customer.id) {
          return { ...c, walletBalance: c.walletBalance - grandTotal };
        }
        return c;
      });
    }

    const newOrderId = 'OR-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder: Order = {
      id: newOrderId,
      customerId: customer.id,
      customerName: customer.name,
      branch: db.activeBranch || 'Downtown HQ',
      date: new Date().toISOString().split('T')[0],
      weightItems: freq === 'Monthly' 
        ? `${wizardQty} Clothes/Day (${wizardService?.name} - Monthly Plan, ${wizardQty * 30} Total Items)`
        : `${wizardQty} Items (${wizardService?.name})`,
      quantity: freq === 'Monthly' ? wizardQty * 30 : wizardQty,
      planType: wizardPlan,
      paymentMethod: payMethod.toUpperCase(),
      status: 'Pending',
      courier: null,
      deliveryStatus: 'Pending Assignment',
      phone: oPhone,
      address: oAddress,
      services: [{ serviceId: wizardService?.id, name: wizardService?.name, qty: wizardQty, plan: wizardPlan }],
      totalAmount: grandTotal,
      total: grandTotal,
      frequency: freq,
      clothesPerDay: freq === 'Monthly' ? wizardQty : undefined
    };

    const newNotification = {
      id: Date.now(),
      text: `New booking requested by ${customer.name}. Order #${newOrderId}`,
      time: 'Just now',
      unread: true
    };

    saveDB({
      orders: [...db.orders, newOrder],
      notifications: [...db.notifications, newNotification],
      customers: updatedCustomers
    });

    // Trigger confetti via window global
    if ((window as any).confetti) {
      (window as any).confetti();
    }

    setWizardStep(5); // Success screen
  };

  // Filter customer orders
  const customerOrders = [...db.orders]
    .filter((o) => o.customerId === customer.id)
    .reverse();

  return (
    <div className="portal-wrapper active" id="customerPortal" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex' }}>
      
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ background: 'white', borderRight: '1px solid #e2e8f0' }}>
        <div className="sidebar-brand">
          <span style={{ color: 'var(--primary)', fontWeight: '800' }}>Laundra</span>
          <span style={{ color: '#64748b', fontSize: '0.88rem', marginLeft: '6px' }}>Customer</span>
        </div>

        <div style={{ padding: '8px 16px', background: '#eff6ff', borderRadius: '8px', margin: '0 16px 20px 16px', border: '1px solid #dbeafe', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.72rem', color: '#1e3a8a', fontWeight: '700', textTransform: 'uppercase' }}>Welcome</span>
          <span style={{ fontSize: '0.88rem', color: '#1e40af', fontWeight: '800' }}>{customer.name}</span>
        </div>

        <ul className="sidebar-menu">
          <li onClick={() => setActiveTab('myOrders')} className={`sidebar-menu-item ${activeTab === 'myOrders' ? 'active' : ''}`}>
            📦 <span>My Orders</span>
          </li>
          <li onClick={() => setActiveTab('myServices')} className={`sidebar-menu-item ${activeTab === 'myServices' ? 'active' : ''}`}>
            🏷️ <span>Service Rates</span>
          </li>
          <li onClick={() => setActiveTab('profile')} className={`sidebar-menu-item ${activeTab === 'profile' ? 'active' : ''}`}>
            👤 <span>My Profile</span>
          </li>
        </ul>

        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <button onClick={handleLogout} className="secondary-btn" style={{ width: '100%', justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444', height: '40px', fontWeight: '700' }}>
            🚪 Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
        
        {/* Header Title */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
              {activeTab === 'myOrders' ? 'My Orders' : activeTab === 'myServices' ? 'Service Catalog' : 'Account Details'}
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Customer Hub / {activeTab === 'myOrders' ? 'Orders' : activeTab === 'myServices' ? 'Rates' : 'Profile'}</div>
          </div>
          {activeTab === 'myOrders' && (
            <button onClick={() => setActiveTab('myServices')} className="primary-btn" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
              🛒 Place an Order
            </button>
          )}
        </header>

        {activeTab === 'myOrders' && (
          <>


            {/* Active Orders List */}
            <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>My Bookings</h3>
              {customerOrders.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>
                  No bookings found. Click "Place an Order" above to schedule your first pickup!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '12px' }}>
                  {customerOrders.map((o) => {
                    const displayStatus = o.status === 'Received' ? 'Picked Up' : o.status;
                    
                    // Determine status badge style
                    let badgeStyle = { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
                    const st = displayStatus.toLowerCase();
                    if (st === 'pending') badgeStyle = { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
                    else if (st === 'accepted') badgeStyle = { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
                    else if (st === 'picked up') badgeStyle = { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' };
                    else if (['washing', 'ironing', 'processing'].includes(st)) badgeStyle = { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
                    else if (st === 'ready') badgeStyle = { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
                    else if (st === 'out for delivery') badgeStyle = { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' };
                    else if (st === 'delivered') badgeStyle = { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
                    else if (st === 'cancelled') badgeStyle = { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

                    return (
                      <div 
                        key={o.id} 
                        style={{ 
                          background: 'white', 
                          borderRadius: '16px', 
                          padding: '20px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '16px',
                          transition: 'all 0.2s ease',
                          cursor: 'default'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', color: '#1e40af', background: '#eff6ff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem' }}>#{o.id}</span>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>📅 {o.date}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items Details</label>
                          <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155', minHeight: '36px' }}>{o.weightItems}</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Total Amount</label>
                            <strong style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: '800' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</strong>
                          </div>

                          <span style={{ 
                            background: badgeStyle.bg, 
                            color: badgeStyle.text, 
                            border: `1px solid ${badgeStyle.border}`,
                            fontSize: '0.75rem', 
                            fontWeight: '700', 
                            padding: '6px 12px', 
                            borderRadius: '20px',
                            textTransform: 'capitalize'
                          }}>
                            {displayStatus}
                          </span>
                        </div>

                        <button 
                          onClick={() => setSelectedOrder(o)} 
                          className="primary-btn" 
                          style={{ 
                            width: '100%', 
                            justifyContent: 'center', 
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
                            color: 'white', 
                            border: 'none', 
                            padding: '10px 0', 
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            marginTop: '4px'
                          }}
                        >
                          📍 Track Order
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'myServices' && (
          <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  data-category={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`pos-category-btn ${selectedCategory === cat ? 'active' : ''}`}
                  style={{ whiteSpace: 'nowrap', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredServices.map((srv) => (
                <div 
                  key={srv.id} 
                  onClick={() => {
                    setWizardService(srv);
                    setWizardStep(1); // Start from Step 1 (Frequency Selection)
                    setShowWizard(true);
                  }}
                  style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                >
                  {srv.image && (
                    <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                      <img src={srv.image} alt={srv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700' }}>{srv.name}</h4>
                    <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>{srv.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Normal Rate</span>
                      <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>QR {srv.price.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Express (+50%)</span>
                      <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>QR {(srv.price * 1.5).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && customer && (
          <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Profile Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Full Name</label>
                <input 
                  type="text" 
                  value={profName} 
                  onChange={(e) => setProfName(e.target.value)} 
                  style={{ width: '100%', fontSize: '1rem', fontWeight: '600', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1.5px solid #cbd5e1', marginTop: '6px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Email Address</label>
                <input 
                  type="email" 
                  value={customer.email} 
                  disabled 
                  style={{ width: '100%', fontSize: '1rem', fontWeight: '600', padding: '10px 14px', background: '#f1f5f9', color: '#64748b', borderRadius: '8px', border: '1.5px solid #cbd5e1', marginTop: '6px', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Email address cannot be changed.</span>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={profPhone} 
                  onChange={(e) => setProfPhone(e.target.value)} 
                  style={{ width: '100%', fontSize: '1rem', fontWeight: '600', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1.5px solid #cbd5e1', marginTop: '6px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Primary Address</label>
                <input 
                  type="text" 
                  value={profAddress} 
                  onChange={(e) => setProfAddress(e.target.value)} 
                  style={{ width: '100%', fontSize: '1rem', fontWeight: '600', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1.5px solid #cbd5e1', marginTop: '6px', outline: 'none' }}
                />
              </div>
              
              <button 
                onClick={handleSaveProfile} 
                className="primary-btn" 
                style={{ 
                  marginTop: '12px', 
                  padding: '12px 24px', 
                  fontSize: '0.95rem', 
                  fontWeight: '800', 
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  justifyContent: 'center'
                }}
              >
                💾 Save Profile Changes
              </button>

              {customer.subRemaining !== undefined && (
                <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>Active Subscription Plan</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#065f46', marginTop: '4px' }}>{customer.subRemaining} loads remaining ({customer.subDuration})</div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- ORDER WIZARD MODAL DIALOG --- */}
      {showWizard && (
        <div className="order-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="order-modal" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Header / Step indicator */}
            <div className="order-modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '20px 24px' }}>
              <div className="order-steps-indicator" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <React.Fragment key={s}>
                    <div className={`order-step-dot ${wizardStep === s ? 'active' : wizardStep > s ? 'completed' : ''}`} style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700' }}>
                      <span>{s === 5 ? '✓' : s}</span>
                    </div>
                    {s < 5 && <div className={`order-step-line ${wizardStep > s ? 'active' : ''}`} style={{ width: '24px', height: '2px', background: '#cbd5e1' }} />}
                  </React.Fragment>
                ))}
              </div>
              <button onClick={() => setShowWizard(false)} className="order-close-btn" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px 32px' }}>
              
              {/* STEP 1: Frequency Selection */}
              {wizardStep === 1 && (
                <div className="order-step-panel">
                  <div className="order-step-title">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px 0' }}>📅 Order Frequency</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>How often would you like this service?</p>
                  </div>
                  <div className="order-freq-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
                    {['One-time / Daily', 'Monthly'].map((f) => {
                      const icons = { 'One-time / Daily': '🗓️', 'Monthly': '📆' };
                      const subs = { 'One-time / Daily': 'Standard single order', 'Monthly': 'Billed every 30 days' };
                      return (
                        <div
                          key={f}
                          onClick={() => {
                            setFreq(f as any);
                            setWizardStep(2); // Go directly to Plan & Qty (Step 2)
                          }}
                          className={`order-freq-card ${freq === f ? 'active' : ''}`}
                          style={{ border: '2px solid #cbd5e1', borderRadius: '12px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer' }}
                        >
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{(icons as any)[f]}</div>
                          <div style={{ fontWeight: '700', fontSize: '1rem' }}>{f}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>{(subs as any)[f]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Plan & Quantity Selection */}
              {wizardStep === 2 && (
                <div className="order-step-panel">
                  <div className="order-step-title">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px 0' }}>📦 Choose Plan & Quantity</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Select your service plan and number of clothes.</p>
                  </div>

                  {/* Plan Cards */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '24px', justifyContent: 'center' }}>
                    <div
                      onClick={() => setWizardPlan('normal')}
                      className={`plan-card ${wizardPlan === 'normal' ? 'active' : ''}`}
                      style={{ 
                        flex: 1, 
                        border: wizardPlan === 'normal' ? '2px solid #2563eb' : '2px solid #cbd5e1', 
                        borderRadius: '12px', 
                        padding: '16px', 
                        textAlign: 'center', 
                        cursor: 'pointer', 
                        background: wizardPlan === 'normal' ? '#f0f7ff' : 'white',
                        boxShadow: wizardPlan === 'normal' ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontSize: '1.5rem' }}>🧺</div>
                      <div style={{ fontWeight: '700', margin: '6px 0 2px 0' }}>Normal</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Standard (2-3 days)</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#2563eb', marginTop: '10px' }}>
                        QR {getServicePrice(wizardService, 'normal').toFixed(2)}
                      </div>
                    </div>
                    
                    <div
                      onClick={() => setWizardPlan('express')}
                      className={`plan-card ${wizardPlan === 'express' ? 'active' : ''}`}
                      style={{ 
                        flex: 1, 
                        border: wizardPlan === 'express' ? '2px solid #ef4444' : '2px solid #cbd5e1', 
                        borderRadius: '12px', 
                        padding: '16px', 
                        textAlign: 'center', 
                        cursor: 'pointer', 
                        background: wizardPlan === 'express' ? '#fef2f2' : 'white', 
                        position: 'relative', 
                        overflow: 'hidden',
                        boxShadow: wizardPlan === 'express' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ position: 'absolute', top: '6px', right: '-24px', background: '#ef4444', color: 'white', fontSize: '0.55rem', padding: '2px 24px', transform: 'rotate(45deg)', fontWeight: '700' }}>FAST</div>
                      <div style={{ fontSize: '1.5rem' }}>⚡</div>
                      <div style={{ fontWeight: '700', margin: '6px 0 2px 0' }}>Express</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Same Day Priority</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ef4444', marginTop: '10px' }}>
                        QR {getServicePrice(wizardService, 'express').toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '24px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                      {freq === 'Monthly' ? '👕 How many clothes per day?' : '👕 Number of Clothes'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '8px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <button onClick={() => setWizardQty(Math.max(1, wizardQty - 1))} style={{ fontSize: '1.3rem', padding: '4px 12px', background: '#cbd5e1', border: 'none', cursor: 'pointer', borderRadius: '6px' }}>−</button>
                      <span style={{ fontSize: '1.8rem', fontWeight: '800', minWidth: '40px', textAlign: 'center' }}>{wizardQty}</span>
                      <button onClick={() => setWizardQty(wizardQty + 1)} style={{ fontSize: '1.3rem', padding: '4px 12px', background: '#cbd5e1', border: 'none', cursor: 'pointer', borderRadius: '6px' }}>+</button>
                    </div>

                    {freq === 'Monthly' && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', fontWeight: '600' }}>
                        📅 30-day plan totals: {wizardQty * 30} clothes for the month
                      </div>
                    )}

                    {/* Subtotal Display */}
                    <div style={{ marginTop: '16px', padding: '10px 24px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {freq === 'Monthly' ? 'Total Monthly Amount: ' : 'Subtotal: '}
                      </span>
                      <strong style={{ color: '#2563eb', fontSize: '1.15rem', fontWeight: '800' }}>QR {getSubtotal().toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="order-nav-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                    <button className="order-back-btn" onClick={() => setWizardStep(1)}>← Back</button>
                    <button className="order-next-btn" onClick={() => setWizardStep(3)}>Continue →</button>
                  </div>
                </div>
              )}

              {/* STEP 3: Checkout details */}
              {wizardStep === 3 && (
                <div className="order-step-panel">
                  <div className="order-step-title">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px 0' }}>👤 Delivery Details</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Confirm your contact and delivery address.</p>
                  </div>
                  
                  <div className="order-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
                    <div className="order-field">
                      <label>Full Name</label>
                      <input type="text" value={oName} onChange={(e) => setOName(e.target.value)} required />
                    </div>
                    <div className="order-field">
                      <label>Email Address</label>
                      <input type="email" value={oEmail} onChange={(e) => setOEmail(e.target.value)} required />
                    </div>
                    <div className="order-field" style={{ gridColumn: 'span 2' }}>
                      <label>Phone Number</label>
                      <input type="tel" value={oPhone} onChange={(e) => setOPhone(e.target.value)} required />
                    </div>
                    <div className="order-field" style={{ gridColumn: 'span 2' }}>
                      <label>Pickup / Delivery Address</label>
                      <textarea value={oAddress} onChange={(e) => setOAddress(e.target.value)} rows={2} required />
                    </div>
                    <div className="order-field" style={{ gridColumn: 'span 2' }}>
                      <label>Special Instructions (optional)</label>
                      <textarea value={oNotes} onChange={(e) => setONotes(e.target.value)} rows={2} placeholder="e.g. Leave with security, gentle starch..." />
                    </div>
                  </div>

                  <div className="order-nav-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                    <button className="order-back-btn" onClick={() => setWizardStep(2)}>← Back</button>
                    <button className="order-next-btn" onClick={() => setWizardStep(4)}>Continue to Payment →</button>
                  </div>
                </div>
              )}

              {/* STEP 4: Payment Method & Promos */}
              {wizardStep === 4 && (
                <div className="order-step-panel">
                  <div className="order-step-title">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 8px 0' }}>💳 Payment Method</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Select payment method and apply coupons.</p>
                  </div>

                  {/* Payment Grid */}
                  <div className="order-payment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginTop: '16px' }}>
                    {['upi', 'phonepe', 'gpay', 'credit', 'debit', 'wallet'].map((p) => {
                      const icons = { upi: '📲', phonepe: '💜', gpay: '🔵', credit: '💳', debit: '🏦', wallet: '💼' };
                      const names = { upi: 'UPI', phonepe: 'PhonePe', gpay: 'GPay', credit: 'Credit Card', debit: 'Debit Card', wallet: 'Wallet' };
                      return (
                        <div
                          key={p}
                          onClick={() => setPayMethod(p as any)}
                          className={`order-pay-card ${payMethod === p ? 'active' : ''}`}
                          style={{ border: '2px solid #cbd5e1', borderRadius: '10px', padding: '12px 6px', textAlign: 'center', cursor: 'pointer' }}
                        >
                          <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{(icons as any)[p]}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>{(names as any)[p]}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card input panel */}
                  {['credit', 'debit'].includes(payMethod) && (
                    <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                      <div className="order-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="order-field" style={{ gridColumn: 'span 2' }}>
                          <label>Card Number</label>
                          <input type="text" value={cardNum} onChange={(e) => setCardNum(e.target.value)} placeholder="1234 5678 9012 3456" />
                        </div>
                        <div className="order-field">
                          <label>Expiry Date</label>
                          <input type="text" value={cardExp} onChange={(e) => setCardExp(e.target.value)} placeholder="MM/YY" />
                        </div>
                        <div className="order-field">
                          <label>CVV</label>
                          <input type="password" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="•••" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Promo Coupons */}
                  <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Apply Promo Coupon</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="e.g. WELCOME5"
                        style={{ flex: 1, padding: '10px 14px', border: '2px solid #cbd5e1', borderRadius: '8px' }}
                      />
                      <button onClick={handleApplyPromo} className="secondary-btn" style={{ padding: '0 16px', borderRadius: '8px' }}>Apply</button>
                    </div>
                    {promoError && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{promoError}</div>}
                    {promoApplied && <div style={{ color: '#22c55e', fontSize: '0.78rem', marginTop: '4px', fontWeight: '600' }}>✓ Promo Applied: {promoApplied.description}</div>}
                  </div>

                  {/* Prices summary details */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginTop: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span>QR {getSubtotal().toFixed(2)}</span>
                    </div>
                    {promoApplied && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontWeight: '600' }}>
                        <span>Promo Discount:</span>
                        <span>-QR {getDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '8px', fontWeight: '800', fontSize: '1rem', color: '#2563eb' }}>
                      <span>Grand Total:</span>
                      <span>QR {getGrandTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="order-nav-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                    <button className="order-back-btn" onClick={() => setWizardStep(3)}>← Back</button>
                    <button onClick={handlePlaceOrder} className="order-next-btn" style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', color: 'white', border: 'none' }}>🔒 Place Order</button>
                  </div>
                </div>
              )}

              {/* STEP 5: Success Screen */}
              {wizardStep === 5 && (
                <div className="order-step-panel" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✅</div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 8px 0', color: '#0f172a' }}>Order Placed Successfully!</h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '24px' }}>Thank you! Your laundry order has been received in our system. We will contact you shortly to coordinate the pickup details.</p>
                  
                  <button onClick={() => setShowWizard(false)} className="primary-btn" style={{ width: '100%', justifyContent: 'center', height: '48px', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: '700' }}>
                    Done 🎉
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- DETAILED VIEW MODAL --- */}
      {selectedOrder && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Order Tracking Details</h3>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>Order ID: #{selectedOrder.id}</p>
              <button onClick={() => setSelectedOrder(null)} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Garment Details</label>
                <div style={{ fontWeight: '600', marginTop: '2px' }}>{selectedOrder.weightItems}</div>
              </div>
              
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Subtotal Amount</label>
                  <div style={{ fontWeight: '700', color: '#2563eb', fontSize: '1.1rem' }}>QR {(selectedOrder.totalAmount || selectedOrder.total || 0).toFixed(2)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Progress Status</label>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ 
                      background: (() => {
                        const st = (selectedOrder.status === 'Received' ? 'Picked Up' : selectedOrder.status).toLowerCase();
                        if (st === 'pending') return '#fffbeb';
                        if (st === 'accepted') return '#faf5ff';
                        if (st === 'picked up') return '#f0f9ff';
                        if (['washing', 'ironing', 'processing'].includes(st)) return '#eff6ff';
                        if (st === 'ready') return '#ecfdf5';
                        if (st === 'out for delivery') return '#fdf2f8';
                        if (st === 'delivered') return '#f0fdf4';
                        return '#f8fafc';
                      })(), 
                      color: (() => {
                        const st = (selectedOrder.status === 'Received' ? 'Picked Up' : selectedOrder.status).toLowerCase();
                        if (st === 'pending') return '#d97706';
                        if (st === 'accepted') return '#7c3aed';
                        if (st === 'picked up') return '#0284c7';
                        if (['washing', 'ironing', 'processing'].includes(st)) return '#2563eb';
                        if (st === 'ready') return '#059669';
                        if (st === 'out for delivery') return '#db2777';
                        if (st === 'delivered') return '#16a34a';
                        return '#64748b';
                      })(), 
                      border: `1px solid ${(() => {
                        const st = (selectedOrder.status === 'Received' ? 'Picked Up' : selectedOrder.status).toLowerCase();
                        if (st === 'pending') return '#fde68a';
                        if (st === 'accepted') return '#e9d5ff';
                        if (st === 'picked up') return '#bae6fd';
                        if (['washing', 'ironing', 'processing'].includes(st)) return '#bfdbfe';
                        if (st === 'ready') return '#a7f3d0';
                        if (st === 'out for delivery') return '#fbcfe8';
                        if (st === 'delivered') return '#bbf7d0';
                        return '#e2e8f0';
                      })()}`,
                      fontSize: '0.75rem', 
                      fontWeight: '700', 
                      padding: '5px 12px', 
                      borderRadius: '20px',
                      textTransform: 'capitalize',
                      display: 'inline-block'
                    }}>
                      {selectedOrder.status === 'Received' ? 'Picked Up' : selectedOrder.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Logistics Phase</label>
                <div style={{ fontWeight: '600', marginTop: '2px', color: '#475569' }}>{selectedOrder.deliveryStatus}</div>
              </div>

              {selectedOrder.courier && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Courier</label>
                  <div style={{ fontWeight: '600', marginTop: '2px' }}>👤 {selectedOrder.courier}</div>
                </div>
              )}

              {/* Progress Pipeline */}
              <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', marginBottom: '14px' }}>Pipeline Journey</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '8px' }}>
                  {/* Vertical connecting line */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '17px', 
                    top: '10px', 
                    bottom: '10px', 
                    width: '2px', 
                    background: '#e2e8f0', 
                    zIndex: 0 
                  }}></div>

                  {['Pending', 'Received', 'Washing', 'Ironing', 'Ready', 'Out for Delivery', 'Delivered'].map((step, idx) => {
                    const statusOrder = ['Pending', 'Placed', 'Accepted', 'Received', 'Washing', 'Ironing', 'Processing', 'Ready', 'Out for Delivery', 'Delivered'];
                    const currentIdx = statusOrder.indexOf(selectedOrder.status);
                    const stepIdx = statusOrder.indexOf(step === 'Received' ? 'Received' : step);
                    const isDone = currentIdx >= stepIdx;
                    const label = step === 'Received' ? 'Picked Up' : step;
                    
                    return (
                      <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
                        <span style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          background: isDone ? '#22c55e' : '#cbd5e1', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white', 
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          {isDone ? '✓' : idx + 1}
                        </span>
                        <span style={{ 
                          fontSize: '0.88rem', 
                          fontWeight: isDone ? '700' : '500', 
                          color: isDone ? '#0f172a' : '#64748b' 
                        }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
