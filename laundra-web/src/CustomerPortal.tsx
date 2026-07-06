import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, type Order, type Service, type Customer, type Promo } from './DatabaseContext';

// Support ticket interface
interface SupportTicket {
  id: string;
  company: string;
  subject: string;
  status: 'Open' | 'Closed';
  date: string;
  message: string;
  assignedTo?: string;
  history?: { sender: string; message: string; date: string }[];
}

export const CustomerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { db, saveDB } = useDatabase();

  // Active Customer Session Check with automatic secure login via URL ?login=cust-XXX
  const [customer, setCustomer] = useState<Customer | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLoginId = params.get('login');
    if (urlLoginId) {
      localStorage.setItem('ll_active_customer_id', urlLoginId);
      localStorage.setItem(`ll_${db.activeCompanyId}_active_customer_id`, urlLoginId);
    }
  }, [db.activeCompanyId]);

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

  // Sidebar Menu State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'invoices' | 'wallet' | 'addresses' | 'offers' | 'support' | 'reviews' | 'profile' | 'qr'>('dashboard');

  // Customer profile details
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

  // Address Book state
  const [addressesList, setAddressesList] = useState<string[]>([
    'Home: 12 Main St, Downtown',
    'Office: Suite 404, Tech Park'
  ]);
  const [newAddr, setNewAddr] = useState('');

  // Support ticket state
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const all = JSON.parse(localStorage.getItem('ll_platform_tickets') || '[]');
      const compName = db.companies.find(c => c.id === db.activeCompanyId)?.name || 'Tenant';
      return all.filter((t: any) => t.company === compName);
    } catch {
      return [];
    }
  });
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  // Wallet add funds state
  const [addFundsAmt, setAddFundsAmt] = useState('');

  // Ratings / Reviews state
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  // Order Details modal
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
  const [payMethod, setPayMethod] = useState<'upi' | 'phonepe' | 'gpay' | 'credit' | 'debit' | 'wallet'>('upi');

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<Promo | null>(null);

  // Service list filter categories
  const categories = ['All', 'Wash & Fold', 'Dry Cleaning', 'Steam Iron', 'Shoe Cleaning', 'Carpet Cleaning', 'Blanket Cleaning'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Pre-fill details when customer logs in
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

  // Filter services
  const filteredServices = db.services.filter((s) => {
    if (selectedCategory === 'All') return s.active !== false;
    return s.active !== false && s.category === selectedCategory;
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
    setPromoApplied(null);
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    const promo = db.promos.find((p) => p.code === code);
    if (!promo) {
      alert('Invalid promo code.');
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
    
    // Generate secure delivery OTP
    const secureDeliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

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
      paymentStatus: payMethod === 'wallet' ? 'Paid' : 'Unpaid',
      status: 'Created',
      courier: null,
      deliveryStatus: 'Pending Assignment',
      phone: oPhone,
      address: oAddress,
      services: [{ serviceId: wizardService?.id, name: wizardService?.name, qty: wizardQty, plan: wizardPlan }],
      totalAmount: grandTotal,
      total: grandTotal,
      frequency: freq,
      deliveryOtp: secureDeliveryOtp // Secure Delivery OTP
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

    setWizardStep(5); // Success screen
  };

  // Profile saving
  const handleSaveProfile = () => {
    if (!profName.trim()) {
      alert('Name cannot be empty.');
      return;
    }
    const updated = db.customers.map(c => c.id === customer.id ? { ...c, name: profName, phone: profPhone, address: profAddress } : c);
    saveDB({ customers: updated });
    alert('Profile updated successfully!');
  };

  // Add address
  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.trim()) return;
    setAddressesList([...addressesList, newAddr]);
    setNewAddr('');
    alert('Address added to book!');
  };

  // Add wallet balance
  const handleAddWalletBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(addFundsAmt) || 0;
    if (val <= 0) return;

    const updated = db.customers.map(c => c.id === customer.id ? { ...c, walletBalance: c.walletBalance + val } : c);
    saveDB({ customers: updated });
    setAddFundsAmt('');
    alert(`Successfully loaded QR ${val.toFixed(2)} to wallet!`);
  };

  // Support ticket submission
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;

    try {
      const all = JSON.parse(localStorage.getItem('ll_platform_tickets') || '[]');
      const compName = db.companies.find(c => c.id === db.activeCompanyId)?.name || 'Tenant';
      const newTkt: SupportTicket = {
        id: 'tkt-' + Date.now(),
        company: compName,
        subject: ticketSubject,
        status: 'Open',
        date: new Date().toISOString().split('T')[0],
        message: ticketMessage,
        history: []
      };

      localStorage.setItem('ll_platform_tickets', JSON.stringify([newTkt, ...all]));
      setTickets([newTkt, ...tickets]);
      setTicketSubject('');
      setTicketMessage('');
      alert('Support ticket created successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Rating Review
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingComment) return;

    // Simulated review upload. Can be saved in db or reviews pool
    alert('Thank you! Your feedback has been uploaded.');
    setRatingComment('');
  };

  // Download Invoice Simulation
  const handleDownloadInvoice = (order: Order) => {
    const content = `INVOICE DETAILS\n\nOrder ID: #${order.id}\nDate: ${order.date}\nCustomer: ${order.customerName}\nGarments: ${order.weightItems}\nAmount Due: QR ${(order.totalAmount || order.total || 0).toFixed(2)}\nPayment Mode: ${order.paymentMethod || 'CASH'}\nPayment Status: ${order.paymentStatus || 'Unpaid'}\n\nThank you for choosing Laundra!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${order.id}.txt`;
    link.click();
  };

  const customerOrders = db.orders.filter(o => o.customerId === customer.id).reverse();

  return (
    <div className="portal-wrapper active" id="customerPortal" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex' }}>
      
      {/* Sidebar Panel */}
      <aside className="admin-sidebar" style={{ width: '260px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0 }}>
        <div className="sidebar-brand" style={{ padding: '0 20px 16px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e3a8a' }}>Laundra</span>
          <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '6px', fontWeight: '600' }}>Client Hub</span>
        </div>

        <div style={{ padding: '8px 16px', background: '#eff6ff', borderRadius: '8px', margin: '0 16px 20px 16px', border: '1px solid #dbeafe' }}>
          <div style={{ fontSize: '0.7rem', color: '#1e3a8a', fontWeight: '700', textTransform: 'uppercase' }}>Session active</div>
          <div style={{ fontSize: '0.88rem', color: '#1e40af', fontWeight: '800' }}>{customer.name}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          <ul className="sidebar-menu" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li onClick={() => setActiveTab('dashboard')} className={`sidebar-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'dashboard' ? '#2563eb' : '#475569', background: activeTab === 'dashboard' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📦 <span>My Bookings</span>
            </li>
            <li onClick={() => setActiveTab('services')} className={`sidebar-menu-item ${activeTab === 'services' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'services' ? '#2563eb' : '#475569', background: activeTab === 'services' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🏷️ <span>Service Rates</span>
            </li>
            <li onClick={() => setActiveTab('invoices')} className={`sidebar-menu-item ${activeTab === 'invoices' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'invoices' ? '#2563eb' : '#475569', background: activeTab === 'invoices' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🧾 <span>Invoices</span>
            </li>
            <li onClick={() => setActiveTab('wallet')} className={`sidebar-menu-item ${activeTab === 'wallet' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'wallet' ? '#2563eb' : '#475569', background: activeTab === 'wallet' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              💳 <span>Wallet & Loyalty</span>
            </li>
            <li onClick={() => setActiveTab('addresses')} className={`sidebar-menu-item ${activeTab === 'addresses' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'addresses' ? '#2563eb' : '#475569', background: activeTab === 'addresses' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🏠 <span>Address Book</span>
            </li>
            <li onClick={() => setActiveTab('offers')} className={`sidebar-menu-item ${activeTab === 'offers' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'offers' ? '#2563eb' : '#475569', background: activeTab === 'offers' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🎁 <span>Special Offers</span>
            </li>
            <li onClick={() => setActiveTab('support')} className={`sidebar-menu-item ${activeTab === 'support' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'support' ? '#2563eb' : '#475569', background: activeTab === 'support' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🎫 <span>Support Desk</span>
            </li>
            <li onClick={() => setActiveTab('reviews')} className={`sidebar-menu-item ${activeTab === 'reviews' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'reviews' ? '#2563eb' : '#475569', background: activeTab === 'reviews' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⭐ <span>Rate Services</span>
            </li>
            <li onClick={() => setActiveTab('profile')} className={`sidebar-menu-item ${activeTab === 'profile' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'profile' ? '#2563eb' : '#475569', background: activeTab === 'profile' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              👤 <span>Account Profile</span>
            </li>
            <li onClick={() => setActiveTab('qr')} className={`sidebar-menu-item ${activeTab === 'qr' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'qr' ? '#2563eb' : '#475569', background: activeTab === 'qr' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📱 <span>My Access QR</span>
            </li>
          </ul>
        </div>

        <div style={{ padding: '16px 20px 0', borderTop: '1px solid #f1f5f9', marginTop: '16px' }}>
          <button onClick={handleLogout} className="secondary-btn" style={{ width: '100%', justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444', height: '40px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', cursor: 'pointer', borderRadius: '8px' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
              {activeTab === 'dashboard' ? 'My Bookings & Timeline' : activeTab === 'services' ? 'Laundry Rates' : activeTab === 'invoices' ? 'My Invoices' : activeTab === 'wallet' ? 'Wallet & Loyalty Points' : activeTab === 'addresses' ? 'My Address Book' : activeTab === 'offers' ? 'Coupons & Promos' : activeTab === 'support' ? 'Support Tickets' : activeTab === 'reviews' ? 'Review & Feedback' : activeTab === 'qr' ? 'My Access QR & Portal Link' : 'My Account Settings'}
            </h1>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>Customer Portal / {activeTab}</div>
          </div>
          {activeTab === 'dashboard' && (
            <button onClick={() => setActiveTab('services')} className="primary-btn" style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>🛒 Book Laundry pickup</button>
          )}
        </div>

        {/* 📦 DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>Wallet Balance</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>QR {customer.walletBalance.toFixed(2)}</div>
              </div>
              <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '12px', border: '1px solid #f3e8ff' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b21a8', textTransform: 'uppercase' }}>Loyalty reward points</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#6b21a8', marginTop: '4px' }}>{customer.loyaltyPoints} points</div>
              </div>
            </div>

            {/* List active orders */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px 0' }}>📋 Active Laundry Bookings</h4>
              {customerOrders.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No bookings placed. Book your laundry above.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {customerOrders.map(o => (
                    <div key={o.id} style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', color: '#2563eb' }}>Order #{o.id}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.date}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}><strong>Items:</strong> {o.weightItems}</div>
                      
                      {/* Delivery OTP display */}
                      {o.status === 'Out for Delivery' && o.deliveryOtp && (
                        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.82rem', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontWeight: '700', color: '#1e40af' }}>Delivery Secure OTP:</span>
                          <strong style={{ fontSize: '1.25rem', color: '#2563eb', letterSpacing: '2px' }}>{o.deliveryOtp}</strong>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Share this code with delivery staff to complete.</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <strong style={{ color: '#0f172a' }}>QR {o.totalAmount.toFixed(2)}</strong>
                        <button onClick={() => setSelectedOrder(o)} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>📍 Track</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 🏷️ SERVICES TAB */}
        {activeTab === 'services' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
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
                    setWizardStep(1);
                    setShowWizard(true);
                  }}
                  style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                >
                  {srv.image ? (
                    <img src={srv.image} alt={srv.name} style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ width: '100%', height: '130px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>🧺</div>
                  )}
                  <h4 style={{ margin: '8px 0 0 0', fontSize: '1rem', fontWeight: '700' }}>{srv.name}</h4>
                  <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '10px', width: 'fit-content' }}>{srv.category}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '12px', marginTop: '10px' }}>
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

        {/* 🧾 INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>🧾 Order Invoices list</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customerOrders.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No orders placed.</div>
              ) : (
                customerOrders.map(o => (
                  <div key={o.id} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Order #{o.id}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Date: {o.date} • Total: QR {o.totalAmount.toFixed(2)}</div>
                    </div>
                    <button onClick={() => handleDownloadInvoice(o)} style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700' }}>📥 Invoice</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 💳 WALLET & LOYALTY TAB */}
        {activeTab === 'wallet' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
              <h4>💼 Wallet balance details</h4>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a', margin: '12px 0' }}>QR {customer.walletBalance.toFixed(2)}</div>
              
              <form onSubmit={handleAddWalletBalance} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <input type="number" required value={addFundsAmt} onChange={e => setAddFundsAmt(e.target.value)} placeholder="Enter loading amount..." style={{ flex: 1, padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                <button type="submit" style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Add Funds</button>
              </form>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
              <h4>⭐ Loyalty program</h4>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#6b21a8', margin: '12px 0' }}>{customer.loyaltyPoints} points</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Every order places points automatically. Redeem points for discount offers inside coupons.</p>
            </div>

          </div>
        )}

        {/* 🏠 ADDRESS BOOK TAB */}
        {activeTab === 'addresses' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
              <h4>🏠 Saved Delivery Addresses</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {addressesList.map((addr, idx) => (
                  <div key={idx} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.88rem' }}>{addr}</span>
                    <button onClick={() => setAddressesList(addressesList.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
              <h4>➕ Add New Address</h4>
              <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" required value={newAddr} onChange={e => setNewAddr(e.target.value)} placeholder="e.g. Work: Suite 50, Plaza Complex" style={{ padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Save Address</button>
              </form>
            </div>

          </div>
        )}

        {/* 🎁 SPECIAL OFFERS TAB */}
        {activeTab === 'offers' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1' }}>
            <h4>🎁 Active Special Coupons & Promo Codes</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {db.promos.map(p => (
                <div key={p.code} style={{ padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.72rem', background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: '8px', fontWeight: '700' }}>COUPON</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e3a8a', marginTop: '6px' }}>{p.code}</div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af', marginTop: '4px', fontWeight: '600' }}>{p.description || 'Flat discount rates'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Value: {p.value}{p.type === 'Percentage' ? '%' : ' QR'} Off</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎫 SUPPORT DESK TAB */}
        {activeTab === 'support' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
              <h4>🎫 Raise Support Ticket</h4>
              <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Subject Topic</label>
                  <input type="text" required value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="e.g. Order pickup delay support" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Detailed message</label>
                  <textarea required value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} rows={4} placeholder="Type support inquiry description..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Submit Ticket</button>
              </form>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
              <h4>Ticket history</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {tickets.map(t => (
                  <div key={t.id} style={{ padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong>{t.subject}</strong>
                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: t.status === 'Open' ? '#fffbeb' : '#dcfce7', color: t.status === 'Open' ? '#b45309' : '#15803d' }}>{t.status}</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{t.message}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ⭐ RATE SERVICES TAB */}
        {activeTab === 'reviews' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1', maxWidth: '500px' }}>
            <h4>⭐ Rate Laundry Service</h4>
            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Select Stars Rating</label>
                <select value={ratingStars} onChange={e => setRatingStars(parseInt(e.target.value))} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="5">★★★★★ (5 Stars)</option>
                  <option value="4">★★★★☆ (4 Stars)</option>
                  <option value="3">★★★☆☆ (3 Stars)</option>
                  <option value="2">★★☆☆☆ (2 Stars)</option>
                  <option value="1">★☆☆☆☆ (1 Star)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Review comment details</label>
                <textarea required value={ratingComment} onChange={e => setRatingComment(e.target.value)} rows={3} placeholder="Tell us how you liked our service press, clean, packaging..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Submit Review</button>
            </form>
          </div>
        )}

        {/* 👤 ACCOUNT PROFILE TAB */}
        {activeTab === 'profile' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1', maxWidth: '550px' }}>
            <h4>👤 Update Account Profile Settings</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Full Name</label>
                <input type="text" value={profName} onChange={e => setProfName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Phone contact</label>
                <input type="text" value={profPhone} onChange={e => setProfPhone(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Home delivery address</label>
                <input type="text" value={profAddress} onChange={e => setProfAddress(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <button onClick={handleSaveProfile} style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Save Settings</button>
            </div>
          </div>
        )}

        {/* 📱 MY ACCESS QR TAB */}
        {activeTab === 'qr' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', width: '100%', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Secure Access Code</span>
              </div>
              
              {/* Mock QR Code Card */}
              <div style={{ position: 'relative', width: '200px', height: '200px', background: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                {/* Outer corners of scanning box */}
                <div style={{ position: 'absolute', top: '15px', left: '15px', width: '20px', height: '20px', borderTop: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6' }}></div>
                <div style={{ position: 'absolute', top: '15px', right: '15px', width: '20px', height: '20px', borderTop: '4px solid #3b82f6', borderRight: '4px solid #3b82f6' }}></div>
                <div style={{ position: 'absolute', bottom: '15px', left: '15px', width: '20px', height: '20px', borderBottom: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6' }}></div>
                <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '20px', height: '20px', borderBottom: '4px solid #3b82f6', borderRight: '4px solid #3b82f6' }}></div>
                
                {/* Simulated QR blocks grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', width: '110px', height: '110px' }}>
                  {[...Array(25)].map((_, i) => {
                    const filled = (i % 2 === 0 && i !== 12) || i === 0 || i === 4 || i === 20 || i === 24;
                    return (
                      <div key={i} style={{ background: filled ? '#1e293b' : 'transparent', borderRadius: '2px' }}></div>
                    );
                  })}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: '800' }}>{customer.name}</h4>
                <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Scan this QR code with another mobile device to securely auto-login to this laundry account dashboard instantly.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>📱 Portal Web Link</h4>
                <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  This is your personal secure auto-login URL. Bookmark this link on your phone browser for one-click access without needing any login credentials.
                </p>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', wordBreak: 'break-all', fontFamily: 'monospace', color: '#3b82f6', fontWeight: '700', marginBottom: '16px' }}>
                  {`http://localhost:5173/customer?login=${customer.id}`}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { navigator.clipboard.writeText(`http://localhost:5173/customer?login=${customer.id}`); alert('Secure portal link copied!'); }} style={{ flex: 1, padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                    🔗 Copy Web Link
                  </button>
                  <button onClick={() => window.open(`https://api.whatsapp.com/send?text=Scan this secure link to access your customer laundry portal: http://localhost:5173/customer?login=${customer.id}`)} style={{ padding: '12px', background: '#25d366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                    Share via WhatsApp
                  </button>
                </div>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <div>
                  <h5 style={{ margin: 0, color: '#991b1b', fontWeight: '700', fontSize: '0.85rem' }}>Security Warning</h5>
                  <p style={{ margin: '4px 0 0 0', color: '#7f1d1d', fontSize: '0.78rem', lineHeight: 1.4 }}>
                    Your QR code and web link contain a secure session token that grants direct access to your orders, invoices, and prepaid wallet. Do not share this link with anyone you do not trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- ORDER WIZARD MODAL --- */}
      {showWizard && (
        <div className="order-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="order-modal" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            
            <div className="order-modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              
              {wizardStep === 1 && (
                <div>
                  <h3 style={{ margin: 0 }}>📅 Select Order Frequency</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                    <div onClick={() => { setFreq('One-time / Daily'); setWizardStep(2); }} style={{ border: '2px solid #cbd5e1', borderRadius: '12px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer' }}>
                      🗓️ <strong>One-time / Daily</strong>
                    </div>
                    <div onClick={() => { setFreq('Monthly'); setWizardStep(2); }} style={{ border: '2px solid #cbd5e1', borderRadius: '12px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer' }}>
                      📆 <strong>Monthly Plan</strong>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div>
                  <h3 style={{ margin: 0 }}>🧺 Quantity & Service details</h3>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <div onClick={() => setWizardPlan('normal')} style={{ flex: 1, border: wizardPlan === 'normal' ? '2px solid #2563eb' : '2px solid #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                      Normal rate: QR {getServicePrice(wizardService, 'normal').toFixed(2)}
                    </div>
                    <div onClick={() => setWizardPlan('express')} style={{ flex: 1, border: wizardPlan === 'express' ? '2px solid #ef4444' : '2px solid #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                      Express rate: QR {getServicePrice(wizardService, 'express').toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700' }}>Item count</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                      <button onClick={() => setWizardQty(Math.max(1, wizardQty - 1))} style={{ padding: '6px 12px', background: '#cbd5e1', border: 'none', cursor: 'pointer' }}>−</button>
                      <strong style={{ fontSize: '1.25rem' }}>{wizardQty}</strong>
                      <button onClick={() => setWizardQty(wizardQty + 1)} style={{ padding: '6px 12px', background: '#cbd5e1', border: 'none', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <button onClick={() => setWizardStep(1)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>Back</button>
                    <button onClick={() => setWizardStep(3)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>Continue</button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div>
                  <h3 style={{ margin: 0 }}>👤 Delivery contact information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                    <input type="text" value={oName} onChange={e => setOName(e.target.value)} placeholder="Full name..." style={{ padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                    <input type="email" value={oEmail} onChange={e => setOEmail(e.target.value)} placeholder="Email..." style={{ padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                    <input type="text" value={oPhone} onChange={e => setOPhone(e.target.value)} placeholder="Phone..." style={{ padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                    <textarea value={oAddress} onChange={e => setOAddress(e.target.value)} placeholder="Address..." style={{ padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <button onClick={() => setWizardStep(2)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>Back</button>
                    <button onClick={() => setWizardStep(4)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>Continue</button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div>
                  <h3 style={{ margin: 0 }}>💳 Checkout payment details</h3>
                  
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value as any)} style={{ width: '100%', padding: '10px', margin: '16px 0', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                    <option value="upi">UPI / PayTM</option>
                    <option value="wallet">Wallet Balance</option>
                    <option value="credit">Credit Card</option>
                  </select>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="Coupon Code..." style={{ flex: 1, padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                    <button onClick={handleApplyPromo} style={{ padding: '10px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>Apply</button>
                  </div>
                  {promoApplied && <div style={{ color: '#16a34a', fontSize: '0.78rem', marginTop: '4px' }}>Applied: {promoApplied.code}</div>}

                  <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                    <span>Total sum:</span>
                    <span>QR {getGrandTotal().toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <button onClick={() => setWizardStep(3)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>Back</button>
                    <button onClick={handlePlaceOrder} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer' }}>Book order</button>
                  </div>
                </div>
              )}

              {wizardStep === 5 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem' }}>🎉</div>
                  <h3>Pickup scheduled successfully!</h3>
                  <button onClick={() => setShowWizard(false)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '16px' }}>Done</button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* TRACKING MODAL */}
      {selectedOrder && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0 }}>Order Tracking #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>Status:</strong> {selectedOrder.status}</div>
              <div><strong>Items:</strong> {selectedOrder.weightItems}</div>
              <div><strong>Total Amount:</strong> QR {selectedOrder.totalAmount.toFixed(2)}</div>
              <div><strong>Delivery agent:</strong> {selectedOrder.courier || 'Unassigned'}</div>
              
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['Created', 'Accepted', 'Received', 'Washing', 'Ready', 'Out For Delivery', 'Delivered'].map((st, idx) => {
                  const activeIdx = ['Created', 'Accepted', 'Received', 'Washing', 'Ready', 'Out For Delivery', 'Delivered'].indexOf(selectedOrder.status);
                  const stepIdx = ['Created', 'Accepted', 'Received', 'Washing', 'Ready', 'Out For Delivery', 'Delivered'].indexOf(st);
                  const isDone = activeIdx >= stepIdx;

                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: isDone ? '#16a34a' : '#cbd5e1' }}>{isDone ? '🟢' : '⚪'}</span>
                      <span style={{ fontWeight: isDone ? '700' : '400' }}>{st}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button onClick={() => setSelectedOrder(null)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
