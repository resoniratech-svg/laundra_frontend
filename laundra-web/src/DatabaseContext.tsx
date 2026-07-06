import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Type definitions matching vanilla application schema
export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  expressSurcharge: number;
  active: boolean;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  walletBalance: number;
  loyaltyPoints: number;
  creditBalance: number;
  notes: string;
  subRemaining?: number;
  subDuration?: string;
  password?: string;
  qrDisabled?: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  branch: string;
  date: string;
  weightItems?: string; // e.g. "1 Bag (Wash & Fold)"
  quantity?: number;
  planType?: string;
  paymentMethod: string;
  status: 'Created' | 'Pending' | 'Placed' | 'Accepted' | 'Received' | 'Washing' | 'Ironing' | 'Processing' | 'Ready' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  courier: string | null;
  deliveryStatus: string;
  phone?: string;
  address?: string;
  services?: any[];
  totalAmount: number;
  total?: number;
  frequency?: 'One-time / Daily' | 'Monthly';
  clothesPerDay?: number;
  isManual?: boolean;
  commission?: number;
  paymentStatus?: string;
  deliveryOtp?: string;
}

export interface Expense {
  date: string;
  category: string;
  description: string;
  source: string;
  loggedBy: string;
  amount: number;
}

export interface Promo {
  code: string;
  type: 'Percentage' | 'Flat';
  value: number;
  description: string;
  uses: number;
}

export interface Notification {
  id: number;
  text: string;
  time: string;
  unread: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'delivery' | 'customer' | 'cashier';
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  status?: string;
  createdAt?: string;
  age?: number;
  profilePhoto?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  vehicleRc?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  adminEmail: string;
  status: 'Active' | 'Suspended';
  phone?: string;
  address?: string;
  gstNumber?: string;
  businessType?: string;
  logo?: string;
  subscription: {
    tier: 'Free Trial' | 'Premium' | 'Enterprise';
    status: 'Active' | 'Expired';
    expiresAt: string;
  };
  features: {
    expressWash: boolean;
    expenses: boolean;
    promos: boolean;
    deliveryOperations: boolean;
    customerManagement?: boolean;
    orderManagement?: boolean;
    cashierModule?: boolean;
    deliveryModule?: boolean;
    serviceManagement?: boolean;
    paymentModule?: boolean;
    expenseModule?: boolean;
    reports?: boolean;
    coupons?: boolean;
    wallet?: boolean;
    loyaltyProgram?: boolean;
    invoiceModule?: boolean;
    qrCode?: boolean;
    barcode?: boolean;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    whatsAppNotifications?: boolean;
    publicTracking?: boolean;
    apiAccess?: boolean;
    webhooks?: boolean;
    multiLanguage?: boolean;
    backupRestore?: boolean;
  };
  limits?: {
    maxAdmins?: number;
    maxCashiers?: number;
    maxDeliveryStaff?: number;
    maxCustomers?: number;
    maxOrdersPerMonth?: number;
    maxBranches?: number;
    maxStorage?: number;
    maxApiRequests?: number;
  };
}

export interface Database {
  services: Service[];
  customers: Customer[];
  orders: Order[];
  expenses: Expense[];
  promos: Promo[];
  notifications: Notification[];
  users: User[];
  drawerCash: number;
  activeBranch: string;
  activeRole: string;
  currentDeliveryBoy: string | null;
  companies: Company[];
  activeCompanyId: string;
}

