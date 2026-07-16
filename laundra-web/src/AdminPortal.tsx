import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useDatabase, type Order, type Service, type Customer, type User, type Expense, type Promo, type Announcement } from './DatabaseContext';
import { PortalLayout } from './components/PortalLayout';
import { apiApproveDeliveryBoy, apiRejectDeliveryBoy } from './deliveryApi';

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

const getEmojiForService = (name: string) => {
  const n = String(name).toLowerCase();
  if (n.includes('saree') || n.includes('salwar')) return '🥻';
  if (n.includes('thobe') || n.includes('kurta') || n.includes('jalabiya') || n.includes('kameez')) return '🥼';
  if (n.includes('ghuthra') || n.includes('scarf')) return '🧣';
  if (n.includes('bisht') || n.includes('jacket') || n.includes('coat')) return '🧥';
  if (n.includes('skirt') || n.includes('dress')) return '👗';
  if (n.includes('suit') || n.includes('uniform') || n.includes('tuxedo')) return '👔';
  if (n.includes('pant') || n.includes('trouser') || n.includes('jean') || n.includes('short')) return '👖';
  if (n.includes('shoe') || n.includes('sneaker')) return '👞';
  if (n.includes('underwear') || n.includes('brief') || n.includes('bra')) return '🩲';
  if (n.includes('blanket') || n.includes('duvet') || n.includes('bed')) return '🛏️';
  if (n.includes('curtain') || n.includes('drape')) return '🪟';
  if (n.includes('carpet') || n.includes('rug')) return '🛤️';
  if (n.includes('towel')) return '🧻';
  if (n.includes('masalla')) return '🕌';
  if (n.includes('sock')) return '🧦';
  if (n.includes('glove')) return '🧤';
  if (n.includes('hat') || n.includes('cap')) return '🧢';
  if (n.includes('bag')) return '🎒';
  return '👕'; // Default
};

