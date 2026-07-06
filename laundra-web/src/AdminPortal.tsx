import React, { useState, useEffect } from 'react';
import { useDatabase, type Order, type Service, type Customer, type User, type Expense } from './DatabaseContext';
import { PortalLayout } from './components/PortalLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const AdminPortal: React.FC = () => {
  const { db, saveDB } = useDatabase();

  // Active Module tab state
  const [activeModule, setActiveModule] = useState<string>(() => {
    return localStorage.getItem('ll_active_admin_module') || 'sales-overview';
  });

  useEffect(() => {
    localStorage.setItem('ll_active_admin_module', activeModule);
  }, [activeModule]);

  // Adjust module tab based on role permissions on load
  useEffect(() => {
    if (db.activeRole === 'Delivery Boy') {
      const allowed = ['pending-orders', 'your-orders'];
      if (!allowed.includes(activeModule)) {
        setActiveModule('pending-orders');
      }
    }
  }, [db.activeRole]);

  // General Modal States
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  
  // Service Catalog Modals
  const [addingService, setAddingService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Expense Modals
  const [addingExpense, setAddingExpense] = useState(false);

  // CRM Modals
  const [adjustingWalletCust, setAdjustingWalletCust] = useState<Customer | null>(null);

  // POS State
  const [posCategory, setPosCategory] = useState('All');
  const [posSearch, setPosSearch] = useState('');
  const [posExpress, setPosExpress] = useState(false);
  const [posCart, setPosCart] = useState<{ service: Service; qty: number; express: boolean }[]>([]);
  const [posCustId, setPosCustId] = useState('');
  const [posCustName, setPosCustName] = useState('');
  const [posCustPhone, setPosCustPhone] = useState('');
  const [posCustAddress, setPosCustAddress] = useState('');
  const [posCustEmail, setPosCustEmail] = useState('');
  const [posPayMethod, setPosPayMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Wallet'>('Cash');
  const [activeReceipt, setActiveReceipt] = useState<Order | null>(null);

  // Users Management form inputs
  const [uName, setUName] = useState('');
  const [uRole, setURole] = useState<'admin' | 'delivery' | 'customer'>('delivery');
  const [uEmail, setUEmail] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uAddress, setUAddress] = useState('');
  const [uPassword, setUPassword] = useState('');

  // Service form inputs
  const [sName, setSName] = useState('');
  const [sCategory, setSCategory] = useState('Wash & Fold');
  const [sPrice, setSPrice] = useState('');
  const [sSurcharge, setSSurcharge] = useState('50');

  // Expense form inputs
  const [eCategory, setECategory] = useState('Chemicals & Detergents');
  const [eDesc, setEDesc] = useState('');
  const [eSource, setESource] = useState('Drawer Cash');
  const [eAmount, setEAmount] = useState('');

  // Wallet adjustment inputs
  const [walletAmt, setWalletAmt] = useState('');
  const [walletDir, setWalletDir] = useState<'in' | 'out'>('in');

  const [ordersSearch, setOrdersSearch] = useState('');
  const ordersBranchFilter = 'All';

  // KPI calculations
  const dailyOrders = db.orders.filter(o => o.frequency !== 'Monthly');
  const dailyCount = dailyOrders.length;
  const dailyRevenue = dailyOrders.reduce((acc, curr) => acc + (curr.totalAmount || curr.total || 0), 0);

  const monthlyOrders = db.orders.filter(o => o.frequency === 'Monthly');
  const monthlyCount = monthlyOrders.length;
  const monthlyRevenue = monthlyOrders.reduce((acc, curr) => acc + (curr.totalAmount || curr.total || 0), 0);

  const getServicePrice = (srv: Service | null, plan: 'normal' | 'express') => {
    if (!srv) return 0;
    let base = srv.price;
    if (plan === 'express') {
      base = base * 1.5;
    }
    return base;
  };

  // --- ACTIONS ---

  // Order Details Status update
  const handleUpdateOrderStatus = (orderId: string, nextStatus: any, nextDeliveryStatus: string) => {
    const updated = db.orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus, deliveryStatus: nextDeliveryStatus };
      }
      return o;
    });
    saveDB({ orders: updated });
    if (viewingOrder && viewingOrder.id === orderId) {
      setViewingOrder({ ...viewingOrder, status: nextStatus, deliveryStatus: nextDeliveryStatus });
    }
  };

  const handleUpdateOrderCourier = (orderId: string, courierName: string) => {
    const updated = db.orders.map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          courier: courierName, 
          deliveryStatus: courierName === 'All' ? 'Available to All Couriers' : (courierName ? 'Assigned to Courier' : 'Pending Assignment') 
        };
      }
      return o;
    });
    saveDB({ orders: updated });
    if (viewingOrder && viewingOrder.id === orderId) {
      setViewingOrder({ 
        ...viewingOrder, 
        courier: courierName, 
        deliveryStatus: courierName === 'All' ? 'Available to All Couriers' : (courierName ? 'Assigned to Courier' : 'Pending Assignment') 
      });
    }
  };

  const handleAcceptOrder = (order: Order) => {
    const courier = db.currentDeliveryBoy || 'John Doe';
    const updated = db.orders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          courier: courier,
          status: o.status === 'Ready' ? 'Ready' as const : 'Accepted' as const,
          deliveryStatus: o.status === 'Ready' ? 'Assigned for Delivery' : 'Accepted by Courier'
        };
      }
      return o;
    });
    saveDB({ orders: updated });
    // Redirect to Your Orders
    setActiveModule('your-orders');
  };

  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm('Delete order #' + orderId + '?')) {
      const updated = db.orders.filter(o => o.id !== orderId);
      saveDB({ orders: updated });
      setViewingOrder(null);
    }
  };

  // User Management actions
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();

    const activeCompany = db.companies.find(c => c.id === db.activeCompanyId);
    const limits = activeCompany?.limits || { maxAdmins: 3, maxCashiers: 5, maxDeliveryStaff: 10 };
    
    const currentAdmins = db.users.filter(u => u.role === 'admin').length;
    const currentCashiers = db.users.filter(u => u.role === 'cashier').length;
    const currentDelivery = db.users.filter(u => u.role === 'delivery').length;

    if (uRole === 'admin' && currentAdmins >= (limits.maxAdmins || 3)) {
      alert(`Resource Limit Reached: Maximum allowed Company Admins is ${limits.maxAdmins || 3}. Contact Platform Super Admin to upgrade.`);
      return;
    }
    if (uRole === 'cashier' && currentCashiers >= (limits.maxCashiers || 5)) {
      alert(`Resource Limit Reached: Maximum allowed Cashiers is ${limits.maxCashiers || 5}. Contact Platform Super Admin to upgrade.`);
      return;
    }
    if (uRole === 'delivery' && currentDelivery >= (limits.maxDeliveryStaff || 10)) {
      alert(`Resource Limit Reached: Maximum allowed Delivery Staff is ${limits.maxDeliveryStaff || 10}. Contact Platform Super Admin to upgrade.`);
      return;
    }

    const newUser: User = {
      id: 'u-' + (db.users.length + 1),
      name: uName,
      role: uRole,
      email: uEmail,
      phone: uPhone,
      address: uAddress,
      password: uPassword || 'password',
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    saveDB({ users: [...db.users, newUser] });
    setAddingUser(false);
    // Reset forms
    setUName('');
    setUEmail('');
    setUPhone('');
    setUAddress('');
    setUPassword('');
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updated = db.users.map(u => {
      if (u.id === editingUser.id) {
        return { ...u, name: uName, role: uRole, email: uEmail, phone: uPhone, address: uAddress };
      }
      return u;
    });
    saveDB({ users: updated });
    setEditingUser(null);
  };

  // Service Catalog actions
  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    const newService: Service = {
      id: 'srv-' + (db.services.length + 1),
      name: sName,
      category: sCategory,
      price: parseFloat(sPrice) || 0,
      expressSurcharge: parseInt(sSurcharge) || 50,
      active: true
    };
    saveDB({ services: [...db.services, newService] });
    setAddingService(false);
    setSName('');
    setSPrice('');
  };

  const handleSaveEditService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    const updated = db.services.map(s => {
      if (s.id === editingService.id) {
        return { ...s, name: sName, category: sCategory, price: parseFloat(sPrice) || 0, expressSurcharge: parseInt(sSurcharge) || 50 };
      }
      return s;
    });
    saveDB({ services: updated });
    setEditingService(null);
  };

  // Expense actions
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(eAmount) || 0;
    const newExpense: Expense = {
      date: new Date().toISOString().split('T')[0],
      category: eCategory,
      description: eDesc,
      source: eSource,
      loggedBy: db.activeRole + ' Agent',
      amount: amt
    };
    saveDB({
      expenses: [...db.expenses, newExpense],
      drawerCash: eSource === 'Drawer Cash' ? db.drawerCash - amt : db.drawerCash
    });
    setAddingExpense(false);
    setEDesc('');
    setEAmount('');
  };

  // Wallet adjustment
  const handleAdjustWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingWalletCust) return;
    const amt = parseFloat(walletAmt) || 0;
    const diff = walletDir === 'in' ? amt : -amt;

    const updated = db.customers.map(c => {
      if (c.id === adjustingWalletCust.id) {
        return { ...c, walletBalance: Math.max(0, c.walletBalance + diff) };
      }
      return c;
    });
    saveDB({ customers: updated });
    setAdjustingWalletCust(null);
    setWalletAmt('');
  };

  // Update customer fields when posCustId changes
  useEffect(() => {
    if (posCustId) {
      const cust = db.customers.find(c => c.id === posCustId);
      if (cust) {
        setPosCustName(cust.name);
        setPosCustPhone(cust.phone || '');
        setPosCustAddress(cust.address || '');
        setPosCustEmail(cust.email || '');
      }
    } else {
      setPosCustName('');
      setPosCustPhone('');
      setPosCustAddress('');
      setPosCustEmail('');
    }
  }, [posCustId, db.customers]);

  // --- POS CART ACTIONS ---
  const handleAddCartItem = (srv: Service) => {
    const existing = posCart.find(item => item.service.id === srv.id && item.express === posExpress);
    if (existing) {
      setPosCart(posCart.map(item => item.service.id === srv.id && item.express === posExpress ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setPosCart([...posCart, { service: srv, qty: 1, express: posExpress }]);
    }
  };

  const handleUpdateCartQty = (idx: number, delta: number) => {
    const updated = posCart.map((item, i) => {
      if (i === idx) {
        return { ...item, qty: Math.max(1, item.qty + delta) };
      }
      return item;
    });
    setPosCart(updated);
  };

  const handleRemoveCartItem = (idx: number) => {
    setPosCart(posCart.filter((_, i) => i !== idx));
  };

  const getPOSCartTotal = () => {
    return posCart.reduce((sum, item) => {
      let base = item.service.price;
      if (item.express) base = base * 1.5;
      return sum + (base * item.qty);
    }, 0);
  };

  const handleCheckoutPOS = () => {
    if (posCart.length === 0) return;

    const activeCompany = db.companies.find(c => c.id === db.activeCompanyId);
    const limits = activeCompany?.limits || { maxOrdersPerMonth: 2000, maxCustomers: 5000 };
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyOrdersCount = db.orders.filter(o => o.date.startsWith(currentMonth)).length;
    if (monthlyOrdersCount >= (limits.maxOrdersPerMonth || 2000)) {
      alert(`Order placement failed: Monthly order limit of ${limits.maxOrdersPerMonth || 2000} reached for this company portal.`);
      return;
    }
    
    const isGuest = !posCustId;
    const total = getPOSCartTotal();
    
    let updatedCustomers = db.customers;
    let customerId = 'guest';
    let customerName = posCustName || 'Guest Customer';

    if (!isGuest) {
      const cust = db.customers.find(c => c.id === posCustId)!;
      customerId = cust.id;
      customerName = posCustName || cust.name;

      if (posPayMethod === 'Wallet') {
        if (cust.walletBalance < total) {
          alert('Insufficient customer wallet balance!');
          return;
        }
      }

      updatedCustomers = db.customers.map(c => {
        if (c.id === cust.id) {
          return { 
            ...c, 
            name: posCustName || c.name,
            phone: posCustPhone || c.phone,
            address: posCustAddress || c.address,
            email: posCustEmail || c.email,
            walletBalance: posPayMethod === 'Wallet' ? c.walletBalance - total : c.walletBalance 
          };
        }
        return c;
      });
    } else {
      if (posPayMethod === 'Wallet') {
        alert('Wallet payment is not available for Guest checkout!');
        return;
      }
      
      // If walk-in guest has entered a name, register them automatically
      if (posCustName) {
        if (db.customers.length >= (limits.maxCustomers || 5000)) {
          alert(`Failed to register walk-in customer: Limit of ${limits.maxCustomers || 5000} customers reached. Checkouts can only be done as Guest (leave customer name empty or clear customer details).`);
          return;
        }
        const newCustId = 'cust-' + Math.floor(10000 + Math.random() * 90000);
        customerId = newCustId;
        customerName = posCustName;
        const newCustomer: Customer = {
          id: newCustId,
          name: posCustName,
          phone: posCustPhone,
          email: posCustEmail || `${newCustId}@laundra.com`,
          address: posCustAddress,
          walletBalance: 0,
          loyaltyPoints: 0,
          creditBalance: 0,
          notes: 'Walk-in Customer'
        };
        updatedCustomers = [...db.customers, newCustomer];
      }
    }

    const orderId = 'OR-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder: Order = {
      id: orderId,
      customerId: customerId,
      customerName: customerName,
      branch: db.activeBranch,
      date: new Date().toISOString().split('T')[0],
      weightItems: `${posCart.reduce((s, c) => s + c.qty, 0)} Items (POS checkout)`,
      paymentMethod: posPayMethod,
      status: 'Washing',
      courier: null,
      deliveryStatus: 'Pending Assignment',
      totalAmount: total,
      total: total,
      phone: posCustPhone,
      address: posCustAddress,
      isManual: true,
      planType: posExpress ? 'Express' : 'Normal'
    };

    saveDB({
      orders: [...db.orders, newOrder],
      drawerCash: posPayMethod === 'Cash' ? db.drawerCash + total : db.drawerCash,
      customers: updatedCustomers
    });

    setPosCart([]);
    setActiveReceipt(newOrder);
    setPosCustName('');
    setPosCustPhone('');
    setPosCustAddress('');
    setPosCustEmail('');
    setPosCustId('');
  };

  return (
    <PortalLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      
      {/* 1. SALES OVERVIEW MODULE */}
      {activeModule === 'sales-overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stats KPI grid */}
          <div className="stats-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Daily Orders KPI */}
            <div className="stat-card-premium" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Daily Orders (One-Time)</span>
                <span style={{ fontSize: '1.5rem' }}>🗓️</span>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>QR {dailyRevenue.toFixed(2)}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.85, marginTop: '8px', fontWeight: '600' }}>
                Total Booked: {dailyCount} {dailyCount === 1 ? 'Order' : 'Orders'}
              </div>
            </div>

            {/* Monthly Orders KPI */}
            <div className="stat-card-premium" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Monthly Subscription Orders</span>
                <span style={{ fontSize: '1.5rem' }}>📆</span>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>QR {monthlyRevenue.toFixed(2)}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.85, marginTop: '8px', fontWeight: '600' }}>
                Total Active: {monthlyCount} {monthlyCount === 1 ? 'Order' : 'Orders'}
              </div>
            </div>
          </div>

          {/* Tables Row: Daily vs Monthly */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Daily Orders Table */}
            <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>📋 Recent Daily Orders</h3>
              {dailyOrders.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No daily orders recorded yet.</div>
              ) : (
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>ID</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Customer</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyOrders.slice(0, 5).map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: '700' }}>#{o.id}</td>
                        <td style={{ padding: '10px', fontWeight: '600', color: '#334155' }}>{o.customerName}</td>
                        <td style={{ padding: '10px', fontWeight: '800', color: '#0f172a' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '12px', fontWeight: '700' }}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Monthly Orders Table */}
            <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>📋 Recent Monthly Orders</h3>
              {monthlyOrders.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No monthly subscription orders yet.</div>
              ) : (
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>ID</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Customer</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyOrders.slice(0, 5).map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: '700' }}>#{o.id}</td>
                        <td style={{ padding: '10px', fontWeight: '600', color: '#334155' }}>{o.customerName}</td>
                        <td style={{ padding: '10px', fontWeight: '800', color: '#0f172a' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ fontSize: '0.72rem', background: '#faf5ff', color: '#7c3aed', padding: '3px 8px', borderRadius: '12px', fontWeight: '700' }}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 2. DAILY ORDERS MODULE */}
      {activeModule === 'daily-orders' && (
        <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          
          {/* Filters row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="Search order ID, customer name..." 
              value={ordersSearch}
              onChange={(e) => setOrdersSearch(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* Orders Table */}
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Assigned Courier</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {db.orders
                .filter(o => {
                  const isDaily = o.frequency !== 'Monthly';
                  const isExpress = o.planType?.toLowerCase() === 'express';
                  const matchesSearch = o.id.toLowerCase().includes(ordersSearch.toLowerCase()) || o.customerName.toLowerCase().includes(ordersSearch.toLowerCase());
                  const matchesBranch = ordersBranchFilter === 'All' || o.branch === ordersBranchFilter;
                  return isDaily && !isExpress && matchesSearch && matchesBranch;
                })
                .map(o => {
                  const displayStatus = o.status === 'Received' ? 'Picked Up' : o.status;
                  
                  // Determine status badge style dynamically
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
                    <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '800', color: '#1e40af', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                          #{o.id}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#334155' }}>{o.customerName}</td>
                      <td style={{ padding: '12px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>{o.date}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          background: badgeStyle.bg, 
                          color: badgeStyle.text, 
                          border: `1px solid ${badgeStyle.border}`,
                          fontSize: '0.75rem', 
                          fontWeight: '700', 
                          padding: '5px 12px', 
                          borderRadius: '20px',
                          textTransform: 'capitalize',
                          display: 'inline-block'
                        }}>
                          {displayStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          background: o.courier === 'All' ? '#eff6ff' : (o.courier ? '#f1f5f9' : '#fff5f5'), 
                          color: o.courier === 'All' ? '#2563eb' : (o.courier ? '#475569' : '#e11d48'), 
                          border: `1px solid ${o.courier === 'All' ? '#bfdbfe' : (o.courier ? '#cbd5e1' : '#ffe4e6')}`,
                          fontSize: '0.75rem', 
                          fontWeight: '700', 
                          padding: '5px 12px', 
                          borderRadius: '20px',
                          display: 'inline-block'
                        }}>
                          {o.courier === 'All' ? 'All Delivery Staff' : (o.courier ? `👤 ${o.courier}` : 'Pending Assignment')}
                        </span>
                      </td>
                      <td style={{ padding: '12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          onClick={() => setViewingOrder(o)} 
                          className="primary-btn" 
                          style={{ 
                            padding: '6px 14px', 
                            fontSize: '0.8rem', 
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          👁️ View
                        </button>
                        <button 
                          onClick={() => handleDeleteOrder(o.id)} 
                          className="primary-btn" 
                          style={{ 
                            padding: '6px 14px', 
                            fontSize: '0.8rem', 
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* MONTHLY ORDERS MODULE */}
      {activeModule === 'monthly-orders' && (
        <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          {/* Filters row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="Search monthly order ID, customer name..." 
              value={ordersSearch}
              onChange={(e) => setOrdersSearch(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* Orders Table */}
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Items Details</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Assigned Courier</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {db.orders
                .filter(o => {
                  const isMonthly = o.frequency === 'Monthly';
                  const matchesSearch = o.id.toLowerCase().includes(ordersSearch.toLowerCase()) || o.customerName.toLowerCase().includes(ordersSearch.toLowerCase());
                  const matchesBranch = ordersBranchFilter === 'All' || o.branch === ordersBranchFilter;
                  return isMonthly && matchesSearch && matchesBranch;
                })
                .map(o => {
                  const displayStatus = o.status === 'Received' ? 'Picked Up' : o.status;
                  
                  // Determine status badge style dynamically
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
                    <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '800', color: '#1e40af', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                          #{o.id}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#334155' }}>{o.customerName}</td>
                      <td style={{ padding: '12px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>{o.date}</td>
                      <td style={{ padding: '12px', color: '#475569', fontWeight: '600', fontSize: '0.88rem' }}>{o.weightItems}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          background: badgeStyle.bg, 
                          color: badgeStyle.text, 
                          border: `1px solid ${badgeStyle.border}`,
                          fontSize: '0.75rem', 
                          fontWeight: '700', 
                          padding: '5px 12px', 
                          borderRadius: '20px',
                          textTransform: 'capitalize',
                          display: 'inline-block'
                        }}>
                          {displayStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          background: o.courier === 'All' ? '#eff6ff' : (o.courier ? '#f1f5f9' : '#fff5f5'), 
                          color: o.courier === 'All' ? '#2563eb' : (o.courier ? '#475569' : '#e11d48'), 
                          border: `1px solid ${o.courier === 'All' ? '#bfdbfe' : (o.courier ? '#cbd5e1' : '#ffe4e6')}`,
                          fontSize: '0.75rem', 
                          fontWeight: '700', 
                          padding: '5px 12px', 
                          borderRadius: '20px',
                          display: 'inline-block'
                        }}>
                          {o.courier === 'All' ? 'All Delivery Staff' : (o.courier ? `👤 ${o.courier}` : 'Pending Assignment')}
                        </span>
                      </td>
                      <td style={{ padding: '12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          onClick={() => setViewingOrder(o)} 
                          className="primary-btn" 
                          style={{ 
                            padding: '6px 14px', 
                            fontSize: '0.8rem', 
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          👁️ View
                        </button>
                        <button 
                          onClick={() => handleDeleteOrder(o.id)} 
                          className="primary-btn" 
                          style={{ 
                            padding: '6px 14px', 
                            fontSize: '0.8rem', 
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. PENDING ORDERS MODULE */}
      {activeModule === 'pending-orders' && (
        <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800' }}>Available Deliveries / Pickups</h3>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Items Details</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Logistics Status</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.orders
                .filter(o => {
                  // Only show if the order is unassigned or assigned to 'All'
                  if (o.courier === 'All' || !o.courier) {
                    // Do not show if already delivered or cancelled
                    if (o.status === 'Delivered' || o.status === 'Cancelled') return false;
                    // For manual orders, hide from delivery boys if they are still in default Washing state
                    if (o.isManual && o.status === 'Washing') return false;
                    return true;
                  }
                  return false;
                })
                .map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>#{o.id}</td>
                    <td style={{ padding: '12px' }}>{o.customerName}</td>
                    <td style={{ padding: '12px' }}>{o.weightItems}</td>
                    <td style={{ padding: '12px' }}>
                      <span className="live-badge" style={{ background: '#fef3c7', color: '#d97706' }}>{o.deliveryStatus}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <button onClick={() => setViewingOrder(o)} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#3b82f6', color: '#3b82f6', background: 'transparent' }}>
                        👁️ View
                      </button>
                      <button onClick={() => handleAcceptOrder(o)} className="primary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
                        Accept Delivery
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. YOUR ORDERS MODULE */}
      {activeModule === 'your-orders' && (
        <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800' }}>Orders Assigned to You</h3>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Items</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Progress</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {db.orders
                .filter(o => o.courier === (db.currentDeliveryBoy || 'John Doe'))
                .map(o => {
                  const displayStatus = o.status === 'Received' ? 'Picked Up' : o.status;
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>#{o.id}</td>
                      <td style={{ padding: '12px' }}>{o.customerName}</td>
                      <td style={{ padding: '12px' }}>{o.weightItems}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`status-badge status-${displayStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        <button onClick={() => setViewingOrder(o)} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#3b82f6', color: '#3b82f6', background: 'transparent' }}>
                          👁️ View
                        </button>
                        {(o.status === 'Pending' || o.status === 'Accepted') && (
                          <button 
                            onClick={() => handleUpdateOrderStatus(o.id, 'Received', 'Picked Up')} 
                            className="primary-btn" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            Picked Up
                          </button>
                        )}
                        {o.status === 'Ready' && (
                          <button 
                            onClick={() => handleUpdateOrderStatus(o.id, 'Out for Delivery', 'Out for Delivery')} 
                            className="primary-btn" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#f59e0b', border: 'none', color: 'white' }}
                          >
                            Out for Delivery
                          </button>
                        )}
                        {o.status === 'Out for Delivery' && (
                          <button 
                            onClick={() => {
                              handleUpdateOrderStatus(o.id, 'Delivered', 'Delivered');
                              if ((window as any).confetti) (window as any).confetti();
                            }} 
                            className="primary-btn" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#10b981', border: 'none', color: 'white' }}
                          >
                            Mark Delivered
                          </button>
                        )}
                        {['Received', 'Washing', 'Ironing', 'Processing'].includes(o.status) && (
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Washing in progress...</span>
                        )}
                        {o.status === 'Delivered' && (
                          <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: '700' }}>✓ Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. DELIVERY STATUS MODULE */}
      {activeModule === 'delivery-status' && (
        <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Active Courier Tracking</h3>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Courier</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Destination</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {db.orders
                .filter(o => o.courier)
                .map(o => {
                  const displayStatus = o.status === 'Received' ? 'Picked Up' : o.status;
                  
                  // Determine status badge style dynamically
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
                    <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontWeight: '800', color: '#1e40af', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                          #{o.id}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#334155' }}>
                        <span style={{ marginRight: '6px' }}>👤</span>{o.courier === 'All' ? 'All Delivery Staff' : o.courier}
                      </td>
                      <td style={{ padding: '12px', color: '#475569', fontWeight: '500' }}>
                        <span style={{ marginRight: '6px', color: '#ef4444' }}>📍</span>{o.address || 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          background: badgeStyle.bg, 
                          color: badgeStyle.text, 
                          border: `1px solid ${badgeStyle.border}`,
                          fontSize: '0.75rem', 
                          fontWeight: '700', 
                          padding: '5px 12px', 
                          borderRadius: '20px',
                          textTransform: 'capitalize',
                          display: 'inline-block'
                        }}>
                          {displayStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setViewingOrder(o)} 
                          className="primary-btn" 
                          style={{ 
                            padding: '6px 14px', 
                            fontSize: '0.8rem', 
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. USER MANAGEMENT MODULE */}
      {activeModule === 'user-management' && (
        <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Staff Members</h3>
            <button 
              onClick={() => setAddingUser(true)} 
              className="primary-btn" 
              style={{ 
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
                color: 'white', 
                border: 'none', 
                padding: '10px 18px', 
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ➕ Add User
            </button>
          </div>
          
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>Staff Name</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Email Address</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Phone Number</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.users.filter(u => u.role !== 'customer').map(u => {
                // Role pill badge style
                let roleStyle = { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
                const roleLower = u.role.toLowerCase();
                if (roleLower === 'admin') roleStyle = { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
                else if (roleLower === 'cashier') roleStyle = { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
                else if (roleLower === 'delivery') roleStyle = { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' };

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#1e293b' }}>{u.name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: roleStyle.bg, 
                        color: roleStyle.text, 
                        border: `1px solid ${roleStyle.border}`,
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        padding: '4px 10px', 
                        borderRadius: '20px',
                        textTransform: 'capitalize',
                        display: 'inline-block'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#475569', fontWeight: '500' }}>{u.email}</td>
                    <td style={{ padding: '12px', color: '#475569', fontWeight: '500' }}>{u.phone || 'N/A'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <button 
                        onClick={() => { setSelectedUser(u); }} 
                        className="primary-btn" 
                        style={{ 
                          padding: '6px 14px', 
                          fontSize: '0.8rem', 
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        👁️ View
                      </button>
                      <button 
                        onClick={() => { 
                          setEditingUser(u); 
                          setUName(u.name); 
                          setURole(u.role); 
                          setUEmail(u.email); 
                          setUPhone(u.phone || ''); 
                          setUAddress(u.address || ''); 
                        }} 
                        className="primary-btn" 
                        style={{ 
                          padding: '6px 14px', 
                          fontSize: '0.8rem', 
                          background: 'linear-gradient(135deg, #475569, #334155)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. CUSTOMER USERS MODULE */}
      {activeModule === 'customer-users' && (
        <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Registered Customer Accounts</h3>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>Customer ID</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Password</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {db.users.filter(u => u.role === 'customer').map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: '800', color: '#1e40af', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                      {u.id}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#334155' }}>{u.name}</td>
                  <td style={{ padding: '12px', color: '#64748b', fontWeight: '500' }}>{u.email}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', color: '#475569', fontSize: '0.88rem' }}>{u.password || 'password'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedUser(u)} 
                      className="primary-btn" 
                      style={{ 
                        padding: '6px 14px', 
                        fontSize: '0.8rem', 
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      👁️ View
                    </button>
                    <button 
                      onClick={() => {
                        const confirmed = confirm(`Are you sure you want to delete customer "${u.name}"?`);
                        if (confirmed) {
                          const nextUsers = db.users.filter(usr => usr.id !== u.id);
                          const nextCustomers = db.customers.filter(c => c.email.toLowerCase() !== u.email.toLowerCase());
                          saveDB({ 
                            users: nextUsers,
                            customers: nextCustomers
                          });
                        }
                      }}
                      className="secondary-btn" 
                      style={{ 
                        padding: '6px 14px', 
                        fontSize: '0.8rem', 
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: '1.5px solid #fee2e2',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        marginLeft: '8px'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}



      {/* 11. SERVICES CATALOG MODULE */}
      {activeModule === 'services' && (
        <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Catalog Items</h3>
            <button 
              onClick={() => setAddingService(true)} 
              className="primary-btn" 
              style={{ 
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
                color: 'white', 
                border: 'none', 
                padding: '10px 18px', 
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ➕ Add Service
            </button>
          </div>

          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '12px' }}>Service Details</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Rate</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Express Surcharge</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.services.map(s => {
                // Determine Category Badges style
                let categoryStyle = { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
                const cat = s.category.toLowerCase();
                if (cat === 'wash & fold') categoryStyle = { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
                else if (cat === 'dry cleaning') categoryStyle = { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
                else if (cat === 'steam press') categoryStyle = { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
                else if (cat === 'premium services') categoryStyle = { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' };
                else if (cat === 'express services') categoryStyle = { bg: '#fff1f2', text: '#e11d48', border: '#ffe4e6' };
                else if (cat === 'hotel laundry') categoryStyle = { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
                else if (cat === 'commercial laundry') categoryStyle = { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };

                // Express surcharge badge style
                const hasSurcharge = s.expressSurcharge > 0;
                const surchargeStyle = hasSurcharge 
                  ? { bg: '#fff5f5', text: '#e11d48', border: '#ffe4e6' } 
                  : { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {s.image ? (
                          <img 
                            src={s.image} 
                            alt={s.name} 
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid #cbd5e1' }}>
                            🧺
                          </div>
                        )}
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: categoryStyle.bg, 
                        color: categoryStyle.text, 
                        border: `1px solid ${categoryStyle.border}`,
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        padding: '4px 10px', 
                        borderRadius: '20px',
                        textTransform: 'capitalize',
                        display: 'inline-block'
                      }}>
                        {s.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '800', color: '#0f172a', fontSize: '0.98rem' }}>QR {s.price.toFixed(2)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: surchargeStyle.bg, 
                        color: surchargeStyle.text, 
                        border: `1px solid ${surchargeStyle.border}`,
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        padding: '4px 10px', 
                        borderRadius: '20px',
                        display: 'inline-block'
                      }}>
                        {s.expressSurcharge}% {hasSurcharge ? 'surcharge' : 'surcharge'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => { 
                          setEditingService(s); 
                          setSName(s.name); 
                          setSCategory(s.category); 
                          setSPrice(s.price.toString()); 
                          setSSurcharge(s.expressSurcharge.toString()); 
                        }} 
                        className="primary-btn" 
                        style={{ 
                          padding: '6px 14px', 
                          fontSize: '0.8rem', 
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 12. POS BILLING MODULE */}
      {activeModule === 'pos' && (
        <div className="pos-workspace-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px', height: 'calc(100vh - 140px)' }}>
          
          <div className="pos-catalog-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>
            <div className="pos-category-scroller" style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '8px', flexShrink: 0 }}>
              {['All', 'Wash & Fold', 'Dry Cleaning', 'Steam Press', 'Premium Services', 'Express Services', 'Hotel Laundry', 'Commercial Laundry'].map(cat => (
                <button 
                  key={cat}
                  data-category={cat}
                  onClick={() => setPosCategory(cat)}
                  className={`pos-category-btn ${posCategory === cat ? 'active' : ''}`}
                  style={{ whiteSpace: 'nowrap', border: '1.5px solid #cbd5e1', borderRadius: '20px', padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700', flexShrink: 0 }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="pos-search-row" style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center', flexShrink: 0 }}>
              <input 
                type="text" 
                placeholder="Search catalog items..." 
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '700', color: '#475569', background: '#f8fafc', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', userSelect: 'none' }}>
                <input type="checkbox" checked={posExpress} onChange={(e) => setPosExpress(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <span>⚡ Express Surcharge (+50%)</span>
              </label>
            </div>

            <div className="pos-services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', overflowY: 'auto', paddingRight: '8px', flex: 1, alignContent: 'start' }}>
              {db.services
                .filter(s => {
                const matchSearch = s.name.toLowerCase().includes(posSearch.toLowerCase());
                const matchCategory = posCategory === 'All' || s.category === posCategory;
                return s.active && matchSearch && matchCategory;
              })
              .map(s => (
                <div 
                  key={s.id} 
                  onClick={() => handleAddCartItem(s)} 
                  style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'all 0.18s ease' }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(37,99,235,0.06)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.3 }}>{s.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>{s.category}</span>
                    <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '1rem' }}>
                      QR {getServicePrice(s, posExpress ? 'express' : 'normal').toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pos-cart-panel" style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>Manual Order Cart</h3>
            
            <select 
              value={posCustId} 
              onChange={(e) => setPosCustId(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: '600', fontSize: '0.88rem', outline: 'none', cursor: 'pointer', backgroundColor: '#f8fafc' }}
            >
              <option value="">👤 Walk-in / Guest Customer</option>
              {db.customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} (Balance: QR {c.walletBalance.toFixed(2)})</option>
              ))}
            </select>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', margin: '8px 0' }}>
              {posCart.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛒</div>
                  <div>Cart is empty</div>
                </div>
              ) : (
                posCart.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>{item.service.name}</div>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: '700', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        background: item.express ? '#ffe4e6' : '#f1f5f9',
                        color: item.express ? '#e11d48' : '#475569',
                        display: 'inline-block',
                        marginTop: '4px'
                      }}>
                        {item.express ? '⚡ Express' : 'Normal'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => handleUpdateCartQty(idx, -1)} 
                        style={{ border: '1px solid #cbd5e1', background: '#f8fafc', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: '800', fontSize: '0.9rem', minWidth: '18px', textAlign: 'center' }}>{item.qty}</span>
                      <button 
                        onClick={() => handleUpdateCartQty(idx, 1)} 
                        style={{ border: '1px solid #cbd5e1', background: '#f8fafc', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}
                      >
                        +
                      </button>
                      <button 
                        onClick={() => handleRemoveCartItem(idx)} 
                        style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1rem', marginLeft: '6px' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Details Form shows when cart has items */}
            {posCart.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', flexShrink: 0 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: '800', color: '#1e293b' }}>Customer Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Customer Name" 
                    value={posCustName} 
                    onChange={(e) => setPosCustName(e.target.value)} 
                    style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', outline: 'none' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Phone Number" 
                    value={posCustPhone} 
                    onChange={(e) => setPosCustPhone(e.target.value)} 
                    style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Address" 
                    value={posCustAddress} 
                    onChange={(e) => setPosCustAddress(e.target.value)} 
                    style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', outline: 'none' }}
                  />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={posCustEmail} 
                    onChange={(e) => setPosCustEmail(e.target.value)} 
                    style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.15rem', marginBottom: '16px', color: '#0f172a' }}>
                <span>Total Amount:</span>
                <span style={{ color: '#2563eb' }}>QR {getPOSCartTotal().toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {['Cash', 'Card', 'UPI', 'Wallet'].map(m => (
                  <button 
                    key={m}
                    onClick={() => setPosPayMethod(m as any)}
                    style={{ 
                      flex: 1, 
                      padding: '10px 0', 
                      fontSize: '0.82rem', 
                      fontWeight: '700',
                      borderRadius: '8px',
                      border: '1.5px solid',
                      borderColor: posPayMethod === m ? '#2563eb' : '#cbd5e1',
                      background: posPayMethod === m ? '#eff6ff' : '#ffffff',
                      color: posPayMethod === m ? '#2563eb' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleCheckoutPOS}
                disabled={posCart.length === 0}
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  height: '46px', 
                  background: posCart.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
                  color: 'white', 
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  cursor: posCart.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: posCart.length === 0 ? 'none' : '0 4px 12px rgba(37,99,235,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                Place Order & Print Invoice
              </button>
            </div>
          </div>

        </div>
      )}

      {activeModule === 'manual-orders-list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Row with Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontWeight: '800', color: '#0f172a', fontSize: '1.1rem' }}>Manual Order Entries</h3>
            <input 
              type="text" 
              placeholder="Search by Order ID or Customer Name..." 
              value={ordersSearch} 
              onChange={(e) => setOrdersSearch(e.target.value)} 
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', width: '320px', fontSize: '0.88rem' }}
            />
          </div>

          {/* Orders Table Card */}
          <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '0 20px' }}>
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Order ID</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Items & Description</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Payment</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.orders
                    .filter(o => o.isManual)
                    .filter(o => {
                      const s = ordersSearch.toLowerCase();
                      return o.id.toLowerCase().includes(s) || o.customerName.toLowerCase().includes(s);
                    })
                    .map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 12px', fontWeight: '700', color: '#2563eb', whiteSpace: 'nowrap' }}>#{o.id}</td>
                        <td style={{ padding: '16px 12px', fontWeight: '600', color: '#1e293b' }}>
                          <div>{o.customerName}</div>
                          {o.phone && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {o.phone}</span>}
                        </td>
                        <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{o.date}</td>
                        <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem' }}>{o.weightItems}</td>
                        <td style={{ padding: '16px 12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</td>
                        <td style={{ padding: '16px 12px', fontSize: '0.85rem' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontWeight: '700',
                            background: o.paymentMethod === 'Cash' ? '#ecfdf5' : o.paymentMethod === 'Wallet' ? '#eff6ff' : '#f8fafc',
                            color: o.paymentMethod === 'Cash' ? '#059669' : o.paymentMethod === 'Wallet' ? '#2563eb' : '#475569',
                            border: '1px solid',
                            borderColor: o.paymentMethod === 'Cash' ? '#a7f3d0' : o.paymentMethod === 'Wallet' ? '#bfdbfe' : '#e2e8f0'
                          }}>
                            {o.paymentMethod}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <span className={`status-pill ${o.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => setViewingOrder(o)}
                            className="secondary-btn" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '700' }}
                          >
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    ))}
                  {db.orders.filter(o => o.isManual).length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📄</div>
                        <div style={{ fontWeight: '600' }}>No manual orders registered yet.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeModule === 'express-wash' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Row with Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontWeight: '800', color: '#0f172a', fontSize: '1.1rem' }}>⚡ Express Wash Queue</h3>
            <input 
              type="text" 
              placeholder="Search express orders..." 
              value={ordersSearch} 
              onChange={(e) => setOrdersSearch(e.target.value)} 
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', width: '320px', fontSize: '0.88rem' }}
            />
          </div>

          {/* Orders Table Card */}
          <div className="card-premium" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '0 20px' }}>
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Order ID</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Items & Description</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Assigned Courier</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {db.orders
                    .filter(o => o.planType?.toLowerCase() === 'express')
                    .filter(o => {
                      const s = ordersSearch.toLowerCase();
                      return o.id.toLowerCase().includes(s) || o.customerName.toLowerCase().includes(s);
                    })
                    .map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 12px', fontWeight: '700', color: '#dc2626', whiteSpace: 'nowrap' }}>⚡ #{o.id}</td>
                        <td style={{ padding: '16px 12px', fontWeight: '600', color: '#1e293b' }}>
                          <div>{o.customerName}</div>
                          {o.phone && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {o.phone}</span>}
                        </td>
                        <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{o.date}</td>
                        <td style={{ padding: '16px 12px', color: '#475569', fontSize: '0.85rem' }}>{o.weightItems || 'Express Package'}</td>
                        <td style={{ padding: '16px 12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</td>
                        <td style={{ padding: '16px 12px', fontSize: '0.85rem' }}>
                          {o.courier ? (
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>👤 {o.courier}</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: '700', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fee2e2' }}>Pending Assignment</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <span className={`status-pill ${o.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => setViewingOrder(o)}
                            className="secondary-btn" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: '700' }}
                          >
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    ))}
                  {db.orders.filter(o => o.planType?.toLowerCase() === 'express').length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚡</div>
                        <div style={{ fontWeight: '600' }}>No express orders currently in queue.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: VIEW / ASSIGN ORDER DETAILS --- */}
      {viewingOrder && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Operations Desk - Order Details</h3>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>Order ID: #{viewingOrder.id}</p>
              <button onClick={() => setViewingOrder(null)} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Customer</label>
                  <div style={{ fontWeight: '700', fontSize: '1rem' }}>{viewingOrder.customerName}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Amount</label>
                  <div style={{ fontWeight: '700', color: '#2563eb', fontSize: '1.1rem' }}>QR {(viewingOrder.totalAmount || viewingOrder.total || 0).toFixed(2)}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Garment Details</label>
                <div style={{ fontWeight: '600', marginTop: '2px', color: '#1e293b' }}>{viewingOrder.weightItems}</div>
              </div>

              {viewingOrder.address && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Destination Address</label>
                  <div style={{ fontWeight: '600', marginTop: '2px', color: '#ef4444' }}>📍 {viewingOrder.address}</div>
                </div>
              )}

              {viewingOrder.phone && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Contact Number</label>
                  <div style={{ fontWeight: '600', marginTop: '2px', color: '#3b82f6' }}>📞 {viewingOrder.phone}</div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Status</label>
                <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                  {db.activeRole === 'Delivery Boy' ? (
                    <span style={{ 
                      background: '#eff6ff', 
                      color: '#2563eb', 
                      border: '1px solid #bfdbfe',
                      fontSize: '0.75rem', 
                      fontWeight: '700', 
                      padding: '5px 12px', 
                      borderRadius: '20px',
                      textTransform: 'capitalize',
                      display: 'inline-block'
                    }}>
                      {viewingOrder.status === 'Received' ? 'Picked Up' : viewingOrder.status}
                    </span>
                  ) : (
                    <select 
                      value={viewingOrder.status}
                      onChange={(e) => handleUpdateOrderStatus(viewingOrder.id, e.target.value as any, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Received">Picked Up</option>
                      <option value="Washing">Washing</option>
                      <option value="Ironing">Ironing</option>
                      <option value="Ready">Ready</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  )}
                </div>
              </div>

              {db.activeRole !== 'Delivery Boy' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Assign Courier</label>
                  <select 
                    value={viewingOrder.courier || ''}
                    onChange={(e) => handleUpdateOrderCourier(viewingOrder.id, e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                  >
                    <option value="">-- Unassigned --</option>
                    <option value="All">All Delivery Boys</option>
                    {db.users.filter(u => u.role === 'delivery').map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: db.activeRole === 'Delivery Boy' ? 'flex-end' : 'space-between' }}>
                {db.activeRole !== 'Delivery Boy' && (
                  <button onClick={() => handleDeleteOrder(viewingOrder.id)} className="secondary-btn" style={{ borderColor: '#ef4444', color: '#ef4444', padding: '6px 12px' }}>
                    Delete Order
                  </button>
                )}
                <button onClick={() => setViewingOrder(null)} className="primary-btn" style={{ padding: '6px 16px' }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: STAFF MANAGEMENT --- */}
      {(addingUser || editingUser) && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{addingUser ? 'Add Staff Member' : 'Edit Staff Member'}</h3>
              <button onClick={() => { setAddingUser(false); setEditingUser(null); }} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <form onSubmit={addingUser ? handleCreateUser : handleSaveEditUser} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={uName} onChange={(e) => setUName(e.target.value)} className="form-input" required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={uRole} onChange={(e) => setURole(e.target.value as any)} className="form-input" required>
                  <option value="admin">Admin</option>
                  <option value="delivery">Delivery staff</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} className="form-input" required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={uPhone} onChange={(e) => setUPhone(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" value={uAddress} onChange={(e) => setUAddress(e.target.value)} className="form-input" />
              </div>
              {addingUser && (
                <div className="form-group">
                  <label>Login Password</label>
                  <input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} className="form-input" placeholder="password" />
                </div>
              )}
              
              <button type="submit" className="primary-btn" style={{ width: '100%', justifyContent: 'center', height: '44px', background: '#2563eb', color: 'white', border: 'none' }}>
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: STAFF DETAILS VIEWER --- */}
      {selectedUser && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
                {selectedUser.role === 'customer' ? 'Customer Profile Details' : 'Staff Profile Details'}
              </h3>
              <button onClick={() => setSelectedUser(null)} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Full Name</label>
                <div style={{ fontWeight: '600', fontSize: '1rem', marginTop: '2px' }}>{selectedUser.name}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Role</label>
                <div style={{ fontWeight: '600', textTransform: 'capitalize', marginTop: '2px' }}>{selectedUser.role}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Email Address</label>
                <div style={{ fontWeight: '600', marginTop: '2px' }}>{selectedUser.email}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Phone</label>
                <div style={{ fontWeight: '600', marginTop: '2px' }}>{selectedUser.phone || 'N/A'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Address</label>
                <div style={{ fontWeight: '600', marginTop: '2px' }}>{selectedUser.address || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: SERVICES CATALOG --- */}
      {(addingService || editingService) && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{addingService ? 'Add Catalog Service' : 'Edit Catalog Service'}</h3>
              <button onClick={() => { setAddingService(false); setEditingService(null); }} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <form onSubmit={addingService ? handleCreateService : handleSaveEditService} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Service Name</label>
                <input type="text" value={sName} onChange={(e) => setSName(e.target.value)} className="form-input" required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={sCategory} onChange={(e) => setSCategory(e.target.value)} className="form-input" required>
                  <option value="Wash & Fold">Wash & Fold</option>
                  <option value="Dry Cleaning">Dry Cleaning</option>
                  <option value="Steam Press">Steam Press</option>
                  <option value="Premium Services">Premium Services</option>
                  <option value="Express Services">Express Services</option>
                </select>
              </div>
              <div className="form-group">
                <label>Base Price (QR)</label>
                <input type="text" value={sPrice} onChange={(e) => setSPrice(e.target.value)} className="form-input" required />
              </div>
              <div className="form-group">
                <label>Express Surcharge (%)</label>
                <input type="number" value={sSurcharge} onChange={(e) => setSSurcharge(e.target.value)} className="form-input" required />
              </div>
              
              <button type="submit" className="primary-btn" style={{ width: '100%', justifyContent: 'center', height: '44px', background: '#2563eb', color: 'white', border: 'none' }}>
                Save Service
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: LOG EXPENSE --- */}
      {addingExpense && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white' }}>
            <div style={{ background: 'linear-gradient(135deg, #ef4444, #f43f5e)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Log New Expense</h3>
              <button onClick={() => setAddingExpense(false)} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleCreateExpense} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Category</label>
                <select value={eCategory} onChange={(e) => setECategory(e.target.value)} className="form-input" required>
                  <option value="Chemicals & Detergents">Chemicals & Detergents</option>
                  <option value="Machinery Rent/Repair">Machinery Rent/Repair</option>
                  <option value="Logistics Fuel">Logistics Fuel</option>
                  <option value="Marketing Promotions">Marketing Promotions</option>
                  <option value="Utility Bills">Utility Bills</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description Details</label>
                <input type="text" value={eDesc} onChange={(e) => setEDesc(e.target.value)} className="form-input" required placeholder="Press safety latch fix..." />
              </div>
              <div className="form-group">
                <label>Source Account</label>
                <select value={eSource} onChange={(e) => setESource(e.target.value)} className="form-input" required>
                  <option value="Drawer Cash">Drawer Cash</option>
                  <option value="Bank Account">Bank Account</option>
                </select>
              </div>
              <div className="form-group">
                <label>Expense Amount (QR)</label>
                <input type="text" value={eAmount} onChange={(e) => setEAmount(e.target.value)} className="form-input" required placeholder="0.00" />
              </div>
              
              <button type="submit" className="primary-btn" style={{ width: '100%', justifyContent: 'center', height: '44px', background: '#ef4444', color: 'white', border: 'none' }}>
                Log Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: WALLET ADJUSTMENT --- */}
      {adjustingWalletCust && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Adjust Wallet Balance</h3>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>Customer: {adjustingWalletCust.name}</p>
              <button onClick={() => setAdjustingWalletCust(null)} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleAdjustWallet} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Adjustment Direction</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setWalletDir('in')} className={`secondary-btn ${walletDir === 'in' ? 'active' : ''}`} style={{ flex: 1, padding: '8px 0' }}>Add Cash (Deposit)</button>
                  <button type="button" onClick={() => setWalletDir('out')} className={`secondary-btn ${walletDir === 'out' ? 'active' : ''}`} style={{ flex: 1, padding: '8px 0' }}>Debit Cash (Withdraw)</button>
                </div>
              </div>
              <div className="form-group">
                <label>Amount (QR)</label>
                <input type="text" value={walletAmt} onChange={(e) => setWalletAmt(e.target.value)} className="form-input" required placeholder="0.00" />
              </div>
              <button type="submit" className="primary-btn" style={{ width: '100%', justifyContent: 'center', height: '44px', background: '#2563eb', color: 'white', border: 'none' }}>
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: INVOICE RECEIPT VIEWER --- */}
      {activeReceipt && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content receipt-modal" style={{ maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', padding: '24px', background: 'white' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#1e40af', fontWeight: '800' }}>Laundra</h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Operations Desk Invoice</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Order ID:</span>
                <strong style={{ color: '#0f172a' }}>#{activeReceipt.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Date:</span>
                <span>{activeReceipt.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Customer:</span>
                <span>{activeReceipt.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Branch:</span>
                <span>{activeReceipt.branch}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Payment Type:</span>
                <span>{activeReceipt.paymentMethod}</span>
              </div>
              
              <div style={{ borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '12px 0', margin: '8px 0', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.1rem', color: '#2563eb' }}>
                <span>Grand Total:</span>
                <span>QR {(activeReceipt.totalAmount || activeReceipt.total || 0).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => { if ((window as any).print) window.print(); }} className="secondary-btn" style={{ flex: 1, height: '40px', justifyContent: 'center' }}>Print Invoice</button>
              <button onClick={() => setActiveReceipt(null)} className="primary-btn" style={{ flex: 1, height: '40px', justifyContent: 'center', background: '#2563eb', color: 'white', border: 'none' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </PortalLayout>
  );
};
