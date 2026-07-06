import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, type Order, type Service, type Customer } from './DatabaseContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CartItem {
  service: Service;
  qty: number;
  express: boolean;
}

interface DrawerTx {
  id: string;
  type: 'Cash In' | 'Cash Out' | 'Shift Open' | 'Shift Close';
  amount: number;
  note: string;
  time: string;
}

// ─── Cashier Portal ──────────────────────────────────────────────────────────
export const CashierPortal: React.FC = () => {
  const { db, saveDB } = useDatabase();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'orders' | 'drawer' | 'receipt'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // POS state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posExpress, setPosExpress] = useState(false);
  const [posCategory, setPosCategory] = useState('All');
  const [posSearch, setPosSearch] = useState('');
  const [custId, setCustId] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Wallet'>('Cash');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Orders state
  const [ordersSearch, setOrdersSearch] = useState('');

  // Drawer state
  const [drawerTxs, setDrawerTxs] = useState<DrawerTx[]>(() => {
    try { return JSON.parse(localStorage.getItem('ll_cashier_drawer_txs') || '[]'); } catch { return []; }
  });
  const [txType, setTxType] = useState<'Cash In' | 'Cash Out' | 'Shift Open' | 'Shift Close'>('Cash In');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [shiftOpen, setShiftOpen] = useState(() => localStorage.getItem('ll_cashier_shift') === 'open');

  // Receipt view
  const [viewingReceipt, setViewingReceipt] = useState<Order | null>(null);

  // Sync drawer txs
  useEffect(() => {
    localStorage.setItem('ll_cashier_drawer_txs', JSON.stringify(drawerTxs));
  }, [drawerTxs]);

  // Auto-fill customer on ID select
  useEffect(() => {
    if (custId) {
      const cust = db.customers.find(c => c.id === custId);
      if (cust) {
        setCustName(cust.name);
        setCustPhone(cust.phone || '');
        setCustAddress(cust.address || '');
        setCustEmail(cust.email || '');
      }
    } else {
      setCustName(''); setCustPhone(''); setCustAddress(''); setCustEmail('');
    }
  }, [custId, db.customers]);

  // ─── Derived Data ───────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = db.orders.filter(o => o.date === today);
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.totalAmount || o.total || 0), 0);
  const pendingCount = todayOrders.filter(o => ['Pending', 'Placed', 'Accepted', 'Received', 'Washing'].includes(o.status)).length;
  const categories = ['All', ...Array.from(new Set(db.services.filter(s => s.active).map(s => s.category)))];
  const filteredServices = db.services.filter(s => {
    if (!s.active) return false;
    if (posCategory !== 'All' && s.category !== posCategory) return false;
    if (posSearch && !s.name.toLowerCase().includes(posSearch.toLowerCase())) return false;
    return true;
  });

  // ─── Cart Actions ───────────────────────────────────────────────────────────
  const addToCart = (srv: Service) => {
    const existing = cart.find(i => i.service.id === srv.id && i.express === posExpress);
    if (existing) {
      setCart(cart.map(i => i.service.id === srv.id && i.express === posExpress ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { service: srv, qty: 1, express: posExpress }]);
    }
  };
  const updateQty = (idx: number, delta: number) => {
    setCart(cart.map((i, ix) => ix === idx ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };
  const removeFromCart = (idx: number) => setCart(cart.filter((_, ix) => ix !== idx));
  const cartTotal = () => cart.reduce((s, i) => {
    let base = i.service.price;
    if (i.express) base *= 1.5;
    return s + base * i.qty;
  }, 0);

  // ─── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!shiftOpen) { alert('Please open your shift before processing orders.'); return; }

    const activeCompany = db.companies.find(c => c.id === db.activeCompanyId);
    const limits = activeCompany?.limits || { maxOrdersPerMonth: 2000, maxCustomers: 5000 };
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyOrdersCount = db.orders.filter(o => o.date.startsWith(currentMonth)).length;
    if (monthlyOrdersCount >= (limits.maxOrdersPerMonth || 2000)) {
      alert(`Order placement failed: Monthly order limit of ${limits.maxOrdersPerMonth || 2000} reached for this company portal.`);
      return;
    }

    const total = cartTotal();
    let updatedCustomers = db.customers;
    let customerId = 'guest';
    let customerName = custName || 'Walk-in Customer';

    if (custId) {
      const cust = db.customers.find(c => c.id === custId)!;
      customerId = cust.id;
      customerName = custName || cust.name;
      if (payMethod === 'Wallet') {
        if (cust.walletBalance < total) { alert('Insufficient wallet balance!'); return; }
        updatedCustomers = db.customers.map(c => c.id === custId ? { ...c, walletBalance: c.walletBalance - total } : c);
      }
    } else {
      if (payMethod === 'Wallet') { alert('Wallet payment is not available for walk-in customers!'); return; }
      if (custName) {
        if (db.customers.length >= (limits.maxCustomers || 5000)) {
          alert(`Failed to register walk-in customer: Limit of ${limits.maxCustomers || 5000} customers reached. Please checkout as Guest (clear name).`);
          return;
        }
        const newId = 'cust-' + Math.floor(10000 + Math.random() * 90000);
        customerId = newId;
        const newCust: Customer = {
          id: newId, name: custName, phone: custPhone,
          email: custEmail || `${newId}@laundra.com`, address: custAddress,
          walletBalance: 0, loyaltyPoints: 0, creditBalance: 0, notes: 'Walk-in (Cashier POS)'
        };
        updatedCustomers = [...db.customers, newCust];
      }
    }

    const orderId = 'OR-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder: Order = {
      id: orderId, customerId, customerName,
      branch: db.activeBranch, date: today,
      weightItems: `${cart.reduce((s, c) => s + c.qty, 0)} Items (Cashier POS)`,
      paymentMethod: payMethod, status: 'Washing',
      courier: null, deliveryStatus: 'Pending Assignment',
      totalAmount: total, total,
      phone: custPhone, address: custAddress,
      isManual: true, planType: posExpress ? 'Express' : 'Normal',
      services: cart.map(i => ({ ...i.service, qty: i.qty, express: i.express }))
    };

    saveDB({
      orders: [...db.orders, newOrder],
      drawerCash: payMethod === 'Cash' ? db.drawerCash + total : db.drawerCash,
      customers: updatedCustomers
    });

    // Log cash-in transaction
    if (payMethod === 'Cash') {
      const tx: DrawerTx = {
        id: 'tx-' + Date.now(), type: 'Cash In', amount: total,
        note: `Order #${orderId} — ${customerName}`, time: new Date().toLocaleTimeString()
      };
      setDrawerTxs(prev => [tx, ...prev]);
    }

    setViewingReceipt(newOrder);
    setCart([]); setCustId(''); setCustName(''); setCustPhone(''); setCustAddress(''); setCustEmail('');
    setCheckoutSuccess(true);
    setTimeout(() => setCheckoutSuccess(false), 3000);
    setActiveTab('receipt');
  };

  // ─── Drawer ──────────────────────────────────────────────────────────────────
  const handleDrawerTx = () => {
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) { alert('Enter a valid amount.'); return; }
    const tx: DrawerTx = {
      id: 'tx-' + Date.now(), type: txType, amount: amt, note: txNote,
      time: new Date().toLocaleTimeString()
    };
    setDrawerTxs(prev => [tx, ...prev]);
    if (txType === 'Cash In' || txType === 'Shift Open') saveDB({ drawerCash: db.drawerCash + amt });
    if (txType === 'Cash Out' || txType === 'Shift Close') saveDB({ drawerCash: Math.max(0, db.drawerCash - amt) });
    if (txType === 'Shift Open') { setShiftOpen(true); localStorage.setItem('ll_cashier_shift', 'open'); }
    if (txType === 'Shift Close') { setShiftOpen(false); localStorage.setItem('ll_cashier_shift', 'closed'); }
    setTxAmount(''); setTxNote('');
  };

  // ─── Order Status Update ──────────────────────────────────────────────────
  const updateOrderStatus = (id: string, status: Order['status']) => {
    saveDB({ orders: db.orders.map(o => o.id === id ? { ...o, status } : o) });
  };

  // ─── Receipt Print ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; }
        h2 { text-align: center; font-size: 18px; margin-bottom: 4px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .total { font-weight: bold; font-size: 15px; }
        .center { text-align: center; }
        .small { font-size: 11px; color: #555; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  // ─── Status badge helper ───────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    const s = status.toLowerCase();
    let bg = '#f8fafc', color = '#64748b';
    if (s === 'pending') { bg = '#fffbeb'; color = '#d97706'; }
    else if (s === 'washing' || s === 'processing') { bg = '#eff6ff'; color = '#2563eb'; }
    else if (s === 'ready') { bg = '#ecfdf5'; color = '#059669'; }
    else if (s === 'out for delivery') { bg = '#fdf2f8'; color = '#db2777'; }
    else if (s === 'delivered') { bg = '#f0fdf4'; color = '#16a34a'; }
    else if (s === 'cancelled') { bg = '#fef2f2'; color = '#dc2626'; }
    return (
      <span style={{ background: bg, color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
        {status === 'Received' ? 'Picked Up' : status}
      </span>
    );
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('ll_activerole');
    localStorage.removeItem('ll_cashier_shift');
    saveDB({ activeRole: '' });
    navigate('/');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'pos', label: 'POS / New Order', icon: '🛒' },
    { id: 'orders', label: "Today's Orders", icon: '📋' },
    { id: 'drawer', label: 'Drawer & Cash', icon: '💵' },
    { id: 'receipt', label: 'Receipt', icon: '🧾' },
  ] as const;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f1f5f9', fontFamily: "'Inter', 'Segoe UI', sans-serif", overflow: 'hidden' }}>

      {/* ─── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarOpen ? '240px' : '70px', minWidth: sidebarOpen ? '240px' : '70px',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        color: 'white', display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease', overflow: 'hidden', position: 'relative', zIndex: 10,
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
            💳
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.5px' }}>Cashier</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
                {shiftOpen ? <span style={{ color: '#4ade80' }}>● Shift Open</span> : <span style={{ color: '#f87171' }}>● Shift Closed</span>}
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(p => !p)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: activeTab === item.id ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
                color: activeTab === item.id ? 'white' : '#94a3b8',
                fontWeight: activeTab === item.id ? '700' : '500',
                fontSize: '0.875rem', textAlign: 'left', width: '100%',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === item.id ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Drawer balance chip */}
        {sidebarOpen && (
          <div style={{ margin: '8px', padding: '12px', background: 'rgba(59,130,246,0.15)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Drawer Cash</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#4ade80' }}>QR {db.drawerCash.toFixed(2)}</div>
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout} style={{
          margin: '8px', padding: '11px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: '600', fontSize: '0.875rem',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span>🚪</span>{sidebarOpen && 'Sign Out'}
        </button>
      </aside>

      {/* ─── MAIN ───────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ─── DASHBOARD ─────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, Cashier 👋</h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { label: "Today's Revenue", value: `QR ${todayRevenue.toFixed(2)}`, icon: '💰', bg: 'linear-gradient(135deg, #2563eb, #3b82f6)', sub: `${todayOrders.length} orders` },
                { label: "Today's Orders", value: todayOrders.length, icon: '📦', bg: 'linear-gradient(135deg, #7c3aed, #a855f7)', sub: 'All statuses' },
                { label: 'Pending / Active', value: pendingCount, icon: '⏳', bg: 'linear-gradient(135deg, #d97706, #f59e0b)', sub: 'Need attention' },
                { label: 'Drawer Balance', value: `QR ${db.drawerCash.toFixed(2)}`, icon: '🏦', bg: 'linear-gradient(135deg, #059669, #10b981)', sub: shiftOpen ? 'Shift Open' : 'Shift Closed' },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: kpi.bg, borderRadius: '16px', padding: '20px', color: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>{kpi.label}</span>
                    <span style={{ fontSize: '1.4rem' }}>{kpi.icon}</span>
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: '800' }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '6px' }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontWeight: '800', color: '#0f172a' }}>Quick Actions</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { label: '🛒 New Order (POS)', tab: 'pos' as const, bg: '#2563eb' },
                  { label: "📋 Today's Orders", tab: 'orders' as const, bg: '#7c3aed' },
                  { label: '💵 Drawer Log', tab: 'drawer' as const, bg: '#059669' },
                  { label: '🧾 Last Receipt', tab: 'receipt' as const, bg: '#d97706' },
                ].map(a => (
                  <button key={a.label} onClick={() => setActiveTab(a.tab)}
                    style={{ padding: '12px 20px', borderRadius: '10px', border: 'none', background: a.bg, color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent today's orders mini-table */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontWeight: '800', color: '#0f172a' }}>Recent Orders Today</h3>
              {todayOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No orders yet today.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {['Order ID', 'Customer', 'Amount', 'Payment', 'Status'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {todayOrders.slice(0, 5).map(o => (
                        <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: '700', color: '#2563eb', fontSize: '0.85rem' }}>#{o.id}</td>
                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#334155' }}>{o.customerName}</td>
                          <td style={{ padding: '10px 12px', fontWeight: '800', color: '#0f172a' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '0.85rem' }}>{o.paymentMethod}</td>
                          <td style={{ padding: '10px 12px' }}>{statusBadge(o.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── POS ────────────────────────────────────────────────────────── */}
        {activeTab === 'pos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', height: 'calc(100vh - 96px)' }}>
            {/* Service grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.2rem', color: '#0f172a' }}>🛒 Point of Sale</h2>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: posExpress ? '#ef4444' : '#64748b', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={posExpress} onChange={e => setPosExpress(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#ef4444' }} />
                    ⚡ Express (+50%)
                  </label>
                </div>
                <input value={posSearch} onChange={e => setPosSearch(e.target.value)} placeholder="🔍 Search services..." style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setPosCategory(cat)} style={{
                      padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700',
                      background: posCategory === cat ? 'linear-gradient(135deg, #2563eb, #8b5cf6)' : '#f1f5f9',
                      color: posCategory === cat ? 'white' : '#64748b'
                    }}>{cat}</button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px', alignContent: 'start' }}>
                {filteredServices.map(srv => (
                  <div key={srv.id} onClick={() => addToCart(srv)} style={{
                    background: 'white', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid #e2e8f0',
                    cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                  >
                    {srv.image && <img src={srv.image} alt={srv.name} style={{ width: '100%', height: '90px', objectFit: 'cover' }} />}
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a', marginBottom: '4px', lineHeight: 1.3 }}>{srv.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>{srv.category}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#2563eb' }}>
                          QR {posExpress ? (srv.price * 1.5).toFixed(2) : srv.price.toFixed(2)}
                        </span>
                        <span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: '700' }}>+ Add</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart & Checkout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
              {/* Cart */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>🧺 Cart ({cart.length})</h3>
                {cart.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '2.5rem' }}>🛒</span>
                    <span style={{ fontSize: '0.9rem' }}>Tap a service to add it</span>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>{item.service.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          QR {(item.express ? item.service.price * 1.5 : item.service.price).toFixed(2)} ea {item.express && <span style={{ color: '#ef4444', fontWeight: '700' }}>⚡</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => updateQty(idx, -1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                        <button onClick={() => updateQty(idx, 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        <button onClick={() => removeFromCart(idx)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#0f172a', minWidth: '60px', textAlign: 'right' }}>
                        QR {((item.express ? item.service.price * 1.5 : item.service.price) * item.qty).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer & Payment */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>👤 Customer</h3>
                <select value={custId} onChange={e => setCustId(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}>
                  <option value="">Walk-in / New Customer</option>
                  {db.customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
                {!custId && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Name" style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }} />
                    <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="Phone" style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }} />
                    <input value={custEmail} onChange={e => setCustEmail(e.target.value)} placeholder="Email" style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', gridColumn: '1 / -1' }} />
                    <input value={custAddress} onChange={e => setCustAddress(e.target.value)} placeholder="Address" style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', gridColumn: '1 / -1' }} />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    {(['Cash', 'Card', 'UPI', 'Wallet'] as const).map(m => (
                      <button key={m} onClick={() => setPayMethod(m)} style={{
                        padding: '9px', borderRadius: '8px', border: `2px solid ${payMethod === m ? '#2563eb' : '#e2e8f0'}`,
                        background: payMethod === m ? '#eff6ff' : 'white', color: payMethod === m ? '#2563eb' : '#64748b',
                        fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                      }}>{m}</button>
                    ))}
                  </div>
                </div>

                {/* Total & Checkout */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: '700', color: '#64748b' }}>Total</span>
                    <span style={{ fontWeight: '900', fontSize: '1.3rem', color: '#0f172a' }}>QR {cartTotal().toFixed(2)}</span>
                  </div>
                  <button onClick={handleCheckout} disabled={cart.length === 0}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                      background: cart.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                      color: 'white', fontWeight: '800', fontSize: '1rem',
                      boxShadow: cart.length > 0 ? '0 4px 14px rgba(37,99,235,0.3)' : 'none',
                      transition: 'all 0.2s'
                    }}>
                    ✅ Checkout — QR {cartTotal().toFixed(2)}
                  </button>
                  {cart.length > 0 && <button onClick={() => setCart([])} style={{ width: '100%', marginTop: '8px', padding: '9px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}>🗑 Clear Cart</button>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TODAY'S ORDERS ─────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.3rem', color: '#0f172a' }}>📋 Today's Orders</h2>
              <div style={{ background: 'white', borderRadius: '10px', padding: '8px 14px', border: '1.5px solid #e2e8f0', fontWeight: '700', color: '#2563eb', fontSize: '0.9rem' }}>
                {todayOrders.length} orders • QR {todayRevenue.toFixed(2)}
              </div>
            </div>
            <input value={ordersSearch} onChange={e => setOrdersSearch(e.target.value)} placeholder="🔍 Search by order ID or customer name..." style={{ padding: '11px 16px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', background: 'white' }} />

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {todayOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px', fontSize: '1rem' }}>No orders today yet. Create one in the POS tab!</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {['Order ID', 'Customer', 'Items', 'Amount', 'Payment', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {todayOrders
                        .filter(o => !ordersSearch || o.id.toLowerCase().includes(ordersSearch.toLowerCase()) || o.customerName.toLowerCase().includes(ordersSearch.toLowerCase()))
                        .map(o => (
                          <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ background: '#eff6ff', color: '#2563eb', fontWeight: '800', padding: '4px 9px', borderRadius: '6px', fontSize: '0.82rem' }}>#{o.id}</span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: '600', color: '#334155' }}>{o.customerName}</td>
                            <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.85rem' }}>{o.weightItems}</td>
                            <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</td>
                            <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#64748b' }}>{o.paymentMethod}</td>
                            <td style={{ padding: '12px 14px' }}>{statusBadge(o.status)}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value as Order['status'])}
                                  style={{ padding: '5px 8px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '600', outline: 'none', cursor: 'pointer' }}>
                                  {['Pending', 'Placed', 'Accepted', 'Received', 'Washing', 'Ironing', 'Processing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                                <button onClick={() => { setViewingReceipt(o); setActiveTab('receipt'); }} style={{ padding: '5px 10px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
                                  🧾 Receipt
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── DRAWER ─────────────────────────────────────────────────────── */}
        {activeTab === 'drawer' && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
            {/* Drawer form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Current balance */}
              <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '16px', padding: '24px', color: 'white', boxShadow: '0 4px 15px rgba(5,150,105,0.2)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85, marginBottom: '8px' }}>Drawer Balance</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>QR {db.drawerCash.toFixed(2)}</div>
                <div style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.9 }}>
                  Shift: {shiftOpen ? <span style={{ fontWeight: '700' }}>🟢 Open</span> : <span style={{ fontWeight: '700' }}>🔴 Closed</span>}
                </div>
              </div>

              {/* Log transaction */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ margin: 0, fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>💵 Log Transaction</h3>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {(['Cash In', 'Cash Out', 'Shift Open', 'Shift Close'] as const).map(t => (
                      <button key={t} onClick={() => setTxType(t)} style={{
                        padding: '9px', borderRadius: '8px', border: `2px solid ${txType === t ? '#2563eb' : '#e2e8f0'}`,
                        background: txType === t ? '#eff6ff' : 'white', color: txType === t ? '#2563eb' : '#64748b',
                        fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Amount (QR)</label>
                  <input type="number" min="0" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00"
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Note</label>
                  <input value={txNote} onChange={e => setTxNote(e.target.value)} placeholder="Optional note..."
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={handleDrawerTx} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
                  ✅ Log Transaction
                </button>
              </div>
            </div>

            {/* Transaction log */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: 0, fontWeight: '800', color: '#0f172a', fontSize: '1.1rem' }}>Transaction Log</h3>
              {drawerTxs.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>No transactions logged yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                  {drawerTxs.map(tx => {
                    const isIn = tx.type === 'Cash In' || tx.type === 'Shift Open';
                    return (
                      <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isIn ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                          {isIn ? '📥' : '📤'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>{tx.type}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{tx.note || 'No note'} • {tx.time}</div>
                        </div>
                        <div style={{ fontWeight: '800', fontSize: '1rem', color: isIn ? '#059669' : '#dc2626' }}>
                          {isIn ? '+' : '−'}QR {tx.amount.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── RECEIPT ────────────────────────────────────────────────────── */}
        {activeTab === 'receipt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '520px' }}>
              <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.3rem', color: '#0f172a' }}>🧾 Receipt</h2>
              <select value={viewingReceipt?.id || ''} onChange={e => {
                const o = db.orders.find(o => o.id === e.target.value);
                setViewingReceipt(o || null);
              }} style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', outline: 'none', fontWeight: '600', background: 'white' }}>
                <option value="">— Select an order —</option>
                {db.orders.map(o => <option key={o.id} value={o.id}>#{o.id} • {o.customerName} • QR {(o.totalAmount || o.total || 0).toFixed(2)}</option>)}
              </select>
            </div>

            {!viewingReceipt ? (
              <div style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧾</div>
                Select an order above or checkout from POS to view a receipt.
              </div>
            ) : (
              <>
                {/* Receipt card */}
                <div ref={receiptRef} style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '520px', width: '100%', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: "'Courier New', monospace" }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>🧺</div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', fontFamily: 'inherit' }}>Laundra</h2>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{db.activeBranch}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date().toLocaleString()}</div>
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>Order ID</span>
                      <span style={{ fontWeight: '700' }}>#{viewingReceipt.id}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>Customer</span>
                      <span style={{ fontWeight: '700' }}>{viewingReceipt.customerName}</span>
                    </div>
                    {viewingReceipt.phone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>Phone</span>
                        <span style={{ fontWeight: '700' }}>{viewingReceipt.phone}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>Date</span>
                      <span style={{ fontWeight: '700' }}>{viewingReceipt.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>Payment</span>
                      <span style={{ fontWeight: '700' }}>{viewingReceipt.paymentMethod}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '14px', marginBottom: '14px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Items</div>
                    {viewingReceipt.services && viewingReceipt.services.length > 0 ? (
                      viewingReceipt.services.map((s: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                          <span>{s.name} {s.express ? '⚡' : ''} × {s.qty || 1}</span>
                          <span style={{ fontWeight: '700' }}>QR {((s.express ? s.price * 1.5 : s.price) * (s.qty || 1)).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{viewingReceipt.weightItems}</div>
                    )}
                  </div>

                  <div style={{ borderTop: '2px solid #0f172a', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '800', fontSize: '1rem' }}>TOTAL</span>
                    <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>QR {(viewingReceipt.totalAmount || viewingReceipt.total || 0).toFixed(2)}</span>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Thank you for choosing Laundra! 🙏<br />
                    Status: <strong>{viewingReceipt.status === 'Received' ? 'Picked Up' : viewingReceipt.status}</strong>
                  </div>
                </div>

                <button onClick={handlePrint} style={{
                  padding: '13px 32px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white',
                  fontWeight: '800', cursor: 'pointer', fontSize: '1rem',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
                }}>
                  🖨️ Print Receipt
                </button>
              </>
            )}
          </div>
        )}

        {/* Checkout success toast */}
        {checkoutSuccess && (
          <div style={{
            position: 'fixed', bottom: '24px', right: '24px', background: 'linear-gradient(135deg, #059669, #10b981)',
            color: 'white', padding: '14px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem',
            boxShadow: '0 8px 24px rgba(5,150,105,0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            ✅ Order placed & receipt ready!
          </div>
        )}
      </main>
    </div>
  );
};