interface DatabaseContextType {
  db: Database;
  setServices: (services: Service[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setOrders: (orders: Order[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setPromos: (promos: Promo[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUsers: (users: User[]) => void;
  setDrawerCash: (cash: number) => void;
  setActiveBranch: (branch: string) => void;
  setActiveRole: (role: string) => void;
  setCurrentDeliveryBoy: (boy: string | null) => void;
  saveDB: (updatedFields: Partial<Database>) => void;
  createCompany: (name: string, slug: string, adminEmail: string, adminPass: string, address?: string, phone?: string, gstNumber?: string, businessType?: string, logo?: string) => void;
  deleteCompany: (companyId: string) => void;
  updateCompany: (companyId: string, updates: Partial<Company>) => void;
  changeActiveCompany: (companyId: string) => void;
}

const DEFAULT_SERVICES: Service[] = [
  { id: 'srv-1', name: 'Standard Shirt Wash & Fold', category: 'Wash & Fold', price: 3.50, expressSurcharge: 50, active: true, image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-2', name: 'Premium Suit Dry Cleaning', category: 'Dry Cleaning', price: 18.00, expressSurcharge: 50, active: true, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-3', name: 'Silk Dress Dry Cleaning', category: 'Premium Services', price: 25.00, expressSurcharge: 50, active: true, image: 'https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-4', name: 'Bedsheet Laundry & Fold', category: 'Wash & Fold', price: 8.50, expressSurcharge: 50, active: true, image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-5', name: 'Steam Press Trousers', category: 'Steam Press', price: 2.00, expressSurcharge: 50, active: true, image: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-6', name: 'Designer Wedding Gown Clean', category: 'Premium Services', price: 75.00, expressSurcharge: 50, active: true, image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-7', name: 'Express Suit & Press', category: 'Express Services', price: 28.00, expressSurcharge: 0, active: true, image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-8', name: 'Comforter & Blanket Wash', category: 'Wash & Fold', price: 15.00, expressSurcharge: 50, active: true, image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-9', name: 'Hotel Linen Bulk Wash (per kg)', category: 'Hotel Laundry', price: 4.50, expressSurcharge: 30, active: true, image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-10', name: 'Hotel Towel Softener Care', category: 'Hotel Laundry', price: 2.50, expressSurcharge: 30, active: true, image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-11', name: 'Spa & Salon Sheet Washing', category: 'Commercial Laundry', price: 3.00, expressSurcharge: 20, active: true, image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=400&q=80' },
  { id: 'srv-12', name: 'Restaurant Tablecloth Care', category: 'Commercial Laundry', price: 3.80, expressSurcharge: 20, active: true, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80' }
];

const DEFAULT_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Selena Gomez', phone: '555-0144', email: 'selena@gomez.com', address: '102 Ocean View Apt, Malibu', walletBalance: 150.00, loyaltyPoints: 1240, creditBalance: 0.00, notes: 'Prefers organic detergent, hang dry silk', subRemaining: 24, subDuration: "1 Month Left", password: 'password' },
  { id: 'cust-2', name: 'David Beckham', phone: '555-0120', email: 'david@beckham.com', address: '77 Old Trafford Ln, London', walletBalance: 45.50, loyaltyPoints: 450, creditBalance: 12.00, notes: 'Heavy starch on shirts, separate collars', password: 'password' },
  { id: 'cust-3', name: 'Emma Watson', phone: '555-0199', email: 'emma@watson.com', address: '42 Oxford Library Way', walletBalance: 320.00, loyaltyPoints: 2400, creditBalance: 0.00, notes: 'Steam press only, delicate lace care', password: 'password' },
  { id: 'cust-4', name: 'Robert Downey Jr.', phone: '555-3000', email: 'tony@stark.com', address: '10880 Malibu Point, CA', walletBalance: 0.00, loyaltyPoints: 95, creditBalance: 145.00, notes: 'Express services preferred. Deliver to assistant.', password: 'password' }
];

const DEFAULT_ORDERS: Order[] = [
  { id: 'OR-8839', customerId: 'cust-2', customerName: 'David Beckham', branch: 'Downtown HQ', date: '2026-06-29', weightItems: '1 Bag (Wash & Fold)', totalAmount: 22.00, total: 22.00, paymentMethod: 'Cash', status: 'Received', courier: 'Alex Rivera', deliveryStatus: 'Pending Pickup' },
  { id: 'OR-8841', customerId: 'cust-3', customerName: 'Emma Watson', branch: 'Uptown Premium', date: '2026-06-30', weightItems: '5 Items (Steam Press)', totalAmount: 18.50, total: 18.50, paymentMethod: 'Wallet', status: 'Washing', courier: 'Alex Rivera', deliveryStatus: 'Pending Pickup' },
  { id: 'OR-8842', customerId: 'cust-1', customerName: 'Selena Gomez', branch: 'Downtown HQ', date: '2026-07-01', weightItems: '2 Items (Premium Care)', totalAmount: 64.90, total: 64.90, paymentMethod: 'UPI', status: 'Received', courier: 'John Doe', deliveryStatus: 'Pending Pickup' }
];

const DEFAULT_EXPENSES: Expense[] = [
  { date: '2026-06-29', category: 'Chemicals & Detergents', description: 'Bought liquid starch', source: 'Drawer Cash', loggedBy: 'Admin User', amount: 35.00 },
  { date: '2026-07-01', category: 'Machinery Rent/Repair', description: 'Press machine safety latch fix', source: 'Drawer Cash', loggedBy: 'Admin User', amount: 45.00 }
];

const DEFAULT_PROMOS: Promo[] = [
  { code: 'FESTIVAL15', type: 'Percentage', value: 15, description: '15% discount for festival laundry bookings', uses: 24 },
  { code: 'WELCOME5', type: 'Flat', value: 5, description: '$5.00 discount for new customer onboarding', uses: 12 },
  { code: 'EXPRESS5', type: 'Percentage', value: 5, description: 'Save 5% on Express delivery options', uses: 8 },
  { code: 'STAYCLEAN', type: 'Flat', value: 10, description: '$10.00 off on bills above $50.00', uses: 35 }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: 1, text: "New home pickup requested by Selena Gomez.", time: "10 mins ago", unread: true },
  { id: 2, text: "Cash Drawer transaction: Float Opened $350.00", time: "1 hour ago", unread: true },
  { id: 3, text: "Order #OR-8839 status changed to Ready.", time: "2 hours ago", unread: false }
];

const DEFAULT_USERS: User[] = [
  { id: 'u-1', name: 'System Admin', role: 'admin', email: 'admin@laundra.com', password: 'admin', phone: '555-0190', address: 'Downtown HQ', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'u-2', name: 'John Doe', role: 'delivery', email: 'johndoe@laundra.com', password: 'delivery', phone: '555-0144', address: 'Uptown Premium', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'u-3', name: 'Selena Gomez', role: 'customer', email: 'selena@gomez.com', password: 'password', phone: '555-0144', address: '102 Ocean View Apt, Malibu', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'u-4', name: 'David Beckham', role: 'customer', email: 'david@beckham.com', password: 'password', phone: '555-0120', address: '77 Old Trafford Ln, London', status: 'Active', createdAt: new Date().toISOString() }
];

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global states for multi-tenancy
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('ll_companies');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({
          ...c,
          status: c.status || 'Active',
          subscription: c.subscription || {
            tier: 'Premium',
            status: 'Active',
            expiresAt: '2027-12-31'
          },
          features: {
            expressWash: c.features?.expressWash !== false,
            expenses: c.features?.expenses !== false,
            promos: c.features?.promos !== false,
            deliveryOperations: c.features?.deliveryOperations !== false,
            customerManagement: c.features?.customerManagement !== false,
            orderManagement: c.features?.orderManagement !== false,
            cashierModule: c.features?.cashierModule !== false,
            deliveryModule: c.features?.deliveryModule !== false,
            serviceManagement: c.features?.serviceManagement !== false,
            paymentModule: c.features?.paymentModule !== false,
            expenseModule: c.features?.expenseModule !== false,
            reports: c.features?.reports !== false,
            coupons: c.features?.coupons !== false,
            wallet: c.features?.wallet !== false,
            loyaltyProgram: c.features?.loyaltyProgram !== false,
            invoiceModule: c.features?.invoiceModule !== false,
            qrCode: c.features?.qrCode !== false,
            barcode: c.features?.barcode !== false,
            emailNotifications: c.features?.emailNotifications !== false,
            smsNotifications: c.features?.smsNotifications !== false,
            whatsAppNotifications: c.features?.whatsAppNotifications !== false,
            publicTracking: c.features?.publicTracking !== false,
            apiAccess: c.features?.apiAccess !== false,
            webhooks: c.features?.webhooks !== false,
            multiLanguage: c.features?.multiLanguage !== false,
            backupRestore: c.features?.backupRestore !== false,
          },
          limits: c.limits || {
            maxAdmins: 3,
            maxCashiers: 5,
            maxDeliveryStaff: 10,
            maxCustomers: 5000,
            maxOrdersPerMonth: 2000,
            maxBranches: 3,
            maxStorage: 512,
            maxApiRequests: 10000,
          }
        }));
      } catch (e) {
        console.error('Error parsing companies', e);
      }
    }

    const defaultComp: Company = {
      id: 'comp-default',
      name: 'Laundra HQ',
      slug: 'laundra',
      createdAt: new Date().toISOString().split('T')[0],
      adminEmail: 'admin@laundra.com',
      status: 'Active',
      subscription: {
        tier: 'Premium',
        status: 'Active',
        expiresAt: '2027-12-31'
      },
      features: {
        expressWash: true,
        expenses: true,
        promos: true,
        deliveryOperations: true,
        customerManagement: true,
        orderManagement: true,
        cashierModule: true,
        deliveryModule: true,
        serviceManagement: true,
        paymentModule: true,
        expenseModule: true,
        reports: true,
        coupons: true,
        wallet: true,
        loyaltyProgram: true,
        invoiceModule: true,
        qrCode: true,
        barcode: true,
        emailNotifications: true,
        smsNotifications: true,
        whatsAppNotifications: true,
        publicTracking: true,
        apiAccess: true,
        webhooks: true,
        multiLanguage: true,
        backupRestore: true,
      },
      limits: {
        maxAdmins: 3,
        maxCashiers: 5,
        maxDeliveryStaff: 10,
        maxCustomers: 5000,
        maxOrdersPerMonth: 2000,
        maxBranches: 3,
        maxStorage: 512,
        maxApiRequests: 10000,
      }
    };
    return [defaultComp];
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    return localStorage.getItem('ll_active_company_id') || 'comp-default';
  });

  // Keep a synced ref of activeCompanyId to avoid race conditions or stale closures
  const activeCompanyIdRef = useRef(activeCompanyId);
  useEffect(() => {
    activeCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  // Local tenant states (raw state hooks)
  const [services, setServicesState] = useState<Service[]>(DEFAULT_SERVICES);
  const [customers, setCustomersState] = useState<Customer[]>(DEFAULT_CUSTOMERS);
  const [orders, setOrdersState] = useState<Order[]>(DEFAULT_ORDERS);
  const [expenses, setExpensesState] = useState<Expense[]>(DEFAULT_EXPENSES);
  const [promos, setPromosState] = useState<Promo[]>(DEFAULT_PROMOS);
  const [notifications, setNotificationsState] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);
  const [users, setUsersState] = useState<User[]>(DEFAULT_USERS);
  const [drawerCash, setDrawerCashState] = useState<number>(350.00);
  const [activeBranch, setActiveBranchState] = useState<string>('Downtown HQ');
  const [activeRole, setActiveRoleState] = useState<string>('Admin');
  const [currentDeliveryBoy, setCurrentDeliveryBoyState] = useState<string | null>(null);

  // Wrapped setters that persist to local storage synchronously
  const setServices = (newVal: Service[]) => {
    setServicesState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_services`, JSON.stringify(newVal));
  };

  const setCustomers = (newVal: Customer[]) => {
    setCustomersState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_customers`, JSON.stringify(newVal));
  };

  const setOrders = (newVal: Order[]) => {
    setOrdersState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_orders`, JSON.stringify(newVal));
  };

  const setExpenses = (newVal: Expense[]) => {
    setExpensesState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_expenses`, JSON.stringify(newVal));
  };

  const setPromos = (newVal: Promo[]) => {
    setPromosState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_promos`, JSON.stringify(newVal));
  };

  const setNotifications = (newVal: Notification[]) => {
    setNotificationsState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_notifications`, JSON.stringify(newVal));
  };

  const setUsers = (newVal: User[]) => {
    setUsersState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_users`, JSON.stringify(newVal));
  };

  const setDrawerCash = (newVal: number) => {
    setDrawerCashState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_drawercash`, newVal.toString());
  };

  const setActiveBranch = (newVal: string) => {
    setActiveBranchState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_activebranch`, newVal);
  };

  const setActiveRole = (newVal: string) => {
    setActiveRoleState(newVal);
    localStorage.setItem(`ll_${activeCompanyIdRef.current}_activerole`, newVal);
  };

  const setCurrentDeliveryBoy = (newVal: string | null) => {
    setCurrentDeliveryBoyState(newVal);
    if (newVal) {
      localStorage.setItem(`ll_${activeCompanyIdRef.current}_active_delivery_boy`, newVal);
    } else {
      localStorage.removeItem(`ll_${activeCompanyIdRef.current}_active_delivery_boy`);
    }
  };

  // Helper to load company data (with migration support for comp-default)
  const loadCompanyData = (compId: string) => {
    // 1. Services
    const sSaved = localStorage.getItem(`ll_${compId}_services`);
    if (sSaved) {
      setServicesState(JSON.parse(sSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_services');
        setServicesState(legacy ? JSON.parse(legacy) : DEFAULT_SERVICES);
      } else {
        setServicesState(DEFAULT_SERVICES);
      }
    }

    // 2. Customers
    const cSaved = localStorage.getItem(`ll_${compId}_customers`);
    if (cSaved) {
      setCustomersState(JSON.parse(cSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_customers');
        setCustomersState(legacy ? JSON.parse(legacy) : DEFAULT_CUSTOMERS);
      } else {
        setCustomersState(DEFAULT_CUSTOMERS);
      }
    }

    // 3. Orders
    const oSaved = localStorage.getItem(`ll_${compId}_orders`);
    if (oSaved) {
      setOrdersState(JSON.parse(oSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_orders');
        setOrdersState(legacy ? JSON.parse(legacy) : DEFAULT_ORDERS);
      } else {
        setOrdersState([]);
      }
    }

    // 4. Expenses
    const eSaved = localStorage.getItem(`ll_${compId}_expenses`);
    if (eSaved) {
      setExpensesState(JSON.parse(eSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_expenses');
        setExpensesState(legacy ? JSON.parse(legacy) : DEFAULT_EXPENSES);
      } else {
        setExpensesState([]);
      }
    }

    // 5. Promos
    const pSaved = localStorage.getItem(`ll_${compId}_promos`);
    if (pSaved) {
      setPromosState(JSON.parse(pSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_promos');
        setPromosState(legacy ? JSON.parse(legacy) : DEFAULT_PROMOS);
      } else {
        setPromosState(DEFAULT_PROMOS);
      }
    }

    // 6. Notifications
    const nSaved = localStorage.getItem(`ll_${compId}_notifications`);
    if (nSaved) {
      setNotificationsState(JSON.parse(nSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_notifications');
        setNotificationsState(legacy ? JSON.parse(legacy) : DEFAULT_NOTIFICATIONS);
      } else {
        setNotificationsState([]);
      }
    }

    // 7. Users
    const uSaved = localStorage.getItem(`ll_${compId}_users`);
    if (uSaved) {
      setUsersState(JSON.parse(uSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_users');
        setUsersState(legacy ? JSON.parse(legacy) : DEFAULT_USERS);
      } else {
        // new company: seed default admin user
        const companyObj = companies.find(c => c.id === compId);
        const seededAdmin: User = {
          id: 'u-1',
          name: 'Company Admin',
          role: 'admin',
          email: companyObj?.adminEmail || `admin@${compId}.com`,
          password: 'admin',
          phone: '',
          address: '',
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        setUsersState([seededAdmin]);
      }
    }

    // 8. Drawer Cash
    const dcSaved = localStorage.getItem(`ll_${compId}_drawercash`);
    if (dcSaved) {
      setDrawerCashState(parseFloat(dcSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_drawercash');
        setDrawerCashState(legacy ? parseFloat(legacy) : 350.00);
      } else {
        setDrawerCashState(350.00);
      }
    }

    // 9. Active Branch
    const abSaved = localStorage.getItem(`ll_${compId}_activebranch`);
    if (abSaved) {
      setActiveBranchState(abSaved);
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_activebranch');
        setActiveBranchState(legacy || 'Downtown HQ');
      } else {
        setActiveBranchState('Branch Main');
      }
    }

    // 10. Active Role
    const arSaved = localStorage.getItem(`ll_${compId}_activerole`);
    setActiveRoleState(arSaved || 'Admin');

    // 11. Current Delivery Boy
    const cdbSaved = localStorage.getItem(`ll_${compId}_active_delivery_boy`);
    setCurrentDeliveryBoyState(cdbSaved || null);
  };

  // Sync companies list
  useEffect(() => {
    localStorage.setItem('ll_companies', JSON.stringify(companies));
  }, [companies]);

  // Initial load
  useEffect(() => {
    loadCompanyData(activeCompanyId);
  }, []);

  // Tenant-switching function
  const changeActiveCompany = (companyId: string) => {
    // 1. Flush/save current company states
    localStorage.setItem(`ll_${activeCompanyId}_services`, JSON.stringify(services));
    localStorage.setItem(`ll_${activeCompanyId}_customers`, JSON.stringify(customers));
    localStorage.setItem(`ll_${activeCompanyId}_orders`, JSON.stringify(orders));
    localStorage.setItem(`ll_${activeCompanyId}_expenses`, JSON.stringify(expenses));
    localStorage.setItem(`ll_${activeCompanyId}_promos`, JSON.stringify(promos));
    localStorage.setItem(`ll_${activeCompanyId}_notifications`, JSON.stringify(notifications));
    localStorage.setItem(`ll_${activeCompanyId}_users`, JSON.stringify(users));
    localStorage.setItem(`ll_${activeCompanyId}_drawercash`, drawerCash.toString());
    localStorage.setItem(`ll_${activeCompanyId}_activebranch`, activeBranch);
    localStorage.setItem(`ll_${activeCompanyId}_activerole`, activeRole);
    if (currentDeliveryBoy) {
      localStorage.setItem(`ll_${activeCompanyId}_active_delivery_boy`, currentDeliveryBoy);
    } else {
      localStorage.removeItem(`ll_${activeCompanyId}_active_delivery_boy`);
    }

    // 2. Switch context
    setActiveCompanyId(companyId);
    localStorage.setItem('ll_active_company_id', companyId);

    // 3. Load next company's context
    loadCompanyData(companyId);
  };

  const createCompany = (name: string, slug: string, adminEmail: string, adminPass: string, address?: string, phone?: string, gstNumber?: string, businessType?: string, logo?: string) => {
    const newId = 'comp-' + Math.floor(1000 + Math.random() * 9000);
    const newCompany: Company = {
      id: newId,
      name,
      slug: slug.toLowerCase().trim(),
      createdAt: new Date().toISOString().split('T')[0],
      adminEmail: adminEmail.trim().toLowerCase(),
      status: 'Active',
      phone: phone || '',
      address: address || '',
      gstNumber: gstNumber || '',
      businessType: businessType || 'Laundry',
      logo: logo || '',
      subscription: {
        tier: 'Free Trial',
        status: 'Active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      features: {
        expressWash: true,
        expenses: true,
        promos: true,
        deliveryOperations: true,
        customerManagement: true,
        orderManagement: true,
        cashierModule: true,
        deliveryModule: true,
        serviceManagement: true,
        paymentModule: true,
        expenseModule: true,
        reports: true,
        coupons: true,
        wallet: true,
        loyaltyProgram: true,
        invoiceModule: true,
        qrCode: true,
        barcode: true,
        emailNotifications: true,
        smsNotifications: true,
        whatsAppNotifications: true,
        publicTracking: true,
        apiAccess: true,
        webhooks: true,
        multiLanguage: true,
        backupRestore: true,
      },
      limits: {
        maxAdmins: 3,
        maxCashiers: 5,
        maxDeliveryStaff: 10,
        maxCustomers: 5000,
        maxOrdersPerMonth: 2000,
        maxBranches: 3,
        maxStorage: 512,
        maxApiRequests: 10000,
      }
    };

    const seededAdmin: User = {
      id: 'u-1',
      name: 'Company Admin',
      role: 'admin',
      email: adminEmail.trim().toLowerCase(),
      password: adminPass,
      phone: phone || '',
      address: address || '',
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(`ll_${newId}_users`, JSON.stringify([seededAdmin]));
    localStorage.setItem(`ll_${newId}_services`, JSON.stringify(DEFAULT_SERVICES));
    localStorage.setItem(`ll_${newId}_promos`, JSON.stringify(DEFAULT_PROMOS));
    localStorage.setItem(`ll_${newId}_customers`, JSON.stringify(DEFAULT_CUSTOMERS));
    localStorage.setItem(`ll_${newId}_drawercash`, '350');
    localStorage.setItem(`ll_${newId}_activebranch`, 'Branch Main');
    localStorage.setItem(`ll_${newId}_activerole`, 'Admin');

    setCompanies(prev => [...prev, newCompany]);
  };

  const deleteCompany = (companyId: string) => {
    if (companyId === 'comp-default') {
      alert('Cannot delete the default company!');
      return;
    }

    localStorage.removeItem(`ll_${companyId}_services`);
    localStorage.removeItem(`ll_${companyId}_customers`);
    localStorage.removeItem(`ll_${companyId}_orders`);
    localStorage.removeItem(`ll_${companyId}_expenses`);
    localStorage.removeItem(`ll_${companyId}_promos`);
    localStorage.removeItem(`ll_${companyId}_notifications`);
    localStorage.removeItem(`ll_${companyId}_users`);
    localStorage.removeItem(`ll_${companyId}_drawercash`);
    localStorage.removeItem(`ll_${companyId}_activebranch`);
    localStorage.removeItem(`ll_${companyId}_activerole`);
    localStorage.removeItem(`ll_${companyId}_active_delivery_boy`);

    setCompanies(prev => prev.filter(c => c.id !== companyId));

    if (activeCompanyId === companyId) {
      changeActiveCompany('comp-default');
    }
  };

  const updateCompany = (companyId: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        return {
          ...c,
          ...updates,
          subscription: updates.subscription ? { ...c.subscription, ...updates.subscription } : c.subscription,
          features: updates.features ? { ...c.features, ...updates.features } : c.features
        };
      }
      return c;
    }));
  };

  const saveDB = (fields: Partial<Database>) => {
    if (fields.services !== undefined) setServices(fields.services);
    if (fields.customers !== undefined) setCustomers(fields.customers);
    if (fields.orders !== undefined) setOrders(fields.orders);
    if (fields.expenses !== undefined) setExpenses(fields.expenses);
    if (fields.promos !== undefined) setPromos(fields.promos);
    if (fields.notifications !== undefined) setNotifications(fields.notifications);
    if (fields.users !== undefined) setUsers(fields.users);
    if (fields.drawerCash !== undefined) setDrawerCash(fields.drawerCash);
    if (fields.activeBranch !== undefined) setActiveBranch(fields.activeBranch);
    if (fields.activeRole !== undefined) setActiveRole(fields.activeRole);
    if (fields.currentDeliveryBoy !== undefined) setCurrentDeliveryBoy(fields.currentDeliveryBoy);
  };

  const db: Database = {
    services,
    customers,
    orders,
    expenses,
    promos,
    notifications,
    users,
    drawerCash,
    activeBranch,
    activeRole,
    currentDeliveryBoy,
    companies,
    activeCompanyId
  };

  return (
    <DatabaseContext.Provider value={{
      db,
      setServices,
      setCustomers,
      setOrders,
      setExpenses,
      setPromos,
      setNotifications,
      setUsers,
      setDrawerCash,
      setActiveBranch,
      setActiveRole,
      setCurrentDeliveryBoy,
      saveDB,
      createCompany,
      deleteCompany,
      updateCompany,
      changeActiveCompany
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
