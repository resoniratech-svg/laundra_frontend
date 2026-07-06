import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, type Order, type Service, type Customer, type User, type Expense, type Promo } from './DatabaseContext';
import { PortalLayout } from './components/PortalLayout';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface CompanyActivity {
  id: string;
  category: 'Customer' | 'Cashier' | 'Delivery' | 'Order' | 'Payment' | 'Settings' | 'Auth';
  description: string;
  date: string;
  userEmail: string;
}

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

export const AdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { db, saveDB } = useDatabase();

  // Active module tab state
  const [activeModule, setActiveModule] = useState<string>(() => {
    return localStorage.getItem('ll_active_admin_module') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('ll_active_admin_module', activeModule);
  }, [activeModule]);

  // Adjust module tab based on role permissions
  useEffect(() => {
    if (db.activeRole === 'Delivery Staff' || db.activeRole === 'Delivery Boy') {
      if (activeModule !== 'orders') {
        setActiveModule('orders');
      }
    }
  }, [db.activeRole]);

  // Drawer state
  const [drawerTxs, setDrawerTxs] = useState<{ id: string; type: 'Cash In' | 'Cash Out' | 'Shift Open' | 'Shift Close'; amount: number; note: string; time: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('ll_cashier_drawer_txs') || '[]'); } catch { return []; }
  });
  const [txType, setTxType] = useState<'Cash In' | 'Cash Out' | 'Shift Open' | 'Shift Close'>('Cash In');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [shiftOpen, setShiftOpen] = useState(() => localStorage.getItem('ll_cashier_shift') === 'open');

  // Receipt printer target ref
  const receiptRef = React.useRef<HTMLDivElement>(null);

  // Sync drawer txs
  useEffect(() => {
    localStorage.setItem('ll_cashier_drawer_txs', JSON.stringify(drawerTxs));
  }, [drawerTxs]);

  // ─── States ────────────────────────────────────────────────────────────────
  // Company Activity Logs
  const [activities, setActivities] = useState<CompanyActivity[]>(() => {
    try { return JSON.parse(localStorage.getItem(`ll_${db.activeCompanyId}_activities`) || '[]'); } catch { return []; }
  });

  // Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    try {
      const all = JSON.parse(localStorage.getItem('ll_platform_tickets') || '[]');
      return all.filter((t: any) => t.company === db.companies.find(c => c.id === db.activeCompanyId)?.name);
    } catch {
      return [];
    }
  });

  // Local state for modals & details
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [addingCustomerStep, setAddingCustomerStep] = useState<number>(0); // 0 = Idle, 1 = Inputs, 2 = OTP, 3 = Password setup
  const [addingCashierStep, setAddingCashierStep] = useState<number>(0);   // OTP flow for Cashier
  const [addingDeliveryStep, setAddingDeliveryStep] = useState<number>(0); // OTP flow for Delivery
  
  // Form inputs
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custPass, setCustPass] = useState('');
  const [custOtp, setCustOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffAddress, setStaffAddress] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [staffOtp, setStaffOtp] = useState('');
  const [staffProfilePhoto, setStaffProfilePhoto] = useState('');
  const [staffVehicleType, setStaffVehicleType] = useState('Bike');
  const [staffVehicleNumber, setStaffVehicleNumber] = useState('');
  const [staffLicenseNumber, setStaffLicenseNumber] = useState('');
  const [staffVehicleRc, setStaffVehicleRc] = useState('');

  const [viewingStaff, setViewingStaff] = useState<User | null>(null);

  // Manual orders / POS
  const [posCart, setPosCart] = useState<{ service: Service; qty: number; express: boolean }[]>([]);
  const [posCustId, setPosCustId] = useState('');
  const [posCustName, setPosCustName] = useState('');
  const [posCustPhone, setPosCustPhone] = useState('');
  const [posCustAddress, setPosCustAddress] = useState('');
  const [posCustEmail, setPosCustEmail] = useState('');
  const [posPayMethod, setPosPayMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Wallet'>('Cash');
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('All');
  const [posExpress, setPosExpress] = useState(false);
  const [posCommission, setPosCommission] = useState<string>('');

  // Service Forms
  const [addingService, setAddingService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [sName, setSName] = useState('');
  const [sCategory, setSCategory] = useState('Wash & Fold');
  const [sPrice, setSPrice] = useState('');
  const [sImage, setSImage] = useState('');

  // Wallet / Loyalty adjustments
  const [walletCust, setWalletCust] = useState<Customer | null>(null);
  const [walletAmt, setWalletAmt] = useState('');
  const [walletDir, setWalletDir] = useState<'in' | 'out'>('in');
  const [loyaltyCust, setLoyaltyCust] = useState<Customer | null>(null);
  const [loyaltyPts, setLoyaltyPts] = useState('');
  const [loyaltyDir, setLoyaltyDir] = useState<'add' | 'redeem'>('add');

  // Coupon Forms
  const [addingCoupon, setAddingCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Promo | null>(null);
  const [cpCode, setCpCode] = useState('');
  const [cpType, setCpType] = useState<'Percentage' | 'Flat'>('Percentage');
  const [cpValue, setCpValue] = useState('');
  const [cpDesc, setCpDesc] = useState('');

  // Expense Forms
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expCategory, setExpCategory] = useState('Salary');
  const [expDesc, setExpDesc] = useState('');
  const [expSource, setExpSource] = useState('Drawer Cash');
  const [expAmount, setExpAmount] = useState('');

  // Support ticket Forms
  const [tktSubject, setTktSubject] = useState('');
  const [tktMessage, setTktMessage] = useState('');

  // Central Notification Alerts sender
  const [alertTarget, setAlertTarget] = useState('');
  const [alertText, setAlertText] = useState('');
  const [alertChannel, setAlertChannel] = useState<'Email' | 'SMS' | 'Push' | 'WhatsApp'>('Email');
  const [notificationsLog, setNotificationsLog] = useState<{ id: string; target: string; channel: string; text: string; time: string }[]>([]);

  // Reviews
  const [reviews, setReviews] = useState<{ id: string; name: string; stars: number; comment: string; reply?: string; hidden?: boolean }[]>([
    { id: 'rev-1', name: 'Al Pacino', stars: 5, comment: 'Excellent laundry service. Pressed perfectly.' },
    { id: 'rev-2', name: 'Robert De Niro', stars: 4, comment: 'Quick delivery but wash could be cleaner.' }
  ]);
  const [replyText, setReplyText] = useState('');
  const [activeReviewId, setActiveReviewId] = useState('');

  // QR Modal
  const [qrCust, setQrCust] = useState<Customer | null>(null);

  // Search & Filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('All');
  const [custSearch, setCustSearch] = useState('');

  // Get active company configurations
  const activeComp = db.companies.find(c => c.id === db.activeCompanyId)!;
  const limits = activeComp.limits || { maxAdmins: 3, maxCashiers: 5, maxDeliveryStaff: 10, maxCustomers: 5000, maxOrdersPerMonth: 2000 };

  // Sync activities
  useEffect(() => {
    localStorage.setItem(`ll_${db.activeCompanyId}_activities`, JSON.stringify(activities));
  }, [activities, db.activeCompanyId]);

  const addActivity = (category: CompanyActivity['category'], description: string) => {
    const newAct: CompanyActivity = {
      id: 'act-' + Date.now(),
      category,
      description,
      date: new Date().toLocaleString(),
      userEmail: activeComp.adminEmail
    };
    setActivities(prev => [newAct, ...prev]);
  };

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  // Central Centralized Notification verification simulation
  const sendCentralOtp = (target: string, type: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    
    // Append to platform global OTP logs
    try {
      const allLogs = JSON.parse(localStorage.getItem('ll_otp_logs') || '[]');
      const newLog = {
        id: 'otp-' + Date.now(),
        target,
        otp,
        type,
        time: new Date().toLocaleTimeString(),
        status: 'Pending'
      };
      localStorage.setItem('ll_otp_logs', JSON.stringify([newLog, ...allLogs]));
    } catch (e) {
      console.error(e);
    }

    alert(`[Centralized Notification Service Alert]\nCentral OTP code generated for ${target}: ${otp}\nType: ${type}`);
  };

  // Customer wizard actions
  const handleStartAddCustomer = () => {
    if (db.customers.length >= (limits.maxCustomers || 5000)) {
      alert(`User Limit Reached: Maximum allowed Customers is ${limits.maxCustomers || 5000}. Contact SaaS Super Admin to upgrade.`);
      return;
    }
    setAddingCustomerStep(1);
  };

  const handleCreateCustomerInputs = (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCustomerStep(2);
    sendCentralOtp(custEmail, 'Customer Email Verification');
  };

  const handleVerifyCustomerOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (custOtp === generatedOtp || custOtp === '1234') {
      setAddingCustomerStep(3);
    } else {
      alert('Invalid Central OTP! Please enter correct code (or enter 1234 demo bypass code).');
    }
  };

  const handleCompleteCustomerSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: Customer = {
      id: 'cust-' + Math.floor(10000 + Math.random() * 90000),
      name: custName,
      email: custEmail,
      phone: custPhone,
      address: custAddress,
      walletBalance: 0,
      loyaltyPoints: 0,
      creditBalance: 0,
      notes: 'Admin manual registration active'
    };

    const newUser: User = {
      id: 'u-' + (db.users.length + 1),
      name: custName,
      role: 'customer',
      email: custEmail,
      password: custPass || 'password',
      phone: custPhone,
      address: custAddress,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    saveDB({
      customers: [...db.customers, newCust],
      users: [...db.users, newUser]
    });

    addActivity('Customer', `Manual registration verified for customer: ${custName}`);
    alert(`Customer ${custName} registered successfully!`);
    
    // Reset wizard
    setCustName('');
    setCustEmail('');
    setCustPhone('');
    setCustAddress('');
    setCustPass('');
    setCustOtp('');
    setAddingCustomerStep(0);
  };

  // Staff creation actions (Cashier / Delivery boy)
  const handleStartAddStaff = (role: 'cashier' | 'delivery') => {
    const currentCashiers = db.users.filter(u => u.role === 'cashier').length;
    const currentDelivery = db.users.filter(u => u.role === 'delivery').length;

    if (role === 'cashier' && currentCashiers >= (limits.maxCashiers || 5)) {
      alert(`Resource Limit Reached: Maximum allowed Cashiers is ${limits.maxCashiers || 5}. Contact Super Admin.`);
      return;
    }
    if (role === 'delivery' && currentDelivery >= (limits.maxDeliveryStaff || 10)) {
      alert(`Resource Limit Reached: Maximum allowed Delivery staff is ${limits.maxDeliveryStaff || 10}. Contact Super Admin.`);
      return;
    }

    if (role === 'cashier') setAddingCashierStep(1);
    else setAddingDeliveryStep(1);
  };

  const handleCreateStaffInputs = (e: React.FormEvent, role: 'cashier' | 'delivery') => {
    e.preventDefault();
    if (role === 'cashier') {
      setAddingCashierStep(2);
    } else {
      setAddingDeliveryStep(2);
    }
    sendCentralOtp(staffEmail, `${role.toUpperCase()} Account Activation`);
  };

  const handleVerifyStaffOtp = (e: React.FormEvent, role: 'cashier' | 'delivery') => {
    e.preventDefault();
    if (staffOtp === generatedOtp || staffOtp === '1234') {
      if (role === 'cashier') setAddingCashierStep(3);
      else setAddingDeliveryStep(3);
    } else {
      alert('Invalid OTP!');
    }
  };

  const handleCompleteStaffSetup = (e: React.FormEvent, role: 'cashier' | 'delivery') => {
    e.preventDefault();
    const newUser: User = {
      id: 'u-' + (db.users.length + 1),
      name: staffName,
      role: role,
      email: staffEmail,
      password: staffPass || 'password',
      phone: staffPhone,
      address: staffAddress,
      status: 'Active',
      createdAt: new Date().toISOString(),
      profilePhoto: role === 'delivery' ? staffProfilePhoto : undefined,
      vehicleType: role === 'delivery' ? staffVehicleType : undefined,
      vehicleNumber: role === 'delivery' ? staffVehicleNumber : undefined,
      licenseNumber: role === 'delivery' ? staffLicenseNumber : undefined,
      vehicleRc: role === 'delivery' ? staffVehicleRc : undefined
    };

    saveDB({ users: [...db.users, newUser] });
    addActivity(role === 'cashier' ? 'Cashier' : 'Delivery', `Registered staff member: ${staffName}`);
    alert(`Registered ${role} staff member successfully.`);
    
    // Reset staff wizard
    setStaffName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffAddress('');
    setStaffPass('');
    setStaffOtp('');
    setStaffProfilePhoto('');
    setStaffVehicleType('Bike');
    setStaffVehicleNumber('');
    setStaffLicenseNumber('');
    setStaffVehicleRc('');
    setAddingCashierStep(0);
    setAddingDeliveryStep(0);
  };

  const handleToggleStaffStatus = (user: User) => {
    const nextStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
    const updated = db.users.map(u => u.id === user.id ? { ...u, status: nextStatus } : u);
    saveDB({ users: updated });
    addActivity('Settings', `Toggled status of staff ${user.name} to ${nextStatus}`);
  };

  const handleResetStaffPassword = (user: User) => {
    const next = prompt(`Enter new password for ${user.name}:`);
    if (!next) return;
    const updated = db.users.map(u => u.id === user.id ? { ...u, password: next } : u);
    saveDB({ users: updated });
    sendCentralOtp(user.email, 'Password Reset');
    addActivity('Settings', `Reset password for staff member: ${user.name}`);
  };

  const handleDeleteStaff = (user: User) => {
    if (confirm(`Remove staff member "${user.name}"?`)) {
      const updated = db.users.filter(u => u.id !== user.id);
      saveDB({ users: updated });
      addActivity('Settings', `Deleted staff member: ${user.name}`);
    }
  };

  const handleApproveApplication = (applicant: User) => {
    const updated = db.users.map(u => u.id === applicant.id ? { ...u, status: 'Active' } : u);
    saveDB({ users: updated });
    sendCentralOtp(applicant.email, 'Delivery Staff Account Activation');
    addActivity('Delivery', `Approved delivery staff application for: ${applicant.name}`);
    alert(`Application for ${applicant.name} approved! Verification OTP sent.`);
  };

  // Service Management actions
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      const updated = db.services.map(s => s.id === editingService.id ? { ...s, name: sName, category: sCategory, price: parseFloat(sPrice) || 0, image: sImage || undefined } : s);
      saveDB({ services: updated });
      addActivity('Settings', `Edited catalog service: ${sName}`);
      setEditingService(null);
    } else {
      const newServ: Service = {
        id: 's-' + (db.services.length + 1),
        name: sName,
        category: sCategory,
        price: parseFloat(sPrice) || 0,
        expressSurcharge: 1.5,
        active: true,
        image: sImage || undefined
      };
      saveDB({ services: [...db.services, newServ] });
      addActivity('Settings', `Added catalog service: ${sName}`);
      setAddingService(false);
    }
    setSName('');
    setSPrice('');
    setSImage('');
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Delete service from catalog?')) {
      const updated = db.services.filter(s => s.id !== id);
      saveDB({ services: updated });
      addActivity('Settings', `Deleted catalog service ID: ${id}`);
    }
  };

  // Order Management actions
  const handleUpdateOrderStatus = (orderId: string, nextStatus: Order['status']) => {
    const updated = db.orders.map(o => o.id === orderId ? { ...o, status: nextStatus } : o);
    saveDB({ orders: updated });
    addActivity('Order', `Updated status of order #${orderId} to: ${nextStatus}`);
    
    // Simulated central notifications trigger
    if (nextStatus === 'Ready') {
      triggerCentralAlert('client@laundra.com', 'Ready for Delivery alert');
    }
    if (nextStatus === 'Delivered') {
      triggerCentralAlert('client@laundra.com', 'Payment Received & order delivered alert');
    }
  };

  const handleAssignDeliveryBoy = (orderId: string, courierName: string) => {
    const updated = db.orders.map(o => o.id === orderId ? { ...o, courier: courierName || undefined, deliveryStatus: courierName ? 'Out For Delivery' : 'Received' } : o);
    saveDB({ orders: updated });
    addActivity('Order', `Assigned delivery agent ${courierName || 'None'} to order #${orderId}`);
  };

  // Payments / POS manual orders checkout
  const getPOSCartTotal = () => {
    return posCart.reduce((sum, item) => {
      let base = item.service.price;
      if (item.express) base *= 1.5;
      return sum + (base * item.qty);
    }, 0);
  };

  const handleCheckoutPOS = () => {
    if (posCart.length === 0) return;
    if (!shiftOpen) {
      alert('Please open your drawer shift before processing orders.');
      return;
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyOrdersCount = db.orders.filter(o => o.date.startsWith(currentMonth)).length;
    if (monthlyOrdersCount >= (limits.maxOrdersPerMonth || 2000)) {
      alert(`Order placement failed: Monthly order limit of ${limits.maxOrdersPerMonth || 2000} reached for this company.`);
      return;
    }

    const total = getPOSCartTotal();
    const newOrderId = 'OR-' + Math.floor(1000 + Math.random() * 9000);
    const isGuest = !posCustId;
    let customerName = posCustName || 'Guest Customer';

    let updatedCustomers = db.customers;
    if (!isGuest) {
      const cust = db.customers.find(c => c.id === posCustId)!;
      customerName = cust.name;
      if (posPayMethod === 'Wallet') {
        if (cust.walletBalance < total) {
          alert('Insufficient customer wallet balance!');
          return;
        }
        updatedCustomers = db.customers.map(c => c.id === posCustId ? { ...c, walletBalance: c.walletBalance - total } : c);
      }
    }

    const commAmt = posPayMethod === 'Cash' ? parseFloat(posCommission) || 0 : 0;

    const newOrder: Order = {
      id: newOrderId,
      customerName,
      date: new Date().toISOString().split('T')[0],
      totalAmount: total,
      status: 'Created',
      paymentMethod: posPayMethod,
      paymentStatus: posPayMethod === 'Wallet' ? 'Paid' : 'Unpaid',
      services: posCart.map(i => ({ serviceId: i.service.id, name: i.service.name, qty: i.qty, plan: i.express ? 'Express (+50%)' : 'Normal' })),
      deliveryStatus: 'Received',
      commission: commAmt
    };

    // Log cash-in transaction
    if (posPayMethod === 'Cash') {
      const tx = {
        id: 'tx-' + Date.now(),
        type: 'Cash In' as const,
        amount: total,
        note: `Order #${newOrderId} — ${customerName}`,
        time: new Date().toLocaleTimeString()
      };
      setDrawerTxs(prev => [tx, ...prev]);
    }

    saveDB({
      orders: [...db.orders, newOrder],
      customers: updatedCustomers,
      drawerCash: posPayMethod === 'Cash' ? db.drawerCash + total : db.drawerCash
    });

    addActivity('Order', `Created POS manual order #${newOrderId} for ${customerName} (Commission: QR ${commAmt})`);
    alert(`POS checkout complete. Order #${newOrderId} placed successfully!`);
    
    // Select order to print
    setViewingOrder(newOrder);
    setActiveModule('receipt');

    setPosCart([]);
    setPosCustId('');
    setPosCustName('');
    setPosCustPhone('');
    setPosCommission('');
  };

  // Coupons actions
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon) {
      const updated = db.promos.map(p => p.code === editingCoupon.code ? { ...p, code: cpCode, type: cpType, value: parseFloat(cpValue) || 0, description: cpDesc } : p);
      saveDB({ promos: updated });
      addActivity('Settings', `Edited coupon: ${cpCode}`);
      setEditingCoupon(null);
    } else {
      const newPromo: Promo = {
        code: cpCode,
        type: cpType,
        value: parseFloat(cpValue) || 0,
        description: cpDesc,
        uses: 0
      };
      saveDB({ promos: [...db.promos, newPromo] });
      addActivity('Settings', `Created coupon: ${cpCode}`);
      setAddingCoupon(false);
    }
    setCpCode('');
    setCpValue('');
    setCpDesc('');
  };

  // Wallet & Loyalty adjustments
  const handleAdjustWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletCust) return;
    const val = parseFloat(walletAmt) || 0;
    const diff = walletDir === 'in' ? val : -val;

    const updated = db.customers.map(c => c.id === walletCust.id ? { ...c, walletBalance: Math.max(0, c.walletBalance + diff) } : c);
    saveDB({ customers: updated });
    addActivity('Payment', `Adjusted wallet for customer ${walletCust.name}: ${diff > 0 ? '+' : ''}${diff} QR`);
    setWalletCust(null);
    setWalletAmt('');
  };

  const handleAdjustLoyaltySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyCust) return;
    const val = parseInt(loyaltyPts) || 0;
    const diff = loyaltyDir === 'add' ? val : -val;

    const updated = db.customers.map(c => c.id === loyaltyCust.id ? { ...c, loyaltyPoints: Math.max(0, c.loyaltyPoints + diff) } : c);
    saveDB({ customers: updated });
    addActivity('Payment', `Adjusted loyalty points for customer ${loyaltyCust.name}: ${diff > 0 ? '+' : ''}${diff} points`);
    setLoyaltyCust(null);
    setLoyaltyPts('');
  };

  // Expenses actions
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense) {
      const updated = db.expenses.map((ex, i) => i === db.expenses.indexOf(editingExpense) ? { ...ex, category: expCategory, description: expDesc, source: expSource, amount: parseFloat(expAmount) || 0 } : ex);
      saveDB({ expenses: updated });
      addActivity('Payment', `Edited expense: ${expDesc}`);
      setEditingExpense(null);
    } else {
      const newExp: Expense = {
        date: new Date().toISOString().split('T')[0],
        category: expCategory,
        description: expDesc,
        source: expSource,
        loggedBy: 'Admin User',
        amount: parseFloat(expAmount) || 0
      };
      saveDB({ expenses: [...db.expenses, newExp] });
      addActivity('Payment', `Added expense: ${expDesc}`);
      setAddingExpense(false);
    }
    setExpDesc('');
    setExpAmount('');
  };

  // Support Ticket submission to Super Admin
  const handleCreateSupportTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tktSubject || !tktMessage) return;

    try {
      const allTickets = JSON.parse(localStorage.getItem('ll_platform_tickets') || '[]');
      const compName = db.companies.find(c => c.id === db.activeCompanyId)?.name || 'Tenant';
      const newTicket: SupportTicket = {
        id: 'tkt-' + Date.now(),
        company: compName,
        subject: tktSubject,
        status: 'Open',
        date: new Date().toISOString().split('T')[0],
        message: tktMessage,
        history: []
      };

      const updated = [newTicket, ...allTickets];
      localStorage.setItem('ll_platform_tickets', JSON.stringify(updated));
      setSupportTickets([newTicket, ...supportTickets]);
      addActivity('Settings', `Opened support ticket to Super Admin: ${tktSubject}`);
      alert('Support ticket created successfully!');
      setTktSubject('');
      setTktMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  // Central Alerts
  const triggerCentralAlert = (target: string, text: string) => {
    const newLog = {
      id: 'alert-' + Date.now(),
      target,
      channel: alertChannel,
      text,
      time: new Date().toLocaleTimeString()
    };
    setNotificationsLog(prev => [newLog, ...prev]);
    alert(`[Central Notification service alert]\nChannel: ${alertChannel}\nTarget: ${target}\nMessage: ${text}`);
  };

  // QR share WhatsApp
  const handleShareQR = (cust: Customer) => {
    addActivity('Customer', `Shared QR Code for customer: ${cust.name}`);
    window.open(`https://api.whatsapp.com/send?text=Scan this secure link to access your customer laundry portal: http://localhost:5173/customer?login=${cust.id}`);
  };

  const handleDisableQR = (cust: Customer) => {
    const updated = db.customers.map(c => c.id === cust.id ? { ...c, qrDisabled: true } : c);
    saveDB({ customers: updated });
    addActivity('Customer', `Disabled lost QR Code for customer: ${cust.name}`);
    alert(`QR code for ${cust.name} has been disabled. The old link is now invalid.`);
    setQrCust({ ...cust, qrDisabled: true });
  };

  const handleGenerateNewSecureQR = (cust: Customer) => {
    const newId = 'cust-' + Math.floor(10000 + Math.random() * 90000);
    const updatedCustomers = db.customers.map(c => c.id === cust.id ? { ...c, id: newId, qrDisabled: false } : c);
    const updatedUsers = db.users.map(u => u.role === 'customer' && u.email === cust.email ? { ...u, id: newId } : u);
    const updatedOrders = db.orders.map(o => o.customerId === cust.id ? { ...o, customerId: newId } : o);

    saveDB({
      customers: updatedCustomers,
      users: updatedUsers,
      orders: updatedOrders
    });

    addActivity('Customer', `Regenerated new secure QR code for customer: ${cust.name}`);
    alert(`New secure QR code generated for ${cust.name}! Old QR links are now permanently invalid.`);
    
    const newMatch = updatedCustomers.find(c => c.id === newId)!;
    setQrCust(newMatch);
  };

  // Reviews replies
  const handleReplyReview = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = reviews.map(r => r.id === activeReviewId ? { ...r, reply: replyText } : r);
    setReviews(updated);
    setReplyText('');
    setActiveReviewId('');
  };

  // Settings
  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault();
    addActivity('Settings', 'Updated company config details');
    alert('Company settings saved successfully!');
  };

  // Drawer logging transaction
  const handleDrawerTx = () => {
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) { alert('Please enter a valid cash amount.'); return; }
    const tx = {
      id: 'tx-' + Date.now(),
      type: txType,
      amount: amt,
      note: txNote,
      time: new Date().toLocaleTimeString()
    };
    setDrawerTxs(prev => [tx, ...prev]);

    if (txType === 'Cash In' || txType === 'Shift Open') {
      saveDB({ drawerCash: db.drawerCash + amt });
    }
    if (txType === 'Cash Out' || txType === 'Shift Close') {
      saveDB({ drawerCash: Math.max(0, db.drawerCash - amt) });
    }
    if (txType === 'Shift Open') {
      setShiftOpen(true);
      localStorage.setItem('ll_cashier_shift', 'open');
    }
    if (txType === 'Shift Close') {
      setShiftOpen(false);
      localStorage.setItem('ll_cashier_shift', 'closed');
    }
    
    addActivity('Payment', `Logged drawer cash transaction: ${txType} of QR ${amt}`);
    setTxAmount('');
    setTxNote('');
  };

  // Printing Simulated Thermal Receipt
  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Thermal Receipt Print</title>
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

  // Stats calculation
  const totalCustomers = db.customers.length;
  const totalCashiers = db.users.filter(u => u.role === 'cashier').length;
  const totalDelivery = db.users.filter(u => u.role === 'delivery').length;

  const todayRevenue = db.orders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);
  const pendingPaymentsTotal = db.orders.filter(o => o.paymentStatus === 'Unpaid').reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);

  return (
    <PortalLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      
      {/* ─── TABS ────────────────────────────────────────────────────────────── */}

      {/* 🏠 DASHBOARD TAB */}
      {activeModule === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Business Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>Today's Revenue</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0369a1', marginTop: '4px' }}>QR {todayRevenue.toFixed(2)}</div>
            </div>
            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fee2e2' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>Pending Payments</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>QR {pendingPaymentsTotal.toFixed(2)}</div>
            </div>
            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Total Customers</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>{totalCustomers} / {limits.maxCustomers}</div>
            </div>
            <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '12px', border: '1px solid #f3e8ff' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b21a8', textTransform: 'uppercase' }}>Cashier Agents</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#6b21a8', marginTop: '4px' }}>{totalCashiers} / {limits.maxCashiers}</div>
            </div>
            <div style={{ background: '#fdf2f8', padding: '16px', borderRadius: '12px', border: '1px solid #fce7f3' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#be185d', textTransform: 'uppercase' }}>Delivery Staff</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#be185d', marginTop: '4px' }}>{totalDelivery} / {limits.maxDeliveryStaff}</div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>⚡ Quick Actions</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleStartAddCustomer} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>Create Customer</button>
              <button onClick={() => setActiveModule('pos')} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>Create Manual Order</button>
              {db.activeRole !== 'Cashier' && (
                <>
                  <button onClick={() => setActiveModule('services')} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>Add Service</button>
                  <button onClick={() => setActiveModule('delivery-staff')} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>Approve Delivery Staff</button>
                  <button onClick={() => setActiveModule('reports')} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>View Reports</button>
                </>
              )}
            </div>
          </div>

          {/* Recent activities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>📜 Recent Operations Log</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {activities.slice(0, 5).map(act => (
                  <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.82rem' }}>
                    <span>{act.description}</span>
                    <span style={{ color: '#64748b' }}>{act.date.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>🔔 Recent Notifications</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {db.notifications.slice(0, 4).map(n => (
                  <div key={n.id} style={{ padding: '8px', background: '#f0fdf4', borderRadius: '6px', fontSize: '0.82rem' }}>
                    {n.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 👥 CUSTOMER MANAGEMENT TAB */}
      {activeModule === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input 
              type="text" 
              value={custSearch} 
              onChange={e => setCustSearch(e.target.value)} 
              placeholder="🔍 Search customers..." 
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', width: '250px' }} 
            />
            <button onClick={handleStartAddCustomer} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>➕ Create Customer</button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Customer Name</th>
                  <th style={{ padding: '12px' }}>Contact</th>
                  <th style={{ padding: '12px' }}>Wallet Balance</th>
                  <th style={{ padding: '12px' }}>Loyalty Points</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.customers
                  .filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()))
                  .map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{c.name}</td>
                      <td style={{ padding: '12px' }}>{c.email} • {c.phone}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#16a34a' }}>QR {c.walletBalance.toFixed(2)}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#6b21a8' }}>{c.loyaltyPoints} pts</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button onClick={() => { setWalletCust(c); setWalletDir('in'); }} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>💳 Wallet</button>
                          <button onClick={() => { setLoyaltyCust(c); setLoyaltyDir('add'); }} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#faf5ff', color: '#6b21a8', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>⭐ Loyalty</button>
                          <button onClick={() => setQrCust(c)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>📱 QR Code</button>
                          <button onClick={() => handleShareQR(c)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Share WA</button>
                          <button onClick={() => setViewingCustomer(c)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>👁️ View</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 💳 CASHIER MANAGEMENT TAB */}
      {activeModule === 'cashiers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => handleStartAddStaff('cashier')} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>➕ Create Cashier</button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Phone</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.users.filter(u => u.role === 'cashier').map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{u.name}</td>
                    <td style={{ padding: '12px' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>{u.phone || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800', background: u.status === 'Suspended' ? '#fee2e2' : '#dcfce7', color: u.status === 'Suspended' ? '#b91c1c' : '#15803d' }}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button onClick={() => handleToggleStaffStatus(u)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#eff6ff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Toggle Suspend</button>
                        <button onClick={() => handleResetStaffPassword(u)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Reset Pass</button>
                        <button onClick={() => handleDeleteStaff(u)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🚚 DELIVERY STAFF MANAGEMENT TAB */}
      {activeModule === 'delivery-staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Sign up applications (APK simulator applications) */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>📥 Sign-Up Applications (Pending Approval)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {db.users.filter(u => u.role === 'delivery' && u.status === 'Pending').length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No pending applications.</div>
              ) : (
                db.users.filter(u => u.role === 'delivery' && u.status === 'Pending').map(u => (
                  <div key={u.id} style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{u.name}</strong> ({u.email})
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Phone: {u.phone}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleApproveApplication(u)} style={{ padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Approve ✓</button>
                      <button onClick={() => { if(confirm('Reject application?')) handleDeleteStaff(u); }} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Reject ✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active staff list */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0 }}>🚚 Active Delivery Agents</h4>
              <button onClick={() => handleStartAddStaff('delivery')} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>➕ Add Delivery Staff</button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.users.filter(u => u.role === 'delivery' && u.status !== 'Pending').map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{u.name}</td>
                    <td style={{ padding: '12px' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800', background: u.status === 'Suspended' ? '#fee2e2' : '#dcfce7', color: u.status === 'Suspended' ? '#b91c1c' : '#15803d' }}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button onClick={() => handleToggleStaffStatus(u)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#eff6ff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Toggle Suspend</button>
                        <button onClick={() => handleResetStaffPassword(u)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Reset Pass</button>
                        <button onClick={() => handleDeleteStaff(u)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 🏷️ SERVICE MANAGEMENT TAB */}
      {activeModule === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setAddingService(true); setSName(''); setSPrice(''); }} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>➕ Add Service</button>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Service Name</th>
                  <th style={{ padding: '12px' }}>Category</th>
                  <th style={{ padding: '12px' }}>Price (QR)</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.services.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {s.image ? (
                        <img src={s.image} alt={s.name} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🧺</div>
                      )}
                      <span>{s.name}</span>
                    </td>
                    <td style={{ padding: '12px' }}>{s.category}</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#2563eb' }}>QR {s.price.toFixed(2)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button onClick={() => { setEditingService(s); setSName(s.name); setSCategory(s.category); setSPrice(s.price.toString()); setSImage(s.image || ''); }} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✏️ Edit</button>
                        <button onClick={() => handleDeleteService(s.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🧺 ORDER MANAGEMENT TAB */}
      {activeModule === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={orderSearch} 
                onChange={e => setOrderSearch(e.target.value)} 
                placeholder="🔍 Search orders by client..." 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', width: '220px' }} 
              />
              <select 
                value={orderFilter} 
                onChange={e => setOrderFilter(e.target.value)} 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
              >
                <option value="All">All statuses</option>
                <option value="Created">Created</option>
                <option value="Accepted">Accepted</option>
                <option value="Washing">Washing</option>
                <option value="Ready">Ready</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
            {(db.activeRole === 'Admin' || db.activeRole === 'Cashier') && (
              <button onClick={() => setActiveModule('pos')} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>➕ Create Manual Order</button>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Order ID</th>
                  <th style={{ padding: '12px' }}>Customer</th>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Total Amount</th>
                  <th style={{ padding: '12px' }}>status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Modify Status</th>
                </tr>
              </thead>
              <tbody>
                {db.orders
                  .filter(o => o.customerName.toLowerCase().includes(orderSearch.toLowerCase()))
                  .filter(o => orderFilter === 'All' || o.status === orderFilter)
                  .map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>#{o.id}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{o.customerName}</td>
                      <td style={{ padding: '12px' }}>{o.date}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#1e3a8a' }}>QR {o.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800',
                          background: o.status === 'Delivered' ? '#dcfce7' : o.status === 'Created' ? '#eff6ff' : '#fef3c7',
                          color: o.status === 'Delivered' ? '#15803d' : o.status === 'Created' ? '#2563eb' : '#b45309'
                        }}>{o.status}</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <select 
                            value={o.status} 
                            onChange={e => handleUpdateOrderStatus(o.id, e.target.value as any)}
                            style={{ padding: '4px 6px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }}
                          >
                            {['Created', 'Accepted', 'Pickup Assigned', 'Picked Up', 'Received', 'Sorting', 'Washing', 'Drying', 'Ironing', 'Quality Check', 'Packing', 'Ready', 'Out For Delivery', 'Delivered'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button onClick={() => setViewingOrder(o)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>👁️ Timeline</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ➕ MANUAL ORDER / POS TAB */}
      {activeModule === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr', gap: '24px' }}>
          
          {/* POS Catalog browsing */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>🧺 Laundry Services Catalog</h4>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input type="text" value={posSearch} onChange={e => setPosSearch(e.target.value)} placeholder="🔍 Search service catalog..." style={{ flex: 1, padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              <select value={posCategory} onChange={e => setPosCategory(e.target.value)} style={{ padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                {['All', ...Array.from(new Set(db.services.map(s => s.category)))].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
              {db.services
                .filter(s => s.active !== false)
                .filter(s => s.name.toLowerCase().includes(posSearch.toLowerCase()))
                .filter(s => posCategory === 'All' || s.category === posCategory)
                .map(serv => (
                  <div key={serv.id} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>{serv.name}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>QR {serv.price.toFixed(2)}</div>
                    
                    <button 
                      onClick={() => {
                        const existing = posCart.find(i => i.service.id === serv.id && i.express === posExpress);
                        if (existing) {
                          setPosCart(posCart.map(i => i.service.id === serv.id && i.express === posExpress ? { ...i, qty: i.qty + 1 } : i));
                        } else {
                          setPosCart([...posCart, { service: serv, qty: 1, express: posExpress }]);
                        }
                      }}
                      style={{ marginTop: '10px', padding: '6px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
                    >
                      🛒 Add to Cart
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* POS Cart details & client info */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>🛒 Checkout Cart Details</h4>
            
            {/* Cart listing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
              {posCart.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Cart is empty</div>
              ) : (
                posCart.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>{item.service.name}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Qty: {item.qty} {item.express && '• Express (+50%)'}</div>
                    </div>
                    <button onClick={() => setPosCart(posCart.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                  </div>
                ))
              )}
            </div>

            {/* Customer select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Select Customer</label>
                <select value={posCustId} onChange={e => setPosCustId(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="">— Guest Checkout —</option>
                  {db.customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>

              {posCustId === '' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Guest Customer Name</label>
                  <input type="text" value={posCustName} onChange={e => setPosCustName(e.target.value)} placeholder="Enter Guest name..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontWeight: '700' }}>POS total amount:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb' }}>QR {getPOSCartTotal().toFixed(2)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <select value={posPayMethod} onChange={e => setPosPayMethod(e.target.value as any)} style={{ padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="Cash">Cash payment</option>
                  <option value="Card">Card payment</option>
                  <option value="UPI">UPI payment</option>
                  <option value="Wallet">Wallet payment</option>
                </select>
                <button onClick={handleCheckoutPOS} disabled={posCart.length === 0} style={{ padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Checkout</button>
              </div>

              {posPayMethod === 'Cash' && (
                <div style={{ marginTop: '12px', borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px', color: '#475569', textTransform: 'uppercase' }}>Commission (QR)</label>
                  <input type="number" min="0" step="0.01" value={posCommission} onChange={e => setPosCommission(e.target.value)} placeholder="Enter commission amount..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 💵 DRAWER & SHIFTS TAB */}
      {activeModule === 'drawer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
          {/* Drawer form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '16px', padding: '24px', color: 'white' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85, marginBottom: '8px' }}>Drawer Cash Balance</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900' }}>QR {db.drawerCash.toFixed(2)}</div>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.9 }}>
                Shift status: {shiftOpen ? <span style={{ fontWeight: '700' }}>🟢 Open</span> : <span style={{ fontWeight: '700' }}>🔴 Closed</span>}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>💵 Log Transaction</h3>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['Cash In', 'Cash Out', 'Shift Open', 'Shift Close'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTxType(t)} style={{
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
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Note</label>
                <input value={txNote} onChange={e => setTxNote(e.target.value)} placeholder="Optional note..."
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button type="button" onClick={handleDrawerTx} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}>
                Log Transaction
              </button>
            </div>
          </div>

          {/* Transaction log */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontWeight: '800', color: '#0f172a', fontSize: '1.1rem' }}>Transaction Log</h3>
            {drawerTxs.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.95rem' }}>No transactions logged yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                {drawerTxs.map(tx => {
                  const isIn = tx.type === 'Cash In' || tx.type === 'Shift Open';
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isIn ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        {isIn ? '📥' : '📤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>{tx.type}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{tx.note || 'No note'} • {tx.time}</div>
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: isIn ? '#16a34a' : '#ef4444' }}>
                        {isIn ? '+' : '-'} QR {tx.amount.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🧾 RECEIPT PRINTER TAB */}
      {activeModule === 'receipt' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1', maxWidth: '420px', margin: '0 auto' }}>
          <h4 style={{ margin: '0 0 12px 0' }}>🧾 Simulated Thermal Print Receipt</h4>
          
          <div ref={receiptRef} style={{ padding: '20px', background: '#fff', border: '1px dashed #334155', fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: '#000' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 4px 0', fontSize: '1.25rem', textTransform: 'uppercase' }}>LAUNDRA HQ</h2>
            <div style={{ textAlign: 'center', fontSize: '0.75rem', marginBottom: '8px' }}>Downtown HQ, Branch A</div>
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
            
            {viewingOrder ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Order ID:</span>
                  <strong>#{viewingOrder.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Customer:</span>
                  <strong>{viewingOrder.customerName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Date:</span>
                  <strong>{viewingOrder.date}</strong>
                </div>
                
                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
                
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>Items Summary:</div>
                <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{viewingOrder.weightItems}</div>
                
                <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1rem' }}>
                  <span>GRAND TOTAL:</span>
                  <span>QR {viewingOrder.totalAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '4px' }}>
                  <span>Payment Mode:</span>
                  <strong>{viewingOrder.paymentMethod} ({viewingOrder.paymentStatus || 'Paid'})</strong>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No recent order checkout select. Please go to Today's Orders and click \"Receipt\" next to any booking to load.</div>
            )}
            
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
            <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>Thank you for choosing Laundra!</div>
          </div>
          
          {viewingOrder && (
            <button onClick={handlePrint} style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', marginTop: '16px' }}>
              🖨️ Print Thermal Receipt
            </button>
          )}
        </div>
      )}

      {/* 💰 PAYMENTS & REFUNDS TAB */}
      {activeModule === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>💵 Payment Records History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {db.orders.map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong>Order #{o.id}</strong> — {o.customerName}
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Date: {o.date} • Method: {o.paymentMethod || 'Cash'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '800' }}>QR {o.totalAmount.toFixed(2)}</div>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: o.paymentStatus === 'Paid' ? '#15803d' : '#b91c1c' }}>{o.paymentStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 🎁 COUPONS MANAGER TAB */}
      {activeModule === 'coupons' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>🎁 Active Promos & Discount Codes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {db.promos.map(p => (
                <div key={p.code} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Code: {p.code}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Value: {p.value}{p.type === 'Percentage' ? '%' : ' QR'} Off • Uses: {p.uses} times</div>
                  </div>
                  <button onClick={() => { if(confirm('Delete coupon?')) saveDB({ promos: db.promos.filter(item => item.code !== p.code) }); }} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>➕ Create Coupon</h4>
            <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Coupon Code</label>
                <input type="text" required value={cpCode} onChange={e => setCpCode(e.target.value.toUpperCase())} placeholder="e.g. SUMMER20" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Type</label>
                  <select value={cpType} onChange={e => setCpType(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                    <option value="Percentage">Percentage</option>
                    <option value="Flat">Flat Discount</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Value</label>
                  <input type="number" required value={cpValue} onChange={e => setCpValue(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Description</label>
                <input type="text" value={cpDesc} onChange={e => setCpDesc(e.target.value)} placeholder="Summer holiday special discount..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Save Coupon</button>
            </form>
          </div>

        </div>
      )}

      {/* 💳 WALLET & LOYALTY TAB */}
      {activeModule === 'wallet-loyalty' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1' }}>
          <h3>💳 Wallet & Loyalty Points ledger</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>Select wallet or loyalty options next to any customer profile in the Customer tab to adjust balances.</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Client</th>
                <th style={{ padding: '10px' }}>Current Wallet</th>
                <th style={{ padding: '10px' }}>Current Loyalty points</th>
              </tr>
            </thead>
            <tbody>
              {db.customers.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: '700' }}>{c.name}</td>
                  <td style={{ padding: '10px', color: '#16a34a', fontWeight: '700' }}>QR {c.walletBalance.toFixed(2)}</td>
                  <td style={{ padding: '10px', color: '#6b21a8', fontWeight: '700' }}>{c.loyaltyPoints} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 💸 EXPENSES BOOK TAB */}
      {activeModule === 'expenses' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>💸 Expenses Log</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {db.expenses.map((ex, i) => (
                <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{ex.description}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Category: {ex.category} • Source: {ex.source} • Date: {ex.date}</div>
                  </div>
                  <strong style={{ color: '#ef4444' }}>- QR {ex.amount.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>➕ Add Expense</h4>
            <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Category</label>
                <select value={expCategory} onChange={e => setExpCategory(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="Salary">Salary payment</option>
                  <option value="Fuel">Fuel / Transport</option>
                  <option value="Electricity">Electricity bill</option>
                  <option value="Water">Water bill</option>
                  <option value="Packaging">Packaging materials</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Description</label>
                <input type="text" required value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="e.g. Packaging boxes purchase" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Source</label>
                  <select value={expSource} onChange={e => setExpSource(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                    <option value="Drawer Cash">Drawer Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Amount (QR)</label>
                  <input type="number" required value={expAmount} onChange={e => setExpAmount(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
              </div>
              <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Save Expense</button>
            </form>
          </div>

        </div>
      )}

      {/* 📊 BUSINESS REPORTS TAB */}
      {activeModule === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>📈 Sales & Performance Reports Console</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
              <div style={{ padding: '14px', background: '#eff6ff', borderRadius: '8px' }}>
                <strong>Today's Sales Count:</strong> {db.orders.length} bookings
              </div>
              <div style={{ padding: '14px', background: '#ecfdf5', borderRadius: '8px' }}>
                <strong>Monthly Sales Value:</strong> QR {todayRevenue.toFixed(2)}
              </div>
              <div style={{ padding: '14px', background: '#fffbeb', borderRadius: '8px' }}>
                <strong>Total Catalog Items:</strong> {db.services.length} services
              </div>
              <div style={{ padding: '14px', background: '#fdf2f8', borderRadius: '8px' }}>
                <strong>Total Company Registered Clients:</strong> {totalCustomers}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ✉️ NOTIFICATION CENTER TAB */}
      {activeModule === 'notifications' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>✉️ Dispatch central notification alerts</h4>
            
            <form onSubmit={e => { e.preventDefault(); triggerCentralAlert(alertTarget, alertText); setAlertTarget(''); setAlertText(''); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Recipient contact (Email or Phone)</label>
                <input type="text" required value={alertTarget} onChange={e => setAlertTarget(e.target.value)} placeholder="customer@domain.com or phone..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Alert text message</label>
                <textarea required value={alertText} onChange={e => setAlertText(e.target.value)} rows={3} placeholder="Pickup reminder alert, Order ready alert..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Alert Mode Channel</label>
                <select value={alertChannel} onChange={e => setAlertChannel(e.target.value as any)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="Email">Email channel</option>
                  <option value="SMS">SMS channel</option>
                  <option value="Push">Push Notification channel</option>
                  <option value="WhatsApp">WhatsApp channel</option>
                </select>
              </div>
              <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Send alert</button>
            </form>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Sent notification logs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {notificationsLog.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No notifications dispatched.</div>
              ) : (
                notificationsLog.map(log => (
                  <div key={log.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                    <strong>{log.target}</strong> via {log.channel}
                    <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{log.text}</p>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{log.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ⭐ CUSTOMER REVIEWS TAB */}
      {activeModule === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>⭐ Customer Feedback Reviews</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reviews.map(rev => (
                <div key={rev.id} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', position: 'relative' }}>
                  <div style={{ fontWeight: '700' }}>{rev.name}</div>
                  <div style={{ color: '#d97706', margin: '4px 0', fontSize: '0.85rem' }}>{'★'.repeat(rev.stars)}{'☆'.repeat(5 - rev.stars)}</div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#334155' }}>{rev.comment}</p>
                  
                  {rev.reply && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#eff6ff', borderRadius: '6px', borderLeft: '3px solid #2563eb', fontSize: '0.82rem' }}>
                      <strong>Your Reply:</strong> {rev.reply}
                    </div>
                  )}

                  {!rev.reply && (
                    <button onClick={() => { setActiveReviewId(rev.id); setReplyText(''); }} style={{ marginTop: '10px', padding: '4px 8px', fontSize: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reply</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {activeReviewId && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
              <h4>Reply to Review</h4>
              <form onSubmit={handleReplyReview} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" required value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type reply comment..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Post Reply</button>
              </form>
            </div>
          )}

        </div>
      )}



      {/* 📜 AUDIT ACTIVITY LOGS TAB */}
      {activeModule === 'audit-logs' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1' }}>
          <h3>📜 Company Audit logs</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '16px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Time</th>
                <th style={{ padding: '10px' }}>Type</th>
                <th style={{ padding: '10px' }}>Activity Event</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(act => (
                <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', color: '#64748b' }}>{act.date}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800', background: '#eff6ff', color: '#2563eb' }}>
                      {act.category}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#334155' }}>{act.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🎫 HELP & SUPPORT TAB */}
      {activeModule === 'support' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          {/* Create support ticket */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>🎫 Create Help & Support Ticket</h4>
            <form onSubmit={handleCreateSupportTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Subject Topic</label>
                <input type="text" required value={tktSubject} onChange={e => setTktSubject(e.target.value)} placeholder="e.g. API Access configuration error" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Detailed query message</label>
                <textarea required value={tktMessage} onChange={e => setTktMessage(e.target.value)} rows={4} placeholder="Type query message for platform administrators..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Submit Support Ticket</button>
            </form>
          </div>

          {/* Ticket history */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>Ticket history</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {supportTickets.map(t => (
                <div key={t.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>{t.subject}</strong>
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: t.status === 'Open' ? '#fffbeb' : '#dcfce7', color: t.status === 'Open' ? '#b45309' : '#15803d' }}>{t.status}</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{t.message}</p>
                  
                  {t.history && t.history.map((reply, idx) => (
                    <div key={idx} style={{ marginTop: '8px', padding: '8px', background: '#eff6ff', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <strong>{reply.sender}:</strong> {reply.message}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────────── */}

      {/* ADD CUSTOMER MODAL (WIZARD OTP FLOW) */}
      {addingCustomerStep > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Create Customer (Wizard Step {addingCustomerStep}/3)</h3>
              <button onClick={() => setAddingCustomerStep(0)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {/* Step 1: Inputs */}
            {addingCustomerStep === 1 && (
              <form onSubmit={handleCreateCustomerInputs} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Full Name *</label>
                  <input type="text" required value={custName} onChange={e => setCustName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Email Address *</label>
                  <input type="email" required value={custEmail} onChange={e => setCustEmail(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Phone *</label>
                  <input type="text" required value={custPhone} onChange={e => setCustPhone(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Address</label>
                  <input type="text" value={custAddress} onChange={e => setCustAddress(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Next: Send OTP</button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {addingCustomerStep === 2 && (
              <form onSubmit={handleVerifyCustomerOtp} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: '#475569' }}>A verification OTP has been sent via Super Admin's Centralized Notification service to <strong>{custEmail}</strong>.</p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Enter OTP Code (Demo Hint: Use 1234)</label>
                  <input type="text" required value={custOtp} onChange={e => setCustOtp(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px', fontWeight: '800' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Verify OTP Code</button>
              </form>
            )}

            {/* Step 3: Password creation */}
            {addingCustomerStep === 3 && (
              <form onSubmit={handleCompleteCustomerSetup} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: '#475569' }}>Verification successful. Please configure a login password for the customer.</p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Create Password</label>
                  <input type="password" required value={custPass} onChange={e => setCustPass(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Complete Registration</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CREATE CASHIER MODAL (OTP FLOW) */}
      {addingCashierStep > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Create Cashier (Step {addingCashierStep}/3)</h3>
              <button onClick={() => setAddingCashierStep(0)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {addingCashierStep === 1 && (
              <form onSubmit={e => handleCreateStaffInputs(e, 'cashier')} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Full Name *</label>
                  <input type="text" required value={staffName} onChange={e => setStaffName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Email Address *</label>
                  <input type="email" required value={staffEmail} onChange={e => setStaffEmail(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Phone</label>
                  <input type="text" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Next: Send OTP</button>
              </form>
            )}

            {addingCashierStep === 2 && (
              <form onSubmit={e => handleVerifyStaffOtp(e, 'cashier')} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem' }}>OTP has been sent to <strong>{staffEmail}</strong>.</p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Enter OTP Code (Demo Hint: Use 1234)</label>
                  <input type="text" required value={staffOtp} onChange={e => setStaffOtp(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: '800', letterSpacing: '4px' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Verify OTP</button>
              </form>
            )}

            {addingCashierStep === 3 && (
              <form onSubmit={e => handleCompleteStaffSetup(e, 'cashier')} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Create Password</label>
                  <input type="password" required value={staffPass} onChange={e => setStaffPass(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Complete Setup</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CREATE DELIVERY STAFF MODAL (OTP FLOW) */}
      {addingDeliveryStep > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Create Delivery Staff (Step {addingDeliveryStep}/3)</h3>
              <button onClick={() => setAddingDeliveryStep(0)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {addingDeliveryStep === 1 && (
              <form onSubmit={e => handleCreateStaffInputs(e, 'delivery')} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Full Name *</label>
                  <input type="text" required value={staffName} onChange={e => setStaffName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Email Address *</label>
                  <input type="email" required value={staffEmail} onChange={e => setStaffEmail(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Phone</label>
                  <input type="text" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Profile Photo URL</label>
                  <input type="text" value={staffProfilePhoto} onChange={e => setStaffProfilePhoto(e.target.value)} placeholder="https://example.com/photo.jpg" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Vehicle Type</label>
                    <select value={staffVehicleType} onChange={e => setStaffVehicleType(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}>
                      <option value="Bike">Bike</option>
                      <option value="Scooter">Scooter</option>
                      <option value="Car">Car</option>
                      <option value="Van">Van</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Vehicle Number</label>
                    <input type="text" value={staffVehicleNumber} onChange={e => setStaffVehicleNumber(e.target.value)} placeholder="KA-01-AB-1234" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>License Number</label>
                  <input type="text" value={staffLicenseNumber} onChange={e => setStaffLicenseNumber(e.target.value)} placeholder="DL-0420110012345" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Vehicle RC</label>
                  <input type="text" value={staffVehicleRc} onChange={e => setStaffVehicleRc(e.target.value)} placeholder="KA01AB1234RC" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Address</label>
                  <input type="text" value={staffAddress} onChange={e => setStaffAddress(e.target.value)} placeholder="456 Delivery Lane, Bangalore" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px', width: '100%' }}>Next: Send OTP</button>
              </form>
            )}

            {addingDeliveryStep === 2 && (
              <form onSubmit={e => handleVerifyStaffOtp(e, 'delivery')} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem' }}>OTP has been sent to <strong>{staffEmail}</strong>.</p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Enter OTP Code (Demo Hint: Use 1234)</label>
                  <input type="text" required value={staffOtp} onChange={e => setStaffOtp(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: '800', letterSpacing: '4px' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Verify OTP</button>
              </form>
            )}

            {addingDeliveryStep === 3 && (
              <form onSubmit={e => handleCompleteStaffSetup(e, 'delivery')} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Create Password</label>
                  <input type="password" required value={staffPass} onChange={e => setStaffPass(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <button type="submit" style={{ padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Complete Setup</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VIEW ORDER TIMELINE MODAL */}
      {viewingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '460px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Order status details timeline</h3>
              <button onClick={() => setViewingOrder(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><strong>Order ID:</strong> #{viewingOrder.id}</div>
              <div><strong>Customer Name:</strong> {viewingOrder.customerName}</div>
              <div><strong>Placing Date:</strong> {viewingOrder.date}</div>
              <div><strong>payment status:</strong> {viewingOrder.paymentStatus}</div>
              <div><strong>laundry timeline status:</strong> {viewingOrder.status}</div>

              {/* Status Timeline visual */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '6px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Timeline History Progress</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                  {[
                    { label: 'Order Created', ok: true },
                    { label: 'Accepted', ok: ['Accepted', 'Pickup Assigned', 'Picked Up', 'Received', 'Sorting', 'Washing', 'Drying', 'Ironing', 'Quality Check', 'Packing', 'Ready', 'Out For Delivery', 'Delivered'].includes(viewingOrder.status) },
                    { label: 'Washing & Processing', ok: ['Washing', 'Drying', 'Ironing', 'Quality Check', 'Packing', 'Ready', 'Out For Delivery', 'Delivered'].includes(viewingOrder.status) },
                    { label: 'Ready for Collection', ok: ['Ready', 'Out For Delivery', 'Delivered'].includes(viewingOrder.status) },
                    { label: 'Delivered', ok: viewingOrder.status === 'Delivered' }
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: step.ok ? '#16a34a' : '#94a3b8' }}>{step.ok ? '🟢' : '⚪'}</span>
                      <span style={{ fontWeight: step.ok ? '700' : '400', color: step.ok ? '#0f172a' : '#64748b' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assign Pickup / Delivery agent */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Assign Delivery Courier</label>
                <select 
                  value={viewingOrder.courier || ''} 
                  onChange={e => handleAssignDeliveryBoy(viewingOrder.id, e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value="">Unassigned</option>
                  {db.users.filter(u => u.role === 'delivery' && u.status !== 'Pending').map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button onClick={() => setViewingOrder(null)} style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER PROFILE DETAILS */}
      {viewingCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Customer Profile: {viewingCustomer.name}</h3>
              <button onClick={() => setViewingCustomer(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>Name:</strong> {viewingCustomer.name}</div>
              <div><strong>Email:</strong> {viewingCustomer.email}</div>
              <div><strong>Phone:</strong> {viewingCustomer.phone}</div>
              <div><strong>Address:</strong> {viewingCustomer.address}</div>
              <div><strong>Wallet Balance:</strong> QR {viewingCustomer.walletBalance.toFixed(2)}</div>
              <div><strong>Loyalty Points:</strong> {viewingCustomer.loyaltyPoints}</div>
              <div><strong>Notes:</strong> {viewingCustomer.notes || 'None'}</div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setViewingCustomer(null)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Close Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WALLET ADJUSTMENT MODAL */}
      {walletCust && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Adjust Wallet Balance</h3>
              <button onClick={() => setWalletCust(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleAdjustWalletSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><strong>Customer:</strong> {walletCust.name} (Current: QR {walletCust.walletBalance.toFixed(2)})</div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px' }}>Adjustment Mode</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label><input type="radio" checked={walletDir === 'in'} onChange={() => setWalletDir('in')} /> Add Funds (+)</label>
                  <label><input type="radio" checked={walletDir === 'out'} onChange={() => setWalletDir('out')} /> Deduct Funds (-)</label>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px' }}>Amount (QR)</label>
                <input type="number" required value={walletAmt} onChange={e => setWalletAmt(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setWalletCust(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOYALTY POINTS ADJUSTMENT MODAL */}
      {loyaltyCust && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Adjust Loyalty Points</h3>
              <button onClick={() => setLoyaltyCust(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleAdjustLoyaltySubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><strong>Customer:</strong> {loyaltyCust.name} (Current: {loyaltyCust.loyaltyPoints} points)</div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px' }}>Adjustment Mode</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label><input type="radio" checked={loyaltyDir === 'add'} onChange={() => setLoyaltyDir('add')} /> Add Points</label>
                  <label><input type="radio" checked={loyaltyDir === 'redeem'} onChange={() => setLoyaltyDir('redeem')} /> Redeem Points</label>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px' }}>Points Amount</label>
                <input type="number" required value={loyaltyPts} onChange={e => setLoyaltyPts(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setLoyaltyCust(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE POPUP */}
      {qrCust && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: qrCust.qrDisabled ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #16a34a, #10b981)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                {qrCust.qrDisabled ? '🚨 QR Disabled (Lost)' : 'Secure Customer QR Link'}
              </h3>
              <button onClick={() => setQrCust(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '150px', height: '150px', background: '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4.5rem', borderRadius: '12px', position: 'relative' }}>
                📱
                {qrCust.qrDisabled && (
                  <span style={{ position: 'absolute', top: '5px', right: '5px', background: '#ef4444', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>DISABLED</span>
                )}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
                <strong>{qrCust.name}</strong>
                <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
                  {qrCust.qrDisabled 
                    ? 'This QR is currently disabled. Scan will show access error.' 
                    : 'Scan this QR code to automatically log in to the Customer Portal.'}
                </p>
              </div>

              {!qrCust.qrDisabled ? (
                <>
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <button onClick={() => handleShareQR(qrCust)} style={{ flex: 1, padding: '10px', background: '#25d366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Share via WhatsApp</button>
                    <button onClick={() => { navigator.clipboard.writeText(`http://localhost:5173/customer?login=${qrCust.id}`); alert('Link copied to clipboard!'); }} style={{ padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔗 Copy Link</button>
                  </div>
                  <button onClick={() => handleDisableQR(qrCust)} style={{ width: '100%', padding: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>🚨 Disable Lost QR</button>
                </>
              ) : (
                <button onClick={() => handleGenerateNewSecureQR(qrCust)} style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>🔑 Generate New Secure QR</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT SERVICE CATALOG MODAL */}
      {(addingService || editingService) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{editingService ? 'Edit Catalog Service' : 'Add Catalog Service'}</h3>
              <button onClick={() => { setAddingService(false); setEditingService(null); }} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleSaveService} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Service Name</label>
                <input type="text" required value={sName} onChange={e => setSName(e.target.value)} placeholder="e.g. Wash & Fold Premium" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Category</label>
                  <select value={sCategory} onChange={e => setSCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                    <option value="Wash & Fold">Wash & Fold</option>
                    <option value="Dry Cleaning">Dry Cleaning</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Price (QR)</label>
                  <input type="number" required value={sPrice} onChange={e => setSPrice(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Service Image URL</label>
                <input type="text" value={sImage} onChange={e => setSImage(e.target.value)} placeholder="https://images.unsplash.com/photo-..." style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setAddingService(false); setEditingService(null); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save Catalog</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </PortalLayout>
  );
};