export const AdminPortal: React.FC = () => {
  const { db, saveDB, token } = useDatabase();
  const navigate = useNavigate();
  const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

  // Announcement composer state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annAudience, setAnnAudience] = useState<'All' | 'Delivery Staff' | 'Customers'>('All');

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

  // Platform Tickets
  const [platformTickets, setPlatformTickets] = useState<any[]>([]);
  
  // Customer Tickets (Admin View)
  const [adminCustomerTickets, setAdminCustomerTickets] = useState<any[]>([]);
  const [viewingSenderDetails, setViewingSenderDetails] = useState<any | null>(null);
  const [customerTicketReply, setCustomerTicketReply] = useState<{ [id: string]: string }>({});

  // Local state for modals & details
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Order | null>(null);
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
  const [custCode, setCustCode] = useState('');

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
  const [backendLeaveRequests, setBackendLeaveRequests] = useState<any[]>([]);

  // Manual orders / POS
  const [posCart, setPosCart] = useState<{ itemId: string; itemName: string; serviceTypeId: string; serviceTypeName: string; variantId: string; variantName: string; price: number; qty: number }[]>([]);
  const [selectedPosItem, setSelectedPosItem] = useState<string | null>(null);
  const [backendServices, setBackendServices] = useState<any[]>([]);
  const [posCustId, setPosCustId] = useState('');
  const [posCustName, setPosCustName] = useState('');
  const [posCustPhone, setPosCustPhone] = useState('');
  const [posCustEmail, setPosCustEmail] = useState('');
  const [posCustAddress, setPosCustAddress] = useState('');
  const [posPayMethod, setPosPayMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Wallet'>('Cash');
  const [posSearch, setPosSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Pressing' | 'Wash & Press' | 'Dry Cleaning'>('Pressing');
  const [posCustomerSearch, setPosCustomerSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  // Removed posCategory
  const [posCommission, setPosCommission] = useState<string>('');
  const [customPOSAmount, setCustomPOSAmount] = useState<string>('');
  const [customPOSDiscount, setCustomPOSDiscount] = useState<string>('');
  const [historyModalStaff, setHistoryModalStaff] = useState<any>(null);
  const [posCouponCode, setPosCouponCode] = useState('');
  const [posDiscount, setPosDiscount] = useState(0);
  const [posCouponApplied, setPosCouponApplied] = useState(false);

  const custDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (custDropdownRef.current && !custDropdownRef.current.contains(event.target as Node)) {
        setShowCustDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Service Forms
  const [addingService, setAddingService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [sName, setSName] = useState('');
  const [sCategory, setSCategory] = useState('Wash & Fold');
  const [sPrice, setSPrice] = useState('');
  const [sImage, setSImage] = useState('');
  const [sExpressSurcharge, setSExpressSurcharge] = useState('50');

  // Wallet / Loyalty adjustments
  const [walletCust, setWalletCust] = useState<Customer | null>(null);
  const [walletAmt, setWalletAmt] = useState('');
  const [walletDir, setWalletDir] = useState<'in' | 'out'>('in');
  const [loyaltyCust, setLoyaltyCust] = useState<Customer | null>(null);
  const [loyaltyPts, setLoyaltyPts] = useState('');
  const [loyaltyDir, setLoyaltyDir] = useState<'add' | 'redeem'>('add');

  // Coupon Forms
  const [editingCoupon, setEditingCoupon] = useState<Promo | null>(null);
  const [cpCode, setCpCode] = useState('');
  const [cpType, setCpType] = useState<'Percentage' | 'Flat'>('Percentage');
  const [cpValue, setCpValue] = useState('');
  const [cpDesc, setCpDesc] = useState('');

  // Expense Forms
  const [backendExpenses, setBackendExpenses] = useState<any[]>([]);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [expCategory, setExpCategory] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expSource, setExpSource] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Support ticket Forms
  const [tktSubject, setTktSubject] = useState('');
  const [tktMessage, setTktMessage] = useState('');

  // Central Notification Alerts sender
  const [alertTarget, setAlertTarget] = useState('');
  const [alertText, setAlertText] = useState('');
  const [alertChannel, setAlertChannel] = useState<'Email' | 'SMS' | 'Push' | 'WhatsApp'>('Email');
  const [notificationsLog, setNotificationsLog] = useState<{ id: string; target: string; channel: string; text: string; time: string }[]>([]);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [activeReviewId, setActiveReviewId] = useState('');

  // QR Modal
  const [qrCust, setQrCust] = useState<Customer | null>(null);

  const [systemAnnouncements, setSystemAnnouncements] = useState<any[]>([]);

  // Search & Filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('All');
  const [custSearch, setCustSearch] = useState('');

  // Get active company configurations
  const activeComp = db.companies.find(c => c.id === db.activeCompanyId) || {
    id: db.activeCompanyId || 'unknown',
    name: 'Tenant Company',
    adminEmail: 'admin@tenant.com',
    limits: { maxAdmins: 10, maxCashiers: 10, maxDeliveryStaff: 10, maxCustomers: 5000, maxOrdersPerMonth: 2000 },
    features: ['CUSTOMER_MANAGEMENT', 'ORDER_MANAGEMENT', 'DELIVERY_MODULE', 'WALLET']
  } as any;
  const limits = activeComp.limits || { maxAdmins: 3, maxCashiers: 5, maxDeliveryStaff: 10, maxCustomers: 5000, maxOrdersPerMonth: 2000 };
  const companyHeaderName = activeComp ? `${activeComp.name}${activeComp.address ? `, ${activeComp.address}` : ''}` : 'Laundry Desk';

  // Sync activities
  useEffect(() => {
    localStorage.setItem(`ll_${db.activeCompanyId}_activities`, JSON.stringify(activities));
  }, [activities, db.activeCompanyId]);

  // Fetch backend services, customers, and users
  const fetchBackendData = async () => {
    let allCustomers = db.customers;
    let allServices = backendServices;
    try {
      const servicesRes = await fetch(`${BASE_URL}/api/v1/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (servicesRes.ok) {
        const sData = await servicesRes.json();
        setBackendServices(sData);
        allServices = sData;

        // Sync with DatabaseContext
        const companyId = db.activeCompanyId;
        if (companyId) {
          const syncedItems: any[] = [];
          const syncedServiceTypes: any[] = [];
          const syncedServiceVariants: any[] = [];
          const syncedItemPrices: any[] = [];

          const otherItems = db.items.filter((i: any) => i.companyId !== companyId);
          const otherServiceTypes = db.serviceTypes.filter((st: any) => st.companyId !== companyId);
          const companyTypeIds = db.serviceTypes.filter((st: any) => st.companyId === companyId).map((st: any) => st.id);
          const otherServiceVariants = db.serviceVariants.filter((sv: any) => !companyTypeIds.includes(sv.serviceTypeId));
          const otherItemPrices = db.itemPrices.filter((ip: any) => ip.companyId !== companyId);

          const itemMap = new Map();
          const typeMap = new Map();

          sData.forEach((s: any) => {
            const itemKey = s.name.trim().toLowerCase();
            let itemId = itemMap.get(itemKey);
            if (!itemId) {
              itemId = `item-${companyId}-${itemKey.replace(/\s+/g, '-')}`;
              itemMap.set(itemKey, itemId);
              syncedItems.push({
                id: itemId,
                companyId,
                englishName: s.name,
                arabicName: s.name,
                status: 'Active'
              });
            }

            const catKey = s.category.trim().toLowerCase();
            let typeId = typeMap.get(catKey);
            if (!typeId) {
              typeId = `st-${companyId}-${catKey.replace(/\s+/g, '-')}`;
              typeMap.set(catKey, typeId);
              syncedServiceTypes.push({
                id: typeId,
                companyId,
                name: s.category
              });

              syncedServiceVariants.push({
                id: `sv-${typeId}-normal`,
                serviceTypeId: typeId,
                name: 'Normal'
              });
              syncedServiceVariants.push({
                id: `sv-${typeId}-express`,
                serviceTypeId: typeId,
                name: 'Express'
              });
            }

            if (s.price !== null && s.price !== undefined) {
              syncedItemPrices.push({
                id: `ip-${itemId}-normal`,
                companyId,
                itemId,
                serviceVariantId: `sv-${typeId}-normal`,
                price: parseFloat(s.price)
              });
            }

            if (s.express_price !== null && s.express_price !== undefined) {
              syncedItemPrices.push({
                id: `ip-${itemId}-express`,
                companyId,
                itemId,
                serviceVariantId: `sv-${typeId}-express`,
                price: parseFloat(s.express_price)
              });
            }
          });

          saveDB({
            items: [...otherItems, ...syncedItems],
            serviceTypes: [...otherServiceTypes, ...syncedServiceTypes],
            serviceVariants: [...otherServiceVariants, ...syncedServiceVariants],
            itemPrices: [...otherItemPrices, ...syncedItemPrices]
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch backend services:', err);
    }

    try {
      const expRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (expRes.ok) {
        const eData = await expRes.json();
        setBackendExpenses(eData);
      }
    } catch (err) {
      console.error('Failed to fetch backend expenses:', err);
    }

    try {
      const custRes = await fetch(`${BASE_URL}/api/v1/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (custRes.ok) {
        const cData = await custRes.json();
        // Map backend customers to the local Customer format
        const mapped = cData.map((c: any) => ({
          id: c.id,
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          walletBalance: parseFloat(c.wallet_balance || '0'),
          loyaltyPoints: c.loyalty_points || 0,
          creditBalance: 0,
          notes: '',
          qrStatus: 'Active QR' as const
        }));
        allCustomers = mapped;
        if (mapped.length > 0) {
          saveDB({ customers: mapped });
        }
      }
    } catch (err) {
      console.error('Failed to fetch backend customers:', err);
    }

    try {
      const ordersRes = await fetch(`${BASE_URL}/api/v1/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        const mappedOrders = oData.map((o: any) => {
          const matchedCustomer = allCustomers.find((c: any) => c.id === o.customer_id);
          const customerName = matchedCustomer ? matchedCustomer.name : 'Walk-in / Guest';
          const customerPhone = matchedCustomer ? matchedCustomer.phone : '';
          const customerAddress = matchedCustomer ? matchedCustomer.address : '';

          let displayStatus = 'Created';
          if (o.status === 'RECEIVED') displayStatus = 'Received';
          else if (o.status === 'WASHING') displayStatus = 'Washing';
          else if (o.status === 'IRONING') displayStatus = 'Ironing';
          else if (o.status === 'READY') displayStatus = 'Ready';
          else if (o.status === 'DELIVERED') displayStatus = 'Delivered';
          else if (o.status === 'CANCELLED') displayStatus = 'Cancelled';

          const totalQty = o.items ? o.items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) : 0;

          const mappedServices = o.items ? o.items.map((item: any) => {
            const matchedService = allServices.find((s: any) => s.id === item.service_id);
            return {
              serviceId: item.service_id,
              name: matchedService ? matchedService.name : `Service (Qty: ${item.quantity})`,
              qty: item.quantity,
              price: parseFloat(item.price || '0')
            };
          }) : [];

          return {
            id: o.order_number || String(o.id).substring(0, 8),
            backendId: o.id,
            customerId: o.customer_id,
            customerName: customerName,
            branch: 'Downtown HQ',
            date: o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            weightItems: `${totalQty} Items`,
            quantity: totalQty,
            planType: o.is_express ? 'Express' : 'One-time / Daily',
            paymentMethod: o.payment_method || 'CASH',
            paymentStatus: o.payment_status === 'PAID' ? 'Paid' : 'Unpaid',
            status: displayStatus,
            courier: o.delivery_boy_name || null,
            deliveryStatus: o.status === 'DELIVERED' ? 'Delivered' : 'Pending',
            phone: customerPhone,
            address: o.pickup_address || customerAddress,
            services: mappedServices,
            totalAmount: parseFloat(o.total_amount || '0'),
            total: parseFloat(o.total_amount || '0'),
            frequency: o.is_express ? 'Express' : 'One-time / Daily',
            deliveryOtp: ''
          };
        });
        
        saveDB({ orders: mappedOrders });
      }
    } catch (err) {
      console.error('Failed to fetch backend orders:', err);
    }

    try {
      const coupRes = await fetch(`${BASE_URL}/api/v1/coupons`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (coupRes.ok) {
        const coupData = await coupRes.json();
        const mappedCoupons = coupData.map((c: any) => ({
          id: c.id,
          code: c.code,
          type: c.discount_type === 'PERCENTAGE' ? 'Percentage' : 'Flat Amount',
          value: parseFloat(c.value),
          description: `Expires: ${c.expiry_date || 'Never'}`,
          uses: 0
        }));
        saveDB({ promos: mappedCoupons });
      }
    } catch (err) {
      console.error('Failed to fetch backend coupons:', err);
    }


    try {
      const usersRes = await fetch(`${BASE_URL}/api/v1/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const uData = await usersRes.json();
        const mappedUsers = uData.map((u: any) => {
          let mappedRole = 'admin';
          if (u.role === 'DELIVERY_BOY') mappedRole = 'delivery';
          else if (u.role === 'CASHIER') mappedRole = 'cashier';
          else if (u.role === 'CUSTOMER') mappedRole = 'customer';
          
          let mappedStatus = 'Active';
          if (u.status === 'PENDING_APPROVAL') mappedStatus = 'Pending';
          else if (u.status === 'SUSPENDED' || u.status === 'INACTIVE') mappedStatus = 'Suspended';
          
          return {
            id: u.id,
            name: u.name || '',
            role: mappedRole,
            email: u.email || '',
            phone: u.phone || '',
            address: u.address || '',
            status: mappedStatus,
            createdAt: u.created_at || new Date().toISOString(),
            profilePhoto: u.profile_photo || '',
            vehicleType: u.vehicle_type || '',
            vehicleNumber: u.vehicle_number || '',
            licenseNumber: u.license_number || '',
            vehicleRc: u.vehicle_rc || ''
          };
        });
        if (mappedUsers.length > 0) {
          saveDB({ users: mappedUsers });
        }
      }
    } catch (err) {
      console.error('Failed to fetch backend users:', err);
    }

    try {
      const leavesRes = await fetch(`${BASE_URL}/api/v1/leave-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (leavesRes.ok) {
        const lData = await leavesRes.json();
        setBackendLeaveRequests(lData);
      }
    } catch (err) {
      console.error('Failed to fetch backend leave requests:', err);
    }

    try {
      const tktRes = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tktRes.ok) {
        const tData = await tktRes.json();
        setPlatformTickets(tData);
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    }

    try {
      const custTktRes = await fetch(`${BASE_URL}/api/v1/admin/customer-support`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (custTktRes.ok) {
        const cTData = await custTktRes.json();
        setAdminCustomerTickets(cTData);
        localStorage.setItem(`ll_${db.activeCompanyId}_customer_support_tickets`, JSON.stringify(cTData));
        const unresolvedCount = cTData.filter((t: any) => t.status === 'OPEN' || t.status === 'PENDING').length;
        saveDB({ unresolvedSupportCount: unresolvedCount });
      }
    } catch (err) {
      console.error('Failed to fetch customer support tickets:', err);
    }

    try {
      const revRes = await fetch(`${BASE_URL}/api/v1/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (revRes.ok) {
        const rData = await revRes.json();
        setReviews(rData);
        localStorage.setItem(`ll_${db.activeCompanyId}_reviews`, JSON.stringify(rData));
        const lastSeen = parseInt(localStorage.getItem(`ll_${db.activeCompanyId}_last_seen_reviews_count`) || '0');
        const newCount = activeModule === 'reviews' ? 0 : Math.max(0, rData.length - lastSeen);
        saveDB({ unreadReviewsCount: newCount });
      }
    } catch (err) {
      console.error('Failed to fetch customer reviews:', err);
    }

    try {
      const annRes = await fetch(`${BASE_URL}/api/v1/announcements/admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (annRes.ok) {
        setSystemAnnouncements(await annRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch system announcements:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBackendData();
    }
  }, [token, db.activeCompanyId]);

  // Sync announcements & support ticket replies with local notifications
  useEffect(() => {
    let changed = false;
    const currentNotifications = [...db.notifications];

    // Check announcements
    systemAnnouncements.forEach(ann => {
      const exists = currentNotifications.some(n => n.text.includes(ann.title));
      if (!exists) {
        currentNotifications.unshift({
          id: Date.now() + Math.random(),
          text: `📢 Announcement: ${ann.title}`,
          time: new Date(ann.created_at).toLocaleDateString(),
          unread: true
        });
        changed = true;
      }
    });

    // Check support tickets
    platformTickets.forEach(t => {
      if (t.internal_notes) {
        const textToFind = `Ticket #${t.id || t.backendId} Reply`;
        const exists = currentNotifications.some(n => n.text.includes(textToFind));
        if (!exists) {
          currentNotifications.unshift({
            id: Date.now() + Math.random(),
            text: `🎫 Ticket #${t.id || t.backendId} Reply: ${t.internal_notes}`,
            time: 'Just now',
            unread: true
          });
          changed = true;
        }
      }
    });

    // Check customer reviews
    reviews.forEach(rev => {
      const cName = rev.customer_name || rev.customerName || 'Customer';
      const textToFind = `Review from ${cName}`;
      const exists = currentNotifications.some(n => n.text.includes(textToFind));
      if (!exists) {
        currentNotifications.unshift({
          id: Date.now() + Math.random(),
          text: `⭐ Review from ${cName}: "${(rev.comment || rev.text || '').substring(0, 30)}..."`,
          time: 'Just now',
          unread: true
        });
        changed = true;
      }
    });

    // Check customer/delivery support tickets
    adminCustomerTickets.forEach(t => {
      if (t.status === 'OPEN' || t.status === 'PENDING') {
        const textToFind = `Support Ticket #${t.id || t.backendId}`;
        const exists = currentNotifications.some(n => n.text.includes(textToFind));
        if (!exists) {
          currentNotifications.unshift({
            id: Date.now() + Math.random(),
            text: `🎧 Support Ticket #${t.id || t.backendId} from ${t.sender_name || t.senderName || 'User'}: ${t.subject}`,
            time: 'Just now',
            unread: true
          });
          changed = true;
        }
      }
    });

    if (changed) {
      saveDB({
        notifications: currentNotifications
      });
    }
  }, [systemAnnouncements, platformTickets, reviews, adminCustomerTickets]);

  // One-time migration: normalize any existing orders stored with UUID or prefixed IDs to plain 6-digit numbers
  useEffect(() => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const prefixPattern = /^(OR-|ORD-)/i;
    const needsMigration = db.orders.some(o => uuidPattern.test(o.id) || prefixPattern.test(o.id));
    if (needsMigration) {
      const migratedOrders = db.orders.map(o => {
        if (uuidPattern.test(o.id)) {
          const humanId = String(Math.floor(100000 + Math.random() * 900000));
          return { ...o, id: humanId, backendId: o.backendId || o.id };
        }
        if (prefixPattern.test(o.id)) {
          // Extract digits from OR-1943 → 1943, ORD-20260713-5503 → keep last digits, pad to 6
          const digits = o.id.replace(/[^0-9]/g, '');
          const humanId = digits.length >= 4 ? digits.slice(-6).padStart(6, '0') : String(Math.floor(100000 + Math.random() * 900000));
          return { ...o, id: humanId };
        }
        return o;
      });
      saveDB({ orders: migratedOrders });
    }
  }, [db.orders.length]);

  // Clear reviews badge when reviews tab is opened and mark all as seen
  useEffect(() => {
    if (activeModule === 'reviews') {
      localStorage.setItem(`ll_${db.activeCompanyId}_last_seen_reviews_count`, reviews.length.toString());
      saveDB({ unreadReviewsCount: 0 });
    }
  }, [activeModule, reviews.length, db.activeCompanyId]);

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
    const randomCode = 'CUST-' + Math.floor(10000 + Math.random() * 90000);
    setCustCode(randomCode);
    setAddingCustomerStep(1);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const defaultPass = "customer123";
      const res = await fetch(`${BASE_URL}/api/v1/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: custName,
          email: custEmail.trim() || null,
          phone: custPhone,
          address: custAddress,
          otp: "",
          password: defaultPass,
          referral_code: custCode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to create customer: ${data.detail || 'Unknown error'}`);
        return;
      }

      // Backend created successfully, update mock DB using real database ID
      const realId = data.id;

      const newCust: Customer = {
        id: realId,
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
        id: realId,
        name: custName,
        role: 'customer',
        email: custEmail,
        password: defaultPass,
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
      
      // Reset form
      setCustName('');
      setCustEmail('');
      setCustPhone('');
      setCustAddress('');
      setCustPass('');
      setCustOtp('');
      setCustCode('');
      setAddingCustomerStep(0);
    } catch (err) {
      console.error(err);
      alert('Network error creating customer');
    }
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

  const handleCreateStaffInputs = async (e: React.FormEvent, role: 'cashier' | 'delivery') => {
    e.preventDefault();
    const emailLower = staffEmail.trim().toLowerCase();
    const existing = db.users.find(u => u.email.toLowerCase() === emailLower);
    if (existing) {
      alert('Email already registered.');
      return;
    }
    const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
    if (role === 'cashier') {
      try {
        const token = localStorage.getItem('ll_auth_token');
        const res = await fetch(`${BASE_URL}/api/v1/auth/cashier/send-otp`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ email: staffEmail })
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.otp_debug) {
            alert(`[DEV MODE] SMTP not configured. The OTP for ${staffEmail} is: ${data.otp_debug}`);
          }
          setAddingCashierStep(2);
        } else {
          const data = await res.json();
          alert(`Error sending OTP: ${data.detail || 'Unknown error'}`);
        }
      } catch (err) {
        console.error(err);
        alert('Network error sending OTP');
      }
    } else {
      try {
        const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/v1/auth/delivery-boy/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: staffEmail })
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.otp_debug) {
            alert(`[DEV MODE] SMTP not configured. The OTP for ${staffEmail} is: ${data.otp_debug}`);
          }
          setAddingDeliveryStep(2);
        } else {
          const data = await res.json();
          alert(`Error sending OTP: ${data.detail || 'Unknown error'}`);
        }
      } catch (err) {
        console.error(err);
        alert('Network error sending OTP');
      }
    }
  };

  const handleVerifyStaffOtp = async (e: React.FormEvent, role: 'cashier' | 'delivery') => {
    e.preventDefault();
    if (role === 'cashier') {
      if (!staffOtp || staffOtp.length < 4) {
        alert('Please enter a valid OTP.');
        return;
      }
      setAddingCashierStep(3);
    } else {
      if (!staffOtp || staffOtp.length < 4) {
        alert('Please enter a valid OTP.');
        return;
      }
      try {
        const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/v1/auth/delivery-boy/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: staffEmail, otp: staffOtp })
        });
        if (res.ok) {
          setAddingDeliveryStep(3);
        } else {
          const data = await res.json();
          alert(`Invalid OTP: ${data.detail || 'Please try again.'}`);
        }
      } catch (err) {
        console.error(err);
        alert('Network error verifying OTP');
      }
    }
  };

  const handleCompleteStaffSetup = async (e: React.FormEvent, role: 'cashier' | 'delivery') => {
    e.preventDefault();
    const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
    
    if (role === 'cashier') {
      try {
        const token = localStorage.getItem('ll_auth_token');
        const res = await fetch(`${BASE_URL}/api/v1/auth/cashier/register`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            name: staffName,
            phone: staffPhone || 'N/A',
            email: staffEmail,
            password: staffPass,
            otp: staffOtp,
            address: staffAddress || 'N/A'
          })
        });
        
        if (res.ok) {
          const newUser: User = {
            id: 'u-' + (db.users.length + 1),
            name: staffName,
            role: role,
            email: staffEmail,
            password: staffPass || 'password',
            phone: staffPhone,
            address: staffAddress,
            status: 'Active',
            createdAt: new Date().toISOString()
          };
          saveDB({ users: [...db.users, newUser] });
          addActivity('Cashier', `Registered staff member: ${staffName}`);
          alert(`Registered cashier staff member successfully.`);
          
          setStaffName('');
          setStaffEmail('');
          setStaffPhone('');
          setStaffPass('');
          setStaffOtp('');
          setAddingCashierStep(0);
        } else {
          const data = await res.json();
          alert(`Error creating cashier: ${data.detail || 'Unknown error'}`);
        }
      } catch (err) {
        console.error(err);
        alert('Network error verifying OTP');
      }
    } else {
      try {
        const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/v1/auth/delivery-boy/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: staffName,
            phone: staffPhone,
            email: staffEmail,
            password: staffPass,
            otp: staffOtp,
            company_code: db.activeCompanyId,
            profile_photo: staffProfilePhoto || null,
            vehicle_type: staffVehicleType || null,
            vehicle_number: staffVehicleNumber || null,
            license_number: staffLicenseNumber || null,
            address: staffAddress || null,
            vehicle_rc: staffVehicleRc || null
          })
        });
        
        if (res.ok) {
          alert('Delivery staff application submitted successfully!');
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
          setAddingDeliveryStep(0);
          
          // Refresh lists from backend to show the new staff
          fetchBackendData();
        } else {
          const data = await res.json();
          alert(`Registration failed: ${data.detail || 'Unknown error'}`);
          // Go back to OTP step if invalid
          if (data.detail && data.detail.toLowerCase().includes('otp')) {
            setAddingDeliveryStep(2);
          }
        }
      } catch (err) {
        console.error(err);
        alert('Network error during registration');
      }
    }
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

  const handleDeleteStaff = async (user: User) => {
    if (confirm(`Remove staff member "${user.name}" permanently from the database? This cannot be undone.`)) {
      try {
        const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/v1/users/${user.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn('Backend delete staff failed:', err.detail);
        }
      } catch (err) {
        console.error('Network error deleting staff:', err);
      }
      
      const updated = db.users.filter(u => u.id !== user.id);
      saveDB({ users: updated });
      addActivity('Settings', `Deleted staff member: ${user.name}`);
    }
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/customers/by-email/${encodeURIComponent(cust.email)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          console.warn('Backend delete may have failed or customer was only in mock DB');
        }
      } catch (err) {
        console.error('Network error deleting customer:', err);
      }

      const updatedCustomers = db.customers.filter(c => c.id !== cust.id);
      const updatedUsers = db.users.filter(u => !(u.role === 'customer' && u.email.toLowerCase() === cust.email.toLowerCase()));
      saveDB({ customers: updatedCustomers, users: updatedUsers });
      addActivity('Customer', `Deleted customer: ${cust.name}`);
      alert(`Customer "${cust.name}" deleted successfully from all systems.`);
    }
  };

  const handleApproveApplication = async (applicant: User) => {
    const activeCompany = db.companies.find(c => c.id === db.activeCompanyId);
    const maxDelivery = activeCompany?.limits?.maxDeliveryStaff || 5;
    const currentDeliveryCount = db.users.filter(u => u.role === 'delivery' && u.status === 'Active').length;

    if (currentDeliveryCount >= maxDelivery) {
      alert(`Approval blocked: You have reached your Delivery Staff limit of ${maxDelivery} users for your subscription tier. Contact Super Admin to upgrade.`);
      return;
    }

    try {
      // ── REAL BACKEND: PATCH /api/v1/users/:id/status ──
      const res = await apiApproveDeliveryBoy(applicant.id, token);
      // Sync backend status change into local state
      const updated = db.users.map(u => u.id === applicant.id ? { ...u, status: 'Active' as const } : u);
      saveDB({ users: updated });
      addActivity('Delivery', `Approved delivery staff application for: ${applicant.name}`);
      alert(res.message || `✅ Application for ${applicant.name} approved! They can now log in to the Delivery Portal.`);
      
      // Refresh list to pull updated status from backend
      fetchBackendData();
    } catch (err: any) {
      console.error('Approve failed:', err);
      alert(err.message || 'Error approving staff. Please try again.');
    }
  };

  // Service Management actions
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('ll_auth_token');
    const companyId = db.activeCompanyId;
    if (!companyId) {
      alert('Active company not found');
      return;
    }

    try {
      if (editingService) {
        const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services/${editingService.id}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: sName,
            category: sCategory,
            price: parseFloat(sPrice) || 0,
            express_price: sExpressSurcharge ? parseFloat(sExpressSurcharge) : null
          })
        });
        if (res.ok) {
          alert('Service updated successfully!');
          setEditingService(null);
          fetchBackendData();
        } else {
          alert(await res.text());
        }
      } else {
        const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: sName,
            category: sCategory,
            price: parseFloat(sPrice) || 0,
            express_price: sExpressSurcharge ? parseFloat(sExpressSurcharge) : null
          })
        });
        if (res.ok) {
          alert('Service added successfully!');
          setAddingService(false);
          fetchBackendData();
        } else {
          alert(await res.text());
        }
      }
      setSName('');
      setSPrice('');
      setSCategory('Wash & Fold');
      setSExpressSurcharge('');
    } catch (err) {
      alert('Failed to save service catalog item');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    const token = localStorage.getItem('ll_auth_token');
    const companyId = db.activeCompanyId;
    if (!companyId) return;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services/${serviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Service deleted successfully!');
        fetchBackendData();
      } else {
        alert(await res.text());
      }
    } catch (err) {
      alert('Failed to delete service');
    }
  };

  // Order Management actions
  const handleUpdateOrderStatus = (orderId: string, nextStatus: Order['status']) => {
    const orderObj = db.orders.find(o => o.id === orderId);
    const customerName = orderObj ? orderObj.customerName : 'Customer';

    const updated = db.orders.map(o => {
      if (o.id === orderId) {
        let newCourier = o.courier;
        // If a delivery staff member updates the status (e.g. accepts it), they claim the order
        if ((db.activeRole === 'Delivery Staff' || db.activeRole === 'Delivery Boy') && db.currentDeliveryBoy) {
          newCourier = db.currentDeliveryBoy;
        }
        const isDelivered = nextStatus.toLowerCase() === 'delivered';
        return { 
          ...o, 
          status: nextStatus, 
          courier: newCourier, 
          deliveredDate: isDelivered ? new Date().toISOString().split('T')[0] : o.deliveredDate 
        };
      }
      return o;
    });
    
    const newNotification = {
      id: Date.now(),
      text: `Order #${orderId} (${customerName}) status updated to: ${nextStatus}`,
      time: 'Just now',
      unread: true
    };

    saveDB({ 
      orders: updated,
      notifications: [newNotification, ...db.notifications]
    });

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
    const updated = db.orders.map(o => {
      if (o.id === orderId) {
        let nextDeliveryStatus = o.deliveryStatus;
        if (courierName) {
          // Orders that are Ready or beyond get delivery assignment
          if (['Ready', 'Out For Delivery', 'Out for Delivery'].includes(o.status)) {
            nextDeliveryStatus = 'Out For Delivery';
          } else {
            // All other statuses (Created, Received, Washing, etc.) need pickup first
            nextDeliveryStatus = 'Pending Pickup';
          }
        } else {
          nextDeliveryStatus = 'Pending';
        }
        return {
          ...o,
          courier: courierName || null,
          pickupCourier: courierName || null,
          deliveryCourier: courierName || null,
          deliveryStatus: nextDeliveryStatus
        };
      }
      return o;
    });
    saveDB({ orders: updated });
    addActivity('Order', `Assigned delivery agent ${courierName || 'None'} to order #${orderId}`);
  };

  const handleAssignPickupCourier = (orderId: string, courierName: string) => {
    const updated = db.orders.map(o => {
      if (o.id === orderId) {
        let nextDeliveryStatus = o.deliveryStatus;
        if (courierName) {
          nextDeliveryStatus = 'Pending Pickup';
        }
        return {
          ...o,
          pickupCourier: courierName || null,
          courier: courierName || o.deliveryCourier || null,
          deliveryStatus: nextDeliveryStatus
        };
      }
      return o;
    });
    saveDB({ orders: updated });
    addActivity('Order', `Assigned pickup agent ${courierName || 'None'} to order #${orderId}`);
  };

  const handleAssignDeliveryCourier = (orderId: string, courierName: string) => {
    const updated = db.orders.map(o => {
      if (o.id === orderId) {
        let nextDeliveryStatus = o.deliveryStatus;
        if (courierName) {
          nextDeliveryStatus = 'Out For Delivery';
        }
        return {
          ...o,
          deliveryCourier: courierName || null,
          courier: courierName || o.pickupCourier || null,
          deliveryStatus: nextDeliveryStatus
        };
      }
      return o;
    });
    saveDB({ orders: updated });
    addActivity('Order', `Assigned delivery agent ${courierName || 'None'} to order #${orderId}`);
  };

  // Payments / POS manual orders checkout
  const getPOSCartTotal = () => {
    if (customPOSAmount !== '') {
      const val = parseFloat(customPOSAmount);
      if (!isNaN(val)) return val;
    }
    const sum = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const manualDiscount = parseFloat(customPOSDiscount) || 0;
    return Math.max(0, sum - posDiscount - manualDiscount);
  };

  const handleApplyCoupon = async () => {
    if (!posCouponCode) return;
    if (!posCustId) {
      alert('Please select a customer to apply a coupon.');
      return;
    }
    const cartTotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: posCouponCode,
          customer_id: posCustId,
          amount: cartTotal
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPosDiscount(data.discount_applied);
        setPosCouponApplied(true);
        alert(`Coupon applied! Discount: QR ${data.discount_applied.toFixed(2)}`);
      } else {
        const err = await res.json();
        alert(`Failed to apply coupon: ${err.detail}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error applying coupon');
    }
  };

  const handleCheckoutPOS = async () => {
    if (posCart.length === 0) return;



    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyOrdersCount = db.orders.filter(o => o.date.startsWith(currentMonth)).length;
    if (monthlyOrdersCount >= (limits.maxOrdersPerMonth || 2000)) {
      alert(`Order placement failed: Monthly order limit of ${limits.maxOrdersPerMonth || 2000} reached for this company.`);
      return;
    }

    const total = getPOSCartTotal();
    const isGuest = !posCustId;
    let customerName = posCustName || 'Guest Customer';

    let updatedCustomers = db.customers;
    if (!isGuest) {
      const cust = db.customers.find(c => c.id === posCustId)!;
      if (cust) {
        customerName = cust.name;
        if (posPayMethod === 'Wallet') {
          if (cust.walletBalance < total) {
            alert('Insufficient customer wallet balance!');
            return;
          }
          updatedCustomers = updatedCustomers.map(c => c.id === posCustId ? { ...c, walletBalance: c.walletBalance - total } : c);
        }
        
        // Also update the customer's profile if they changed it in the POS
        updatedCustomers = updatedCustomers.map(c => c.id === posCustId ? { ...c, phone: posCustPhone, address: posCustAddress } : c);
      }
    }

    const commAmt = posPayMethod === 'Cash' ? parseFloat(posCommission) || 0 : 0;

    // --- Try to save to backend first ---
    const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
    let backendOrderId: string | null = null;
    let backendOrderNumber: string | null = null;

    // posCustId is either a backend UUID (from dropdown) or empty (guest)
    if (posCustId && posCart.length > 0) {
      try {
        const itemsPayload = posCart.map(i => ({
          service_id: i.itemId,
          quantity: i.qty
        }));
        const res = await fetch(`${BASE_URL}/api/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            customer_id: posCustId,
            items: itemsPayload,
            coupon_code: posCouponApplied ? posCouponCode : null,
            is_express: posCart.some(i => i.variantName === 'Express')
          })
        });
        if (res.ok) {
          const data = await res.json();
          backendOrderId = data.id;
          backendOrderNumber = data.order_number;
        } else {
          const errData = await res.json();
          console.warn('Backend order creation failed:', errData.detail);
        }
      } catch (err) {
        console.error('Network error creating backend order:', err);
      }
    }

    const newOrderId = backendOrderNumber || String(Math.floor(100000 + Math.random() * 900000));

    const finalDiscount = posDiscount + (parseFloat(customPOSDiscount) || 0);

    const newOrder: Order = {
      id: newOrderId,
      backendId: backendOrderId || undefined,
      customerId: posCustId || 'guest',
      branch: db.activeBranch || 'Downtown HQ',
      customerName,
      date: new Date().toISOString().split('T')[0],
      totalAmount: total,
      status: 'Created',
      paymentMethod: posPayMethod,
      paymentStatus: posPayMethod === 'Wallet' ? 'Paid' : 'Unpaid',
      deliveryOtp: Math.floor(100000 + Math.random() * 900000).toString(),
      services: posCart.map(i => ({ serviceId: i.variantId, name: `${i.itemName} - ${i.serviceTypeName} (${i.variantName})`, qty: i.qty, plan: i.variantName, price: i.price })),
      deliveryStatus: 'Received',
      commission: commAmt,
      courier: null,
      phone: isGuest ? posCustPhone : undefined,
      email: isGuest ? posCustEmail : undefined,
      address: isGuest ? posCustAddress : undefined,
      discount: finalDiscount
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

    setPosCart([]);
    setPosCustId('');
    setPosCustName('');
    setPosCustPhone('');
    setPosCustEmail('');
    setPosCustAddress('');
    setPosPayMethod('Cash');
    setCustomPOSAmount('');
    setCustomPOSDiscount('');

    addActivity('Order', `Created POS manual order #${newOrderId} for ${customerName} (Commission: QR ${commAmt})`);
    alert(`POS checkout complete. Order #${newOrderId} placed successfully!`);
    
    // Redirect to Order Management
    setActiveModule('orders');

    setPosCart([]);
    setPosCustId('');
    setPosCustName('');
    setPosCustPhone('');
    setPosCustEmail('');
    setPosCustAddress('');
    setPosCommission('');
    setCustomPOSAmount('');
    setCustomPOSDiscount('');
    setPosCouponCode('');
    setPosDiscount(0);
    setPosCouponApplied(false);
  };

  // Coupons actions
  const handleDeleteCoupon = async (couponId: string, couponCode: string) => {
    if (!confirm('Delete coupon?')) return;
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      if (couponId) {
        await fetch(`${BASE_URL}/api/v1/coupons/${couponId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      saveDB({ promos: db.promos.filter(item => item.code !== couponCode) });
      addActivity('Settings', `Deleted coupon: ${couponCode}`);
    } catch (err) {
      console.error('Failed to delete coupon', err);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      
      const payload = {
        code: cpCode,
        discount_type: cpType === 'Percentage' ? 'PERCENTAGE' : 'FLAT',
        value: parseFloat(cpValue) || 0,
        expiry_date: '2099-12-31'
      };

      if (!editingCoupon) {
        const res = await fetch(`${BASE_URL}/api/v1/coupons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          const data = await res.json();
          const newPromo: any = {
            id: data.id,
            code: data.code,
            type: data.discount_type === 'PERCENTAGE' ? 'Percentage' : 'Flat Amount',
            value: parseFloat(data.value),
            description: `Expires: ${data.expiry_date || 'Never'}`,
            uses: 0
          };
          saveDB({ promos: [...db.promos, newPromo] });
          addActivity('Settings', `Created coupon: ${cpCode}`);
        } else {
          alert('Failed to save coupon to backend');
        }
      } else {
        // Edit logic skipped for brevity since backend doesn't have PUT /coupons yet.
        const updated = db.promos.map(p => p.code === editingCoupon.code ? { ...p, code: cpCode, type: cpType, value: parseFloat(cpValue) || 0, description: cpDesc } : p);
        saveDB({ promos: updated });
        addActivity('Settings', `Edited coupon: ${cpCode}`);
        setEditingCoupon(null);
      }
      
      setCpCode('');
      setCpValue('');
      setCpDesc('');
    } catch (err) {
      console.error('Error saving coupon', err);
    }
  };

  // Wallet & Loyalty adjustments
  const handleAdjustWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletCust) return;
    const val = parseFloat(walletAmt) || 0;
    const diff = walletDir === 'in' ? val : -val;

    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/customers/${walletCust.id}/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: diff })
      });

      let finalBalance = Math.max(0, walletCust.walletBalance + diff);
      if (res.ok) {
        const data = await res.json();
        finalBalance = parseFloat(data.wallet_balance || '0');
      } else {
        console.warn('Failed to update wallet on backend, updating locally anyway.');
      }

      const updated = db.customers.map(c => c.id === walletCust.id ? { ...c, walletBalance: finalBalance } : c);
      saveDB({ customers: updated });
      addActivity('Payment', `Adjusted wallet for customer ${walletCust.name}: ${diff > 0 ? '+' : ''}${diff} QR`);
      setWalletCust(null);
      setWalletAmt('');
    } catch (err) {
      console.error('Failed to update wallet', err);
      alert('Error connecting to backend.');
    }
  };

  const handleAdjustLoyaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyCust) return;
    const val = parseInt(loyaltyPts) || 0;
    const diff = loyaltyDir === 'add' ? val : -val;

    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/customers/${loyaltyCust.id}/loyalty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ points: diff })
      });

      let finalPoints = Math.max(0, loyaltyCust.loyaltyPoints + diff);
      if (res.ok) {
        const data = await res.json();
        finalPoints = data.loyalty_points;
      } else {
        console.warn('Failed to update loyalty on backend, updating locally anyway.');
      }

      const updated = db.customers.map(c => c.id === loyaltyCust.id ? { ...c, loyaltyPoints: finalPoints } : c);
      saveDB({ customers: updated });
      addActivity('Payment', `Adjusted loyalty points for customer ${loyaltyCust.name}: ${diff > 0 ? '+' : ''}${diff} points`);
      setLoyaltyCust(null);
      setLoyaltyPts('');
    } catch (err) {
      console.error('Failed to update loyalty points', err);
      alert('Error connecting to backend.');
    }
  };

  // Expenses actions
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        const res = await fetch(`${BASE_URL}/api/v1/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            description: expDesc,
            amount: parseFloat(expAmount) || 0,
            category: expCategory,
            source: expSource,
            date: expDate
          })
        });
        if (res.ok) {
          addActivity('Payment', `Edited expense: ${expDesc}`);
          setEditingExpense(null);
          fetchBackendData();
        }
      } else {
        const res = await fetch(`${BASE_URL}/api/v1/expenses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            description: expDesc,
            amount: parseFloat(expAmount) || 0,
            category: expCategory,
            source: expSource,
            date: expDate
          })
        });
        if (res.ok) {
          addActivity('Payment', `Added expense: ${expDesc}`);
          fetchBackendData();
        }
      }
      setExpCategory('');
      setExpDesc('');
      setExpSource('');
      setExpAmount('');
      setExpDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error('Error saving expense:', err);
    }
  };

  // Support Ticket submission to Super Admin
  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tktSubject || !tktMessage) return;

    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      
      const res = await fetch(`${BASE_URL}/api/v1/support/tickets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: tktSubject,
          description: tktMessage,
          priority: 'MEDIUM'
        })
      });

      if (res.ok) {
        alert('Support ticket created successfully!');
        setTktSubject('');
        setTktMessage('');
        fetchBackendData();
        addActivity('Settings', `Opened support ticket to Super Admin: ${tktSubject}`);
      } else {
        alert('Failed to create support ticket');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('Network error while creating ticket');
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
    const updated = db.customers.map(c => c.id === cust.id ? { ...c, qrStatus: 'Shared via WhatsApp' as const } : c);
    saveDB({ customers: updated });
    window.open(`https://api.whatsapp.com/send?text=Scan this secure link to access your customer laundry portal: ${window.location.origin}/customer?login=${cust.id}`);
  };

  const handleDisableQR = (cust: Customer) => {
    const updated = db.customers.map(c => c.id === cust.id ? { ...c, qrDisabled: true, qrStatus: 'Disabled' as const } : c);
    saveDB({ customers: updated });
    addActivity('Customer', `Disabled lost QR Code for customer: ${cust.name}`);
    alert(`QR code for ${cust.name} has been disabled. The old link is now invalid.`);
    setQrCust({ ...cust, qrStatus: 'Disabled' });
  };

  const handleGenerateNewSecureQR = (cust: Customer) => {
    const newId = 'cust-' + Math.floor(10000 + Math.random() * 90000);
    const updatedCustomers = db.customers.map(c => c.id === cust.id ? { ...c, id: newId, qrDisabled: false, qrStatus: 'Regenerated' as const } : c);
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
  const handleReplyReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeReviewId) return;

    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/reviews/${activeReviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText })
      });
      
      if (res.ok) {
        setReplyText('');
        setActiveReviewId('');
        fetchBackendData(); // refresh the list
      } else {
        alert('Failed to reply to review');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
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

  const todayRevenue = db.orders.filter(o => !o.isDeleted).reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);
  const pendingPaymentsTotal = db.orders.filter(o => !o.isDeleted && o.paymentStatus === 'Unpaid').reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);

  const impersonatedCompanyId = localStorage.getItem('ll_impersonatedCompanyId');
  const isImpersonating = !!impersonatedCompanyId && impersonatedCompanyId === db.activeCompanyId;

  return (
    <>
      {isImpersonating && (
        <div style={{ background: '#ef4444', color: 'white', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 9999, position: 'relative', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> 
            SUPER ADMIN IMPERSONATION MODE: Viewing {db.companies.find(c => c.id === db.activeCompanyId)?.name || db.activeCompanyId}
          </div>
          <button onClick={() => {
            localStorage.removeItem('ll_impersonatedCompanyId');
            navigate('/super-admin');
          }} style={{ background: 'white', color: '#ef4444', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
            Log out & Return to Super Admin
          </button>
        </div>
      )}
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

            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Total Customers</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>{totalCustomers} / {limits.maxCustomers}</div>
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
                  <th style={{ padding: '12px' }}>Customer ID</th>
                  <th style={{ padding: '12px' }}>Customer Name</th>
                  <th style={{ padding: '12px' }}>Contact</th>
                  <th style={{ padding: '12px' }}>QR Status</th>
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
                      <td style={{ padding: '12px', fontWeight: '700', color: '#64748b' }}>{c.referral_code || ('CUST-' + String(c.id).substring(0, 5).toUpperCase())}</td>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{c.name}</td>
                      <td style={{ padding: '12px' }}>{c.email} • {c.phone}</td>
                      <td style={{ padding: '12px' }}>
                        {c.qrStatus === 'Active QR' && <span style={{ padding: '4px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>🟢 Active QR</span>}
                        {c.qrStatus === 'Shared via WhatsApp' && <span style={{ padding: '4px 8px', background: '#dbeafe', color: '#2563eb', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>📤 Shared via WhatsApp</span>}
                        {c.qrStatus === 'Regenerated' && <span style={{ padding: '4px 8px', background: '#fef3c7', color: '#d97706', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>🔄 Regenerated</span>}
                        {c.qrStatus === 'Disabled' && <span style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>🚫 Disabled</span>}
                        {(!c.qrStatus || c.qrStatus === 'Not Shared Yet') && <span style={{ padding: '4px 8px', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>⏳ Not Shared Yet</span>}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#16a34a' }}>QR {c.walletBalance.toFixed(2)}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#6b21a8' }}>{c.loyaltyPoints} pts</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button onClick={() => { setWalletCust(c); setWalletDir('in'); }} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>💳 Wallet</button>
                          <button onClick={() => { setLoyaltyCust(c); setLoyaltyDir('add'); }} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#faf5ff', color: '#6b21a8', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>⭐ Loyalty</button>
                          <button onClick={() => setQrCust(c)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>📱 QR Code</button>
                          <button onClick={() => handleShareQR(c)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Share WA</button>
                          <button onClick={() => setViewingCustomer(c)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>👁️ View</button>
                          <button onClick={() => handleDeleteCustomer(c)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🗑️ Delete</button>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📥 Sign-Up Applications (Pending Approval)
                {db.users.filter(u => u.role === 'delivery' && u.status === 'Pending').length > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800' }}>
                    {db.users.filter(u => u.role === 'delivery' && u.status === 'Pending').length}
                  </span>
                )}
              </h4>
              <button onClick={() => {
                const uSaved = localStorage.getItem(`ll_${db.activeCompanyId}_users`);
                if (uSaved) {
                  saveDB({ users: JSON.parse(uSaved) });
                }
              }} style={{ padding: '6px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', color: '#2563eb' }}>🔄 Refresh</button>
            </div>
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
                      <button onClick={() => handleRejectApplication(u)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Reject ✕</button>
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

          {/* Leave Requests Management */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 Leave Requests
                {backendLeaveRequests.filter(lr => lr.status === 'PENDING').length > 0 && (
                  <span style={{ background: '#f59e0b', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800' }}>
                    {backendLeaveRequests.filter(lr => lr.status === 'PENDING').length}
                  </span>
                )}
              </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {backendLeaveRequests.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No leave requests submitted yet.</div>
              ) : (
                backendLeaveRequests.map(lr => (
                  <div key={lr.id} style={{ padding: '14px', background: lr.status === 'PENDING' ? '#fffbeb' : lr.status === 'APPROVED' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${lr.status === 'PENDING' ? '#fef3c7' : lr.status === 'APPROVED' ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong>{lr.delivery_boy_name}</strong> <span style={{ color: '#64748b', fontSize: '0.78rem' }}>({lr.delivery_boy_email})</span>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>📅 {lr.start_date} → {lr.end_date}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Reason: {lr.reason}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {lr.status === 'PENDING' ? (
                        <>
                          <button onClick={async () => {
                            try {
                              const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
                              const res = await fetch(`${BASE_URL}/api/v1/leave-requests/${lr.id}/status`, {
                                method: 'PATCH',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: 'APPROVED' })
                              });
                              if (res.ok) {
                                alert(`Leave request from ${lr.delivery_boy_name} approved.`);
                                fetchBackendData();
                              } else {
                                alert('Failed to approve leave request.');
                              }
                            } catch (e) {
                              console.error(e);
                              alert('Network error while approving.');
                            }
                          }} style={{ padding: '6px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>Approve ✓</button>
                          
                          <button onClick={async () => {
                            try {
                              const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
                              const res = await fetch(`${BASE_URL}/api/v1/leave-requests/${lr.id}/status`, {
                                method: 'PATCH',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: 'REJECTED' })
                              });
                              if (res.ok) {
                                alert(`Leave request from ${lr.delivery_boy_name} rejected.`);
                                fetchBackendData();
                              } else {
                                alert('Failed to reject leave request.');
                              }
                            } catch (e) {
                              console.error(e);
                              alert('Network error while rejecting.');
                            }
                          }} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>Reject ✕</button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: lr.status === 'APPROVED' ? '#15803d' : '#b91c1c' }}>
                          {lr.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 💰 DELIVERY PAYMENT MODULE */}
      {activeModule === 'delivery-payment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>💰 Delivery Staff Commission Payments</h4>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#64748b' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>Delivery Staff Name</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontWeight: '700' }}>Completed Tasks (Unpaid)</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700' }}>Total Unpaid Commission (QR)</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontWeight: '700' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {db.users.filter(u => u.role === 'delivery' && u.status !== 'Pending').map(u => {
                  const unpaidPickupTasks = db.orders.filter(o => 
                    o.courier === u.name && 
                    o.pickupCommission > 0 &&
                    !o.pickupCommissionPaid
                  );
                  const unpaidDeliveryTasks = db.orders.filter(o => 
                    o.courier === u.name && 
                    o.deliveryCommission > 0 &&
                    !o.deliveryCommissionPaid
                  );
                  const unpaidPickupAmount = unpaidPickupTasks.reduce((sum, o) => sum + (o.pickupCommission || 0), 0);
                  const unpaidDeliveryAmount = unpaidDeliveryTasks.reduce((sum, o) => sum + (o.deliveryCommission || 0), 0);
                  const unpaidAmount = unpaidPickupAmount + unpaidDeliveryAmount;
                  const totalUnpaidTasksCount = unpaidPickupTasks.length + unpaidDeliveryTasks.length;
                  
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{u.name}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold' }}>{totalUnpaidTasksCount} tasks</div>
                        {totalUnpaidTasksCount > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {unpaidPickupTasks.map(t => {
                              const d = new Date(t.date);
                              const dateStr = isNaN(d.getTime()) ? t.date.split(' ')[0] : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                              return (
                                <div key={`pickup-${t.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef3c7', padding: '6px', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                                    <span style={{ fontWeight: '700', color: '#b45309' }}>#{t.id} - Pickup</span>
                                    <span style={{ fontSize: '0.7rem' }}>{t.customerName}</span>
                                  </div>
                                  <span style={{ fontWeight: '800', color: '#b45309' }}>QR {(t.pickupCommission || 0).toFixed(2)}</span>
                                </div>
                              );
                            })}
                            {unpaidDeliveryTasks.map(t => {
                              const d = new Date(t.date);
                              const dateStr = isNaN(d.getTime()) ? t.date.split(' ')[0] : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                              return (
                                <div key={`delivery-${t.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '6px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                                    <span style={{ fontWeight: '700', color: '#1e40af' }}>#{t.id} - Delivery</span>
                                    <span style={{ fontSize: '0.7rem' }}>{t.customerName}</span>
                                  </div>
                                  <span style={{ fontWeight: '800', color: '#1e40af' }}>QR {(t.deliveryCommission || 0).toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: unpaidAmount > 0 ? '#b91c1c' : '#16a34a' }}>
                        QR {unpaidAmount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                        <select 
                          id={`payment-method-${u.id}`}
                          disabled={unpaidAmount <= 0}
                          style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Check">Check</option>
                          <option value="PhonePe">PhonePe</option>
                          <option value="Google Pay">Google Pay</option>
                        </select>
                        <button 
                          onClick={() => {
                            if (unpaidAmount <= 0) {
                              alert('No unpaid commission for this staff member.');
                              return;
                            }
                            const method = (document.getElementById(`payment-method-${u.id}`) as HTMLSelectElement).value;
                            if (window.confirm(`Mark QR ${unpaidAmount.toFixed(2)} as Paid via ${method} for ${u.name}?`)) {
                              const updatedOrders = db.orders.map(o => {
                                let newOrder = { ...o };
                                if (o.courier === u.name) {
                                  if (!o.pickupCommissionPaid && o.pickupCommission > 0) {
                                    newOrder.pickupCommissionPaid = true;
                                    newOrder.pickupPaymentMethod = method;
                                    newOrder.pickupPaymentDate = new Date().toISOString();
                                  }
                                  if (!o.deliveryCommissionPaid && o.deliveryCommission > 0) {
                                    newOrder.deliveryCommissionPaid = true;
                                    newOrder.deliveryPaymentMethod = method;
                                    newOrder.deliveryPaymentDate = new Date().toISOString();
                                  }
                                }
                                return newOrder;
                              });
                              saveDB({ orders: updatedOrders });
                              alert(`Successfully marked QR ${unpaidAmount.toFixed(2)} as paid to ${u.name} via ${method}!`);
                            }
                          }}
                          disabled={unpaidAmount <= 0}
                          style={{ 
                            padding: '8px 16px', 
                            background: unpaidAmount > 0 ? '#16a34a' : '#94a3b8', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontWeight: '700', 
                            cursor: unpaidAmount > 0 ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Mark as Paid
                        </button>
                        <button 
                          onClick={() => setHistoryModalStaff(u)}
                          style={{ 
                            padding: '8px 16px', 
                            background: '#f1f5f9', 
                            color: '#1e293b', 
                            border: '1px solid #cbd5e1', 
                            borderRadius: '8px', 
                            fontWeight: '700', 
                            cursor: 'pointer'
                          }}
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* HISTORY MODAL */}
          {historyModalStaff && createPortal(
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Task History: {historyModalStaff.name}</h3>
                  <button onClick={() => setHistoryModalStaff(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                </div>
                {(() => {
                  const completedTasks: { id: string; date: string; type: 'Pickup' | 'Delivery'; customerName: string; amount: number; paid: boolean; method?: string; paymentDate?: string }[] = [];
                  db.orders.filter(o => o.courier === historyModalStaff.name).forEach(o => {
                    if (o.pickupCommission && o.pickupCommission > 0) {
                      completedTasks.push({
                        id: `${o.id}-pickup`,
                        date: o.pickupPaymentDate || o.date,
                        type: 'Pickup',
                        customerName: o.customerName,
                        amount: o.pickupCommission,
                        paid: !!o.pickupCommissionPaid,
                        method: o.pickupPaymentMethod,
                        paymentDate: o.pickupPaymentDate
                      });
                    }
                    if (o.deliveryCommission && o.deliveryCommission > 0) {
                      completedTasks.push({
                        id: `${o.id}-delivery`,
                        date: o.deliveryPaymentDate || o.date,
                        type: 'Delivery',
                        customerName: o.customerName,
                        amount: o.deliveryCommission,
                        paid: !!o.deliveryCommissionPaid,
                        method: o.deliveryPaymentMethod,
                        paymentDate: o.deliveryPaymentDate
                      });
                    }
                  });
                  if (completedTasks.length === 0) return <p style={{ color: '#64748b' }}>No task history found.</p>;
                  
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b' }}>
                          <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>Order Details</th>
                          <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>Task Type</th>
                          <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700' }}>Amount (QR)</th>
                          <th style={{ textAlign: 'center', padding: '12px', fontWeight: '700' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedTasks.map(t => {
                          const d = new Date(t.date);
                          const dateStr = isNaN(d.getTime()) ? t.date.split(' ')[0] : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                          return (
                            <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '12px', fontWeight: '600' }}>{dateStr}</td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ fontWeight: '700', color: '#1e3a8a' }}>#{t.id.split('-')[0]}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.customerName}</div>
                              </td>
                              <td style={{ padding: '12px', fontWeight: '700', color: t.type === 'Pickup' ? '#d97706' : '#2563eb' }}>{t.type}</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: t.paid ? '#16a34a' : '#d97706' }}>{t.amount.toFixed(2)}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {t.paid ? (
                                  <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '0.75rem' }}>
                                    Paid via {t.method || 'Cash'}
                                  </span>
                                ) : (
                                  <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '0.75rem' }}>
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* 🏷️ SERVICE MANAGEMENT TAB */}
      {activeModule === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>📋 Active Service Catalog</h4>
              <button 
                onClick={() => {
                  setAddingService(true);
                  setEditingService(null);
                  setSName('');
                  setSCategory('Wash & Fold');
                  setSPrice('');
                  setSExpressSurcharge('');
                }}
                style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', cursor: 'pointer' }}
              >
                ➕ Add Service Item
              </button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#64748b' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', width: '80px' }}>Sl No</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>Item Name</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>Category</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700' }}>Normal Price (QR)</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700' }}>Express Price (QR)</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontWeight: '700', width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...backendServices]
                  .sort((a, b) => {
                    const nameCompare = (a.name || '').localeCompare(b.name || '');
                    if (nameCompare !== 0) return nameCompare;
                    return (a.category || '').localeCompare(b.category || '');
                  })
                  .map((service, index) => (
                    <tr key={service.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', color: '#64748b', fontWeight: '700' }}>{index + 1}</td>
                      <td style={{ padding: '12px', color: '#0f172a', fontWeight: '600' }}>{service.name}</td>
                      <td style={{ padding: '12px', color: '#475569' }}>{service.category}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#059669', fontWeight: '700' }}>{service.price}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#2563eb', fontWeight: '700' }}>{service.express_price || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            onClick={() => {
                              setEditingService(service);
                              setSName(service.name);
                              setSCategory(service.category);
                              setSPrice(service.price.toString());
                              setSExpressSurcharge(service.express_price ? service.express_price.toString() : '');
                            }}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                          >✏️ Edit</button>
                          <button 
                            onClick={() => handleDeleteService(service.id)}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                          >🗑️ Delete</button>
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
                  <th style={{ padding: '12px' }}>Order Date</th>
                  <th style={{ padding: '12px' }}>Delivery Date</th>
                  <th style={{ padding: '12px' }}>Total Amount</th>
                  <th style={{ padding: '12px' }}>status</th>
                  {db.activeRole !== 'Delivery Staff' && db.activeRole !== 'Delivery Boy' && <th style={{ padding: '12px' }}>Assigned Courier</th>}
                  <th style={{ padding: '12px', textAlign: 'center' }}>Modify Status</th>
                </tr>
              </thead>
              <tbody>
                {[...db.orders]
                  .reverse()
                  .filter(o => !o.isDeleted)
                  .filter(o => o.customerName.toLowerCase().includes(orderSearch.toLowerCase()))
                  .filter(o => orderFilter === 'All' || o.status === orderFilter)
                  .filter(o => {
                    if (db.activeRole !== 'Delivery Staff' && db.activeRole !== 'Delivery Boy') return true;
                    return o.courier === db.currentDeliveryBoy || o.courier === 'All Delivery Staff';
                  })
                  .map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>#{o.id}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{o.customerName}</td>
                      <td style={{ padding: '12px' }}>{o.date}</td>
                      <td style={{ padding: '12px', color: o.deliveredDate ? '#0f172a' : '#94a3b8', fontWeight: o.deliveredDate ? '600' : 'normal' }}>{o.deliveredDate || 'Not Delivered'}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#1e3a8a' }}>QR {o.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800',
                          background: o.status === 'Delivered' ? '#dcfce7' : o.status === 'Created' ? '#eff6ff' : '#fef3c7',
                          color: o.status === 'Delivered' ? '#15803d' : o.status === 'Created' ? '#2563eb' : '#b45309'
                        }}>{o.status}</span>
                      </td>
                      {db.activeRole !== 'Delivery Staff' && db.activeRole !== 'Delivery Boy' && (
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b' }}>📦 Pickup:</span>
                              <select
                                value={o.pickupCourier || ''}
                                onChange={e => handleAssignPickupCourier(o.id, e.target.value)}
                                disabled={!!(o.pickupAccepted || !['created', 'accepted', 'pickup assigned', 'pending pickup'].includes(o.status.toLowerCase()))}
                                style={{ 
                                  padding: '4px 6px', 
                                  border: '1.5px solid #cbd5e1', 
                                  borderRadius: '6px', 
                                  fontSize: '0.8rem', 
                                  background: (o.pickupAccepted || !['created', 'accepted', 'pickup assigned', 'pending pickup'].includes(o.status.toLowerCase())) ? '#e2e8f0' : 'white', 
                                  cursor: (o.pickupAccepted || !['created', 'accepted', 'pickup assigned', 'pending pickup'].includes(o.status.toLowerCase())) ? 'not-allowed' : 'pointer',
                                  width: '120px' 
                                }}
                              >
                                <option value="">-- Unassigned --</option>
                                <option value="Store">Store</option>
                                <option value="All Delivery Staff">All Delivery Staff</option>
                                {db.users.filter(u => u.role === 'delivery' && u.status !== 'Pending').map(u => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b' }}>🚚 Delivery:</span>
                              <select
                                value={o.deliveryCourier || ''}
                                onChange={e => handleAssignDeliveryCourier(o.id, e.target.value)}
                                disabled={!!(o.deliveryAccepted || o.status.toLowerCase() === 'delivered')}
                                style={{ 
                                  padding: '4px 6px', 
                                  border: '1.5px solid #cbd5e1', 
                                  borderRadius: '6px', 
                                  fontSize: '0.8rem', 
                                  background: (o.deliveryAccepted || o.status.toLowerCase() === 'delivered') ? '#e2e8f0' : 'white', 
                                  cursor: (o.deliveryAccepted || o.status.toLowerCase() === 'delivered') ? 'not-allowed' : 'pointer',
                                  width: '120px' 
                                }}
                              >
                                <option value="">-- Unassigned --</option>
                                <option value="Store">Store</option>
                                <option value="All Delivery Staff">All Delivery Staff</option>
                                {db.users.filter(u => u.role === 'delivery' && u.status !== 'Pending').map(u => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                              </select>
                            </div>
                            
                            {((o.pickupCourier && o.pickupCourier !== 'Store') || (o.deliveryCourier && o.deliveryCourier !== 'Store')) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '120px' }}>
                                {o.pickupCourier && o.pickupCourier !== 'Store' && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>📦 Pick QR:</span>
                                    <input 
                                      type="number" 
                                      placeholder="0.00"
                                      disabled={!['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'].includes(o.status.toLowerCase())}
                                      value={o.pickupCommission || ''}
                                      onChange={e => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const updatedOrders = db.orders.map(item => item.id === o.id ? {...item, pickupCommission: val} : item);
                                        saveDB({ orders: updatedOrders });
                                      }}
                                      style={{ width: '40px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', background: !['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'].includes(o.status.toLowerCase()) ? '#e2e8f0' : 'white', cursor: !['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'].includes(o.status.toLowerCase()) ? 'not-allowed' : 'text' }}
                                    />
                                  </div>
                                )}
                                
                                {o.deliveryCourier && o.deliveryCourier !== 'Store' && ['ready', 'out for delivery', 'delivered'].includes(o.status.toLowerCase()) && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>🚚 Deliv QR:</span>
                                    <input 
                                      type="number" 
                                      placeholder="0.00"
                                      disabled={o.status.toLowerCase() === 'delivered'}
                                      value={o.deliveryCommission || ''}
                                      onChange={e => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const updatedOrders = db.orders.map(item => item.id === o.id ? {...item, deliveryCommission: val} : item);
                                        saveDB({ orders: updatedOrders });
                                      }}
                                      style={{ width: '40px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', background: o.status.toLowerCase() === 'delivered' ? '#e2e8f0' : 'white', cursor: o.status.toLowerCase() === 'delivered' ? 'not-allowed' : 'text' }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
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
                          <button onClick={() => setViewingInvoice(o)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>📄 Invoice</button>
                          <button onClick={async () => {
                            if (window.confirm(`Are you sure you want to permanently delete order #${o.id}?\n\nThis will remove it from the database and cannot be undone.`)) {
                              try {
                                const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
                                const res = await fetch(`${BASE_URL}/api/v1/orders/${o.backendId || o.id}`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  console.warn('Backend delete failed:', err.detail);
                                }
                              } catch (err) {
                                console.error('Network error deleting order:', err);
                              }
                              // Soft delete in local state
                              saveDB({ orders: db.orders.map(item => item.id === o.id ? { ...item, isDeleted: true } : item) });
                              addActivity('Order', `Deleted order #${o.id}`);
                            }
                          }} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {activeModule === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 0.7fr', gap: '24px' }}>
          {/* POS Catalog browsing */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>🧺 Service Catalog</h4>
            
            {/* Category Filter Tabs at the top */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(['Pressing', 'Wash & Press', 'Dry Cleaning'] as const).map(cat => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat);
                      setSelectedPosItem(null);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: isActive ? 'none' : '1px solid #cbd5e1',
                      background: isActive ? '#2563eb' : '#f8fafc',
                      color: isActive ? 'white' : '#1e293b',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
                    }}
                  >
                    {cat === 'Pressing' ? '💨 Pressing' : cat === 'Wash & Press' ? '🧺 Wash & Clean' : '✨ Dry Cleaning'}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input 
                type="text" 
                value={posSearch} 
                onChange={e => setPosSearch(e.target.value)} 
                placeholder="🔍 Search item (e.g. Shirt)..." 
                style={{ flex: 1, padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', maxHeight: '420px', overflowY: 'auto' }}>
              {Array.from(new Set(backendServices.filter(s => s.name).map(s => s.name)))
                .filter(name => {
                  const matchesSearch = String(name).toLowerCase().includes(posSearch.toLowerCase());
                  const hasActiveService = backendServices.some(s => s.name === name && s.category === activeCategory);
                  return matchesSearch && hasActiveService;
                })
                .sort((a, b) => String(a).localeCompare(String(b)))
                .map((itemName: any) => {
                  const service = backendServices.find(s => s.name === itemName && s.category === activeCategory);
                  const hasNormal = service && service.price !== null && service.price !== undefined;
                  const hasExpress = service && service.express_price !== null && service.express_price !== undefined;

                  return (
                    <div 
                      key={itemName} 
                      style={{ 
                        padding: '16px 12px', 
                        border: '1.5px solid #cbd5e1', 
                        borderRadius: '12px', 
                        background: '#ffffff', 
                        textAlign: 'center',
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ fontSize: '1.8rem' }}>{getEmojiForService(itemName)}</div>
                      <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#0f172a', marginBottom: '4px' }}>{itemName}</div>
                      
                      <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: 'auto' }}>
                        {hasNormal ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const variantId = `normal_${service.id}`;
                              const existing = posCart.find(i => i.itemId === service.id && i.variantId === variantId);
                              if (existing) {
                                setPosCart(posCart.map(i => i.itemId === service.id && i.variantId === variantId ? { ...i, qty: i.qty + 1 } : i));
                              } else {
                                setPosCart([...posCart, { 
                                  itemId: service.id, 
                                  itemName: service.name, 
                                  serviceTypeId: service.category, 
                                  serviceTypeName: service.category, 
                                  variantId: variantId, 
                                  variantName: 'Normal', 
                                  price: service.price, 
                                  qty: 1 
                                }]);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 4px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Normal<br/>QR {parseFloat(service.price).toFixed(1)}
                          </button>
                        ) : (
                          <div style={{ flex: 1, padding: '6px 4px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</div>
                        )}

                        {hasExpress ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const variantId = `express_${service.id}`;
                              const existing = posCart.find(i => i.itemId === service.id && i.variantId === variantId);
                              if (existing) {
                                setPosCart(posCart.map(i => i.itemId === service.id && i.variantId === variantId ? { ...i, qty: i.qty + 1 } : i));
                              } else {
                                setPosCart([...posCart, { 
                                  itemId: service.id, 
                                  itemName: service.name, 
                                  serviceTypeId: service.category, 
                                  serviceTypeName: service.category, 
                                  variantId: variantId, 
                                  variantName: 'Express', 
                                  price: service.express_price, 
                                  qty: 1 
                                }]);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 4px',
                              background: '#faf5ff',
                              color: '#7c3aed',
                              border: '1px solid #e9d5ff',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Express<br/>QR {parseFloat(service.express_price).toFixed(1)}
                          </button>
                        ) : (
                          <div style={{ flex: 1, padding: '6px 4px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                      <strong style={{ fontSize: '0.85rem' }}>{item.itemName}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {item.serviceTypeName} ({item.variantName})
                        <br/>
                        Qty: {item.qty} — <strong>QR {(item.price * item.qty).toFixed(2)}</strong>
                      </div>
                    </div>
                    <button onClick={() => setPosCart(posCart.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                  </div>
                ))
              )}
            </div>

            {/* Customer select with search option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', position: 'relative' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Select Customer</label>
                
                {/* Search Input field */}
                <div ref={custDropdownRef} style={{ display: 'flex', gap: '6px', position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="🔍 Search name, ID or phone number..." 
                    value={posCustomerSearch}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={e => {
                      setPosCustomerSearch(e.target.value);
                      setShowCustDropdown(true);
                    }}
                    onFocus={() => setShowCustDropdown(true)}
                    style={{ width: '100%', padding: '8px', paddingRight: '30px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} 
                  />
                  {posCustomerSearch && (
                    <button 
                      onClick={() => {
                        setPosCustomerSearch('');
                        setPosCustId('');
                        setPosCustName('');
                        setPosCustPhone('');
                        setPosCustEmail('');
                        setPosCustAddress('');
                        setShowCustDropdown(false);
                      }} 
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}
                      type="button"
                    >
                      ✕
                    </button>
                  )}

                  {/* Dropdown list of filtered customers */}
                  {showCustDropdown && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                      
                      {/* Guest Checkout option */}
                      <div 
                        onClick={() => {
                          setPosCustId('');
                          setPosCustName('');
                          setPosCustPhone('');
                          setPosCustEmail('');
                          setPosCustAddress('');
                          setPosCustomerSearch('');
                          setShowCustDropdown(false);
                        }}
                        style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.85rem', color: '#1e293b', fontWeight: '700', background: posCustId === '' ? '#f0f9ff' : 'transparent' }}
                      >
                        — Guest Checkout —
                      </div>

                      {/* Filtered list */}
                      {db.customers
                        .filter(c => {
                          const query = posCustomerSearch.toLowerCase();
                          const nameMatch = c.name.toLowerCase().includes(query);
                          const phoneMatch = c.phone && c.phone.includes(query);
                          const codeMatch = c.referral_code && c.referral_code.toLowerCase().includes(query);
                          const fallbackMatch = c.id && ('CUST-' + String(c.id).substring(0, 5).toUpperCase()).toLowerCase().includes(query);
                          return nameMatch || phoneMatch || codeMatch || fallbackMatch;
                        })
                        .map(c => (
                          <div 
                            key={c.id}
                            onClick={() => {
                              setPosCustId(c.id);
                              setPosCustName(c.name);
                              setPosCustPhone(c.phone || '');
                              setPosCustEmail(c.email || '');
                              setPosCustAddress(c.address || '');
                              setPosCustomerSearch(`${c.name} (${c.phone || 'No Phone'})`);
                              setShowCustDropdown(false);
                            }}
                            style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.85rem', color: '#334155', background: posCustId === c.id ? '#eff6ff' : 'transparent' }}
                          >
                            <div style={{ fontWeight: '700' }}>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {c.phone || 'N/A'} {c.email ? `| ✉️ ${c.email}` : ''}</div>
                          </div>
                        ))}
                        
                      {db.customers.filter(c => {
                        const query = posCustomerSearch.toLowerCase();
                        const nameMatch = c.name.toLowerCase().includes(query);
                        const phoneMatch = c.phone && c.phone.includes(query);
                        const codeMatch = c.referral_code && c.referral_code.toLowerCase().includes(query);
                        const fallbackMatch = c.id && ('CUST-' + String(c.id).substring(0, 5).toUpperCase()).toLowerCase().includes(query);
                        return nameMatch || phoneMatch || codeMatch || fallbackMatch;
                      }).length === 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                          No customers found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>


              {posCustId === '' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Guest Customer Name</label>
                    <input type="text" value={posCustName} onChange={e => setPosCustName(e.target.value)} placeholder="Enter Guest name..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Guest Phone Number</label>
                    <input type="text" value={posCustPhone} onChange={e => setPosCustPhone(e.target.value)} placeholder="Enter guest phone..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Guest Email Address</label>
                    <input type="email" value={posCustEmail} onChange={e => setPosCustEmail(e.target.value)} placeholder="Enter guest email..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Guest Physical Address</label>
                    <input type="text" value={posCustAddress} onChange={e => setPosCustAddress(e.target.value)} placeholder="Enter guest address..." style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b' }}>Name (Read-only)</label>
                      <input type="text" value={posCustName} readOnly style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b' }}>Email (Read-only)</label>
                      <input type="text" value={posCustEmail} readOnly style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#0f172a' }}>Update Phone Number</label>
                      <input type="text" value={posCustPhone} onChange={e => setPosCustPhone(e.target.value)} placeholder="Update phone..." style={{ width: '100%', padding: '6px', border: '1px solid #94a3b8', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#0f172a' }}>Update Address</label>
                    <input type="text" value={posCustAddress} onChange={e => setPosCustAddress(e.target.value)} placeholder="Update address..." style={{ width: '100%', padding: '6px', border: '1px solid #94a3b8', borderRadius: '4px' }} />
                  </div>
                </div>
              )}

              {/* Coupon input field */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Enter Coupon Code" 
                  value={posCouponCode} 
                  onChange={e => { setPosCouponCode(e.target.value); setPosDiscount(0); setPosCouponApplied(false); }} 
                  style={{ flex: 1, padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} 
                />
                <button 
                  onClick={handleApplyCoupon} 
                  style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Apply
                </button>
              </div>
              {posCouponApplied && (
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>
                  Discount Applied: -QR {posDiscount.toFixed(2)}
                </div>
              )}

              {/* Discount input field */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontWeight: '700' }}>Discount (QR):</span>
                <input 
                  type="number" 
                  step="0.01" 
                  value={customPOSDiscount} 
                  className="no-spinners"
                  placeholder="0.00"
                  onChange={e => setCustomPOSDiscount(e.target.value)} 
                  style={{ width: '100px', padding: '6px 10px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontWeight: '700', fontSize: '1rem', color: '#0f172a', textAlign: 'right' }} 
                />
              </div>

              {/* POS total amount field */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontWeight: '700' }}>POS total amount:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: '800', color: '#64748b' }}>QR</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={customPOSAmount} 
                    className="no-spinners"
                    placeholder={(posCart.reduce((sum, item) => sum + (item.price * item.qty), 0) - posDiscount - (parseFloat(customPOSDiscount) || 0)).toFixed(2)}
                    onChange={e => setCustomPOSAmount(e.target.value)} 
                    style={{ width: '100px', padding: '6px 10px', border: '1.5px solid #2563eb', borderRadius: '6px', fontWeight: '800', fontSize: '1.1rem', color: '#2563eb', textAlign: 'right', background: '#eff6ff' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <select value={posPayMethod} onChange={e => setPosPayMethod(e.target.value as any)} style={{ padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="Cash">Cash payment</option>
                  <option value="Card">Card payment</option>
                  <option value="UPI">UPI payment</option>
                  <option value="Wallet">Wallet payment</option>
                </select>
                <button 
                  onClick={() => {
                    if (posCart.length === 0) {
                      alert('Please add at least one laundry service to the cart before checking out.');
                      return;
                    }
                    handleCheckoutPOS();
                  }} 
                  style={{ 
                    padding: '10px', 
                    background: posCart.length === 0 ? '#94a3b8' : '#16a34a', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: '700', 
                    cursor: posCart.length === 0 ? 'not-allowed' : 'pointer' 
                  }}
                >
                  Checkout
                </button>
              </div>

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
                  <button onClick={() => handleDeleteCoupon((p as any).id, p.code)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
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
                <th style={{ padding: '10px' }}>Phone</th>
                <th style={{ padding: '10px' }}>Current Wallet</th>
                <th style={{ padding: '10px' }}>Current Loyalty points</th>
              </tr>
            </thead>
            <tbody>
              {db.customers.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: '700' }}>{c.name}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{c.phone || 'N/A'}</td>
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
              {backendExpenses.map((ex, i) => (
                <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{ex.description}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Category: {ex.category} • Source: {ex.source} • Date: {ex.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <strong style={{ color: '#ef4444' }}>- QR {Number(ex.amount).toFixed(2)}</strong>
                    <button onClick={() => {
                      setEditingExpense(ex);
                      setExpCategory(ex.category || '');
                      setExpDesc(ex.description || '');
                      setExpSource(ex.source || '');
                      setExpAmount(ex.amount?.toString() || '');
                      setExpDate(ex.date || '');
                    }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6', fontWeight: 'bold' }}>Edit</button>
                    <button onClick={async () => {
                      if (confirm('Are you sure you want to delete this expense?')) {
                        try {
                          const res = await fetch(`${BASE_URL}/api/v1/expenses/${ex.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (res.ok) {
                            addActivity('Payment', `Deleted expense: ${ex.description}`);
                            fetchBackendData();
                          }
                        } catch (err) {
                          console.error('Error deleting expense:', err);
                        }
                      }
                    }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 12px 0' }}>{editingExpense ? '✏️ Edit Expense' : '➕ Add Expense'}</h4>
            <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Date</label>
                  <input type="date" required value={expDate} onChange={e => setExpDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Category</label>
                  <input type="text" required value={expCategory} onChange={e => setExpCategory(e.target.value)} placeholder="Enter category" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Description</label>
                <input type="text" required value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="e.g. Packaging boxes purchase" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Source</label>
                  <select required value={expSource} onChange={e => setExpSource(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }}>
                    <option value="" disabled>Select</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Check">Check</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Google Pay">Google Pay</option>
                    <option value="Cash">Cash</option>
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
                <strong>Total Company Registered Customers:</strong> {totalCustomers}
              </div>
            </div>
          </div>

        </div>
      )}


      {/* 📢 SYSTEM ANNOUNCEMENTS TAB */}
      {activeModule === 'announcements' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>📢 System Announcements</h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
            Important platform updates, maintenance schedules, and feature releases from the Super Admin.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {systemAnnouncements.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                No active system announcements at this time.
              </div>
            ) : (
              systemAnnouncements.map(ann => (
                <div key={ann.id} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong style={{ fontSize: '1rem', color: '#1e3a8a' }}>{ann.title}</strong>
                    <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '4px 8px', borderRadius: '12px', color: '#475569', fontWeight: 'bold' }}>
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0, lineHeight: '1.5' }}>
                    {ann.content}
                  </p>
                </div>
              ))
            )}
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
                  <div style={{ fontWeight: '700' }}>{rev.customer_name || 'Unknown Customer'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <span>📧 {rev.customer_email || 'N/A'}</span>
                    <span>📞 {rev.customer_phone || 'N/A'}</span>
                    <span>📍 {rev.customer_address || 'N/A'}</span>
                  </div>
                  <div style={{ color: '#d97706', margin: '6px 0', fontSize: '0.85rem' }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</div>
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
              {platformTickets.map(t => (
                <div key={t.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>{t.subject}</strong>
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: t.status === 'OPEN' ? '#fffbeb' : '#dcfce7', color: t.status === 'OPEN' ? '#b45309' : '#15803d' }}>{t.status}</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{t.description}</p>
                  
                  {t.internal_notes && (
                    <div style={{ marginTop: '8px', padding: '8px', background: '#eff6ff', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <strong>Admin Reply:</strong> {t.internal_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 🎧 CUSTOMER SUPPORT TAB */}
      {activeModule === 'customer-support' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
          <h4 style={{ margin: '0 0 16px 0' }}>🎧 Customer/Delivery Support Desk</h4>
          {adminCustomerTickets.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>No customer tickets found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {adminCustomerTickets.map(t => (
                <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: t.status === 'OPEN' ? '#fdf8f6' : '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h5 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#1e293b' }}>{t.subject}</h5>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                        From: <strong>{t.sender_name}</strong> ({t.sender_email}) - <span style={{color: '#2563eb', fontWeight: 'bold'}}>[{t.sender_type}]</span> on {new Date(t.created_at).toLocaleDateString()}
                        <button
                          onClick={() => setViewingSenderDetails(t)}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', padding: 0, marginLeft: '8px' }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: t.status === 'OPEN' ? '#fffbeb' : '#dcfce7', color: t.status === 'OPEN' ? '#b45309' : '#15803d', fontWeight: 'bold' }}>
                      {t.status}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 16px 0', color: '#334155', fontSize: '0.9rem', background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {t.description}
                  </p>

                  {t.admin_response ? (
                    <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <strong style={{ color: '#1d4ed8' }}>Your Reply:</strong>
                      <p style={{ margin: '4px 0 0 0', color: '#1e3a8a' }}>{t.admin_response}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <textarea 
                        value={customerTicketReply[t.id] || ''} 
                        onChange={e => setCustomerTicketReply({...customerTicketReply, [t.id]: e.target.value})}
                        placeholder="Type your response to the customer..." 
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                        rows={2} 
                      />
                      <button 
                        onClick={async () => {
                          const replyText = customerTicketReply[t.id];
                          if (!replyText) return alert('Please enter a response.');
                          try {
                            const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
                            const token = localStorage.getItem('ll_auth_token');
                            const res = await fetch(`${BASE_URL}/api/v1/admin/customer-support/${t.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ status: 'RESPONDED', admin_response: replyText })
                            });
                            if (res.ok) {
                              alert('Response sent to customer!');
                              fetchBackendData();
                            } else {
                              alert('Failed to send response.');
                            }
                          } catch (e) {
                            console.error(e);
                            alert('Network error.');
                          }
                        }}
                        style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Send Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewingSenderDetails && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>{viewingSenderDetails.sender_type} Details</h3>
                  <button onClick={() => setViewingSenderDetails(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', padding: 0, lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#334155', fontSize: '0.95rem' }}>
                  <div><strong>Name:</strong> {viewingSenderDetails.sender_name || 'N/A'}</div>
                  <div><strong>Email:</strong> {viewingSenderDetails.sender_email || 'N/A'}</div>
                  <div><strong>Phone Number:</strong> {viewingSenderDetails.sender_phone || 'N/A'}</div>
                  <div><strong>Address / Area:</strong> {viewingSenderDetails.sender_address || 'N/A'}</div>
                </div>
                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <button onClick={() => setViewingSenderDetails(null)} style={{ padding: '8px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────────── */}

      {/* ADD CUSTOMER MODAL */}
      {addingCustomerStep > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Create Customer</h3>
              <button onClick={() => setAddingCustomerStep(0)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateCustomer} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px', color: '#64748b' }}>Customer ID (Auto Generated)</label>
                <input type="text" readOnly disabled value={custCode} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b', fontWeight: '700' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" required value={custName} onChange={e => setCustName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Email Address</label>
                <input type="email" value={custEmail} onChange={e => setCustEmail(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Phone *</label>
                <input type="text" required value={custPhone} onChange={e => setCustPhone(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Address</label>
                <input type="text" value={custAddress} onChange={e => setCustAddress(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}>Create Customer</button>
            </form>
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
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Enter OTP Code</label>
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
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Enter OTP Code</label>
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

      {/* VIEW INVOICE MODAL */}
      {viewingInvoice && (() => {
        const invoiceCompName = activeComp?.name || 'Laundry';
        const invoiceCompAddr = (activeComp?.address && activeComp.address !== 'N/A') ? activeComp.address : '';
        const invoiceCompPhone = (activeComp?.phone && activeComp.phone !== 'N/A') ? activeComp.phone : '';
        const invoiceCompAltPhone = ((activeComp as any)?.shop_contact_no && (activeComp as any).shop_contact_no !== 'N/A') ? (activeComp as any).shop_contact_no : '';
        // Combined phone display: e.g. "+97450123456, +974501234123"
        const invoicePhoneDisplay = [invoiceCompPhone, invoiceCompAltPhone].filter(Boolean).join(', ');
        return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>🧾 Order Invoice Details</h3>
              <button onClick={() => setViewingInvoice(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            
            <div style={{ padding: '24px', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px', fontFamily: "'Courier New', Courier, monospace" }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>{invoiceCompName}</h4>
                  {invoiceCompAddr && (
                    <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px', fontStyle: 'italic' }}>{invoiceCompAddr}</div>
                  )}
                  {invoicePhoneDisplay && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>{invoicePhoneDisplay}</div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{new Date(viewingInvoice.date).toLocaleDateString()}</div>
                </div>

                <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Order ID:</span>
                    <span style={{ fontWeight: '700' }}>#{viewingInvoice.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Order Date:</span>
                    <span style={{ fontWeight: '700' }}>{viewingInvoice.date}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Delivery Date:</span>
                    <span style={{ fontWeight: '700' }}>{viewingInvoice.deliveredDate || 'Not Delivered'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Customer:</span>
                    <span style={{ fontWeight: '700' }}>{viewingInvoice.customerName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Customer Phone:</span>
                    <span style={{ fontWeight: '700' }}>{viewingInvoice.phone || db.customers.find(c => c.id === viewingInvoice.customerId)?.phone || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Customer Addr:</span>
                    <span style={{ fontWeight: '700', textAlign: 'right', maxWidth: '60%', overflowWrap: 'anywhere' }}>{viewingInvoice.address || db.customers.find(c => c.id === viewingInvoice.customerId)?.address || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Payment Method:</span>
                    <span style={{ fontWeight: '700' }}>{viewingInvoice.paymentMethod || 'Cash'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Status:</span>
                    <span style={{ fontWeight: '700', color: viewingInvoice.status === 'Delivered' ? '#16a34a' : '#2563eb' }}>{viewingInvoice.status}</span>
                  </div>
                  {viewingInvoice.discount && viewingInvoice.discount > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Discount Applied:</span>
                      <span style={{ fontWeight: '700', color: '#ef4444' }}>QR {viewingInvoice.discount.toFixed(2)}</span>
                    </div>
                  ) : null}
                  {invoiceCompAddr && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Shop Address:</span>
                      <span style={{ fontWeight: '700', textAlign: 'right', maxWidth: '60%', overflowWrap: 'anywhere' }}>{invoiceCompAddr}</span>
                    </div>
                  )}
                  {invoiceCompPhone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Shop Phone:</span>
                      <span style={{ fontWeight: '700' }}>{invoiceCompPhone}</span>
                    </div>
                  )}
                </div>

                <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Services / Items</div>
                  {viewingInvoice.services && viewingInvoice.services.length > 0 ? (
                    viewingInvoice.services.map((s: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.82rem' }}>
                        <span>{s.name} x{s.qty || 1}</span>
                        <span style={{ fontWeight: '700' }}>QR {((s.price) * (s.qty || 1)).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span>{viewingInvoice.weightItems || 'Standard Laundry'}</span>
                      <span style={{ fontWeight: '700' }}>QR {viewingInvoice.totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {viewingInvoice.discount && viewingInvoice.discount > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span>Discount:</span>
                    <span>-QR {viewingInvoice.discount.toFixed(2)}</span>
                  </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', fontSize: '1rem', fontWeight: '800' }}>
                  <span>TOTAL AMOUNT:</span>
                  <span>QR {viewingInvoice.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setViewingInvoice(null)} style={{ padding: '8px 16px', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontWeight: '700' }}>Close</button>
                <button
                  onClick={() => {
                    const win = window.open('', '_blank', 'width=450,height=600');
                    if (!win) return;
                    const custPhone = viewingInvoice.phone || db.customers.find(c => c.id === viewingInvoice.customerId)?.phone || 'N/A';
                    const custAddr = viewingInvoice.address || db.customers.find(c => c.id === viewingInvoice.customerId)?.address || 'N/A';
                    win.document.write(`
                      <html>
                        <head>
                          <title>Invoice #${viewingInvoice.id}</title>
                          <style>
                            body { font-family: 'Courier New', Courier, monospace; font-size: 14px; padding: 30px; line-height: 1.4; }
                            h2 { text-align: center; margin: 0 0 10px 0; }
                            .center { text-align: center; }
                            .divider { border-top: 1px dashed #000; margin: 15px 0; }
                            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                            .bold { font-weight: bold; }
                          </style>
                        </head>
                        <body>
                          <h2>${invoiceCompName}</h2>
                          ${invoiceCompAddr ? `<div class="center" style="font-size: 12px; font-style: italic;">${invoiceCompAddr}</div>` : ''}
                          ${invoicePhoneDisplay ? `<div class="center" style="font-size: 12px; font-weight: bold;">${invoicePhoneDisplay}</div>` : ''}
                          <div class="divider"></div>
                          <div class="row"><span class="bold">Order ID:</span><span>#${viewingInvoice.id}</span></div>
                          <div class="row"><span class="bold">Order Date:</span><span>${viewingInvoice.date}</span></div>
                          <div class="row"><span class="bold">Delivery Date:</span><span>${viewingInvoice.deliveredDate || 'Not Delivered'}</span></div>
                          <div class="row"><span class="bold">Customer:</span><span>${viewingInvoice.customerName}</span></div>
                          <div class="row"><span class="bold">Customer Tel:</span><span>${custPhone}</span></div>
                          <div class="row"><span class="bold">Customer Addr:</span><span>${custAddr}</span></div>
                          <div class="row"><span class="bold">Payment:</span><span>${viewingInvoice.paymentMethod || 'Cash'}</span></div>
                          <div class="row"><span class="bold">Status:</span><span>${viewingInvoice.status}</span></div>
                          ${viewingInvoice.discount && viewingInvoice.discount > 0 ? `
                            <div class="row"><span class="bold">Discount Amount:</span><span>QR ${viewingInvoice.discount.toFixed(2)}</span></div>
                          ` : ''}
                          <div class="divider"></div>
                          <div class="row bold" style="font-size: 12px; text-transform: uppercase;"><span>Services / Items</span><span>Price</span></div>
                          ${viewingInvoice.services && viewingInvoice.services.length > 0 ? 
                            viewingInvoice.services.map((s: any) => `
                              <div class="row">
                                <span>${s.name} ${s.express ? '(Express)' : ''} x${s.qty || 1}</span>
                                <span>QR ${((s.express ? s.price * 1.5 : s.price) * (s.qty || 1)).toFixed(2)}</span>
                              </div>
                            `).join('') : `
                              <div class="row">
                                <span>${viewingInvoice.weightItems || 'Standard Laundry'}</span>
                                <span>QR ${viewingInvoice.totalAmount.toFixed(2)}</span>
                              </div>
                            `
                          }
                          <div class="divider"></div>
                          ${viewingInvoice.discount && viewingInvoice.discount > 0 ? `
                            <div class="row bold">
                              <span>DISCOUNT APPLIED:</span>
                              <span>-QR ${viewingInvoice.discount.toFixed(2)}</span>
                            </div>
                            <div class="divider"></div>
                          ` : ''}
                          <div class="row bold" style="font-size: 16px;">
                            <span>TOTAL AMOUNT:</span>
                            <span>QR ${viewingInvoice.totalAmount.toFixed(2)}</span>
                          </div>
                          <div class="divider"></div>
                          <div class="center" style="margin-top: 20px; font-size: 12px;">Thank you for your business!</div>
                        </body>
                      </html>
                    `);
                    win.document.close();
                    win.print();
                  }}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  🖨️ Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

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
              {viewingOrder.pickupNotes && (
                <div style={{ color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: '6px', fontWeight: '600' }}>
                  <strong>⚠️ Pickup Inspection Notes:</strong> {viewingOrder.pickupNotes}
                </div>
              )}

              {(() => {
                const customerObj = db.customers.find(c => c.id === viewingOrder.customerId || c.name === viewingOrder.customerName);
                if (!customerObj) return null;
                return (
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: '700' }}>
                      <span>📱 QR Customer Portal Active</span>
                    </div>
                    <div style={{ color: '#64748b' }}>Customer manages orders, invoices, and payments via their unique QR link in browser.</div>
                    <button
                      onClick={() => {
                        alert(`Portal Link sent to customer "${customerObj.name}" via SMS/WhatsApp: ${window.location.origin}/customer?login=${customerObj.id}`);
                      }}
                      style={{ alignSelf: 'flex-start', padding: '4px 8px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}
                    >
                      📲 Resend Portal Link
                    </button>
                  </div>
                );
              })()}

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
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Assign Pickup Courier</label>
                  <select 
                    value={viewingOrder.pickupCourier || ''} 
                    onChange={e => {
                      handleAssignPickupCourier(viewingOrder.id, e.target.value);
                      const updated = db.orders.find(o => o.id === viewingOrder.id);
                      if (updated) setViewingOrder(updated);
                    }}
                    disabled={!!(viewingOrder.pickupAccepted || !['created', 'accepted', 'pickup assigned', 'pending pickup'].includes(viewingOrder.status.toLowerCase()))}
                    style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', background: (viewingOrder.pickupAccepted || !['created', 'accepted', 'pickup assigned', 'pending pickup'].includes(viewingOrder.status.toLowerCase())) ? '#e2e8f0' : 'white', cursor: (viewingOrder.pickupAccepted || !['created', 'accepted', 'pickup assigned', 'pending pickup'].includes(viewingOrder.status.toLowerCase())) ? 'not-allowed' : 'pointer' }}
                  >
                    <option value="">Unassigned</option>
                    <option value="Store">Store</option>
                    <option value="All Delivery Staff">All Delivery Staff</option>
                    {db.users.filter(u => u.role === 'delivery' && u.status !== 'Pending').map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Assign Delivery Courier</label>
                  <select 
                    value={viewingOrder.deliveryCourier || ''} 
                    onChange={e => {
                      handleAssignDeliveryCourier(viewingOrder.id, e.target.value);
                      const updated = db.orders.find(o => o.id === viewingOrder.id);
                      if (updated) setViewingOrder(updated);
                    }}
                    disabled={!!(viewingOrder.deliveryAccepted || viewingOrder.status.toLowerCase() === 'delivered')}
                    style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', background: (viewingOrder.deliveryAccepted || viewingOrder.status.toLowerCase() === 'delivered') ? '#e2e8f0' : 'white', cursor: (viewingOrder.deliveryAccepted || viewingOrder.status.toLowerCase() === 'delivered') ? 'not-allowed' : 'pointer' }}
                  >
                    <option value="">Unassigned</option>
                    <option value="Store">Store</option>
                    <option value="All Delivery Staff">All Delivery Staff</option>
                    {db.users.filter(u => u.role === 'delivery' && u.status !== 'Pending').map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {((viewingOrder.pickupCourier && viewingOrder.pickupCourier !== 'Store') || (viewingOrder.deliveryCourier && viewingOrder.deliveryCourier !== 'Store')) && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {viewingOrder.pickupCourier && viewingOrder.pickupCourier !== 'Store' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0f172a' }}>📦 Pickup Commission (QR):</label>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          disabled={!['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'].includes(viewingOrder.status.toLowerCase())}
                          value={viewingOrder.pickupCommission || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setViewingOrder({...viewingOrder, pickupCommission: val});
                            const updatedOrders = db.orders.map(o => o.id === viewingOrder.id ? {...o, pickupCommission: val} : o);
                            saveDB({ orders: updatedOrders });
                          }}
                          style={{ width: '100px', padding: '6px', border: '1.5px solid #cbd5e1', borderRadius: '4px', background: !['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'].includes(viewingOrder.status.toLowerCase()) ? '#e2e8f0' : 'white', cursor: !['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'].includes(viewingOrder.status.toLowerCase()) ? 'not-allowed' : 'text' }}
                        />
                      </div>
                    )}
                    
                    {viewingOrder.deliveryCourier && viewingOrder.deliveryCourier !== 'Store' && ['ready', 'out for delivery', 'delivered'].includes(viewingOrder.status.toLowerCase()) && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: viewingOrder.pickupCourier && viewingOrder.pickupCourier !== 'Store' ? '1px solid #e2e8f0' : 'none', paddingTop: viewingOrder.pickupCourier && viewingOrder.pickupCourier !== 'Store' ? '8px' : '0' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0f172a' }}>🚚 Delivery Commission (QR):</label>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          disabled={viewingOrder.status.toLowerCase() === 'delivered'}
                          value={viewingOrder.deliveryCommission || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setViewingOrder({...viewingOrder, deliveryCommission: val});
                            const updatedOrders = db.orders.map(o => o.id === viewingOrder.id ? {...o, deliveryCommission: val} : o);
                            saveDB({ orders: updatedOrders });
                          }}
                          style={{ width: '100px', padding: '6px', border: '1.5px solid #cbd5e1', borderRadius: '4px', background: viewingOrder.status.toLowerCase() === 'delivered' ? '#e2e8f0' : 'white', cursor: viewingOrder.status.toLowerCase() === 'delivered' ? 'not-allowed' : 'text' }}
                        />
                      </div>
                    )}
                  </div>
                )}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '460px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            {/* Header Section */}
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', padding: '32px 24px 24px', color: 'white', position: 'relative', textAlign: 'center' }}>
              <button onClick={() => setViewingCustomer(null)} style={{ position: 'absolute', right: '16px', top: '16px', color: 'rgba(255,255,255,0.8)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', transition: 'color 0.2s' }}>✕</button>
              
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'white', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: '800', margin: '0 auto 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {viewingCustomer.name.charAt(0).toUpperCase()}
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: '800' }}>{viewingCustomer.name}</h3>
              <div style={{ fontSize: '0.9rem', color: '#e0f2fe' }}>{viewingCustomer.email}</div>
            </div>

            {/* Content Section */}
            <div style={{ padding: '24px', background: '#f8fafc' }}>
              
              {/* Financial Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Wallet Balance</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#16a34a' }}>QR {viewingCustomer.walletBalance.toFixed(2)}</div>
                </div>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Loyalty Points</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f59e0b' }}>⭐ {viewingCustomer.loyaltyPoints}</div>
                </div>
              </div>

              {/* Details List */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>📱</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Phone Number</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500', color: '#1e293b' }}>{viewingCustomer.phone}</div>
                  </div>
                </div>
                <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>📍</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Address</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500', color: '#1e293b' }}>{viewingCustomer.address}</div>
                  </div>
                </div>
                <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.2rem', color: '#94a3b8', marginTop: '2px' }}>📝</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Notes</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#475569', lineHeight: '1.4' }}>{viewingCustomer.notes || 'No specific notes for this customer.'}</div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div style={{ marginTop: '24px' }}>
                <button onClick={() => setViewingCustomer(null)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  Close Profile
                </button>
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
            <div style={{ background: qrCust.qrStatus === 'Disabled' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #16a34a, #10b981)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                {qrCust.qrStatus === 'Disabled' ? '🚨 QR Disabled (Lost)' : 'Secure Customer QR Link'}
              </h3>
              <button onClick={() => setQrCust(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '150px', height: '150px', background: '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4.5rem', borderRadius: '12px', position: 'relative' }}>
                📱
                {qrCust.qrStatus === 'Disabled' && (
                  <span style={{ position: 'absolute', top: '5px', right: '5px', background: '#ef4444', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>DISABLED</span>
                )}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
                <strong>{qrCust.name}</strong>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', marginTop: '12px', fontSize: '0.8rem', color: '#334155', textAlign: 'left' }}>
                  <p style={{ margin: '0 0 6px 0' }}>💡 <strong>Important Note:</strong> This QR code is the customer's <strong>permanent access</strong> to their Customer Portal.</p>
                  <p style={{ margin: '0 0 6px 0' }}>Customers <strong>do not</strong> need to install any app. They simply scan the QR or click the WhatsApp link to securely access their account via the browser.</p>
                  <p style={{ margin: 0 }}>If the QR is lost or compromised, you can disable it and regenerate a new secure one below.</p>
                </div>
                {qrCust.qrStatus === 'Disabled' && (
                  <p style={{ margin: '12px 0 0 0', color: '#ef4444', fontWeight: '700' }}>
                    🚨 This QR is currently disabled. Scan will show an access error.
                  </p>
                )}
              </div>

              {qrCust.qrStatus !== 'Disabled' ? (
                <>
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <button onClick={() => handleShareQR(qrCust)} style={{ flex: 1, padding: '10px', background: '#25d366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Share via WhatsApp</button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/customer?login=${qrCust.id}`); alert('Link copied to clipboard!'); }} style={{ padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔗 Copy Link</button>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Category</label>
                  <select value={sCategory} onChange={e => setSCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                    <option value="Wash & Fold">Wash & Fold</option>
                    <option value="Dry Cleaning">Dry Cleaning</option>
                    <option value="Premium Services">Premium Services</option>
                    <option value="Steam Press">Steam Press</option>
                    <option value="Express Services">Express Services</option>
                    <option value="Hotel Laundry">Hotel Laundry</option>
                    <option value="Commercial Laundry">Commercial Laundry</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Price (QR)</label>
                  <input type="number" step="0.01" required value={sPrice} onChange={e => setSPrice(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Express (+%)</label>
                  <input type="number" required value={sExpressSurcharge} onChange={e => setSExpressSurcharge(e.target.value)} placeholder="50" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
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
    </>
  );
};
