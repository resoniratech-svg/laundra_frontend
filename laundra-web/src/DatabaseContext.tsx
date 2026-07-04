import React, { createContext, useContext, useState, useEffect } from 'react';

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
  status: 'Pending' | 'Placed' | 'Accepted' | 'Received' | 'Washing' | 'Ironing' | 'Processing' | 'Ready' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  courier: string | null;
  deliveryStatus: string;
  phone?: string;
  address?: string;
  services?: any[];
  totalAmount?: number;
  total?: number;
  frequency?: 'One-time / Daily' | 'Monthly';
  clothesPerDay?: number;
  isManual?: boolean;
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
  role: 'admin' | 'delivery' | 'customer';
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  status?: string;
  createdAt?: string;
  age?: number;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  adminEmail: string;
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
  createCompany: (name: string, slug: string, adminEmail: string, adminPass: string) => void;
  deleteCompany: (companyId: string) => void;
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
    if (saved) return JSON.parse(saved);

    const defaultComp: Company = {
      id: 'comp-default',
      name: 'Laundra HQ',
      slug: 'laundra',
      createdAt: new Date().toISOString().split('T')[0],
      adminEmail: 'admin@laundra.com'
    };
    return [defaultComp];
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    return localStorage.getItem('ll_active_company_id') || 'comp-default';
  });

  // Local tenant states
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [customers, setCustomers] = useState<Customer[]>(DEFAULT_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>(DEFAULT_ORDERS);
  const [expenses, setExpenses] = useState<Expense[]>(DEFAULT_EXPENSES);
  const [promos, setPromos] = useState<Promo[]>(DEFAULT_PROMOS);
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [drawerCash, setDrawerCash] = useState<number>(350.00);
  const [activeBranch, setActiveBranch] = useState<string>('Downtown HQ');
  const [activeRole, setActiveRole] = useState<string>('Admin');
  const [currentDeliveryBoy, setCurrentDeliveryBoy] = useState<string | null>(null);

  // Helper to load company data (with migration support for comp-default)
  const loadCompanyData = (compId: string) => {
    // 1. Services
    const sSaved = localStorage.getItem(`ll_${compId}_services`);
    if (sSaved) {
      setServices(JSON.parse(sSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_services');
        setServices(legacy ? JSON.parse(legacy) : DEFAULT_SERVICES);
      } else {
        setServices(DEFAULT_SERVICES);
      }
    }

    // 2. Customers
    const cSaved = localStorage.getItem(`ll_${compId}_customers`);
    if (cSaved) {
      setCustomers(JSON.parse(cSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_customers');
        setCustomers(legacy ? JSON.parse(legacy) : DEFAULT_CUSTOMERS);
      } else {
        setCustomers(DEFAULT_CUSTOMERS);
      }
    }

    // 3. Orders
    const oSaved = localStorage.getItem(`ll_${compId}_orders`);
    if (oSaved) {
      setOrders(JSON.parse(oSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_orders');
        setOrders(legacy ? JSON.parse(legacy) : DEFAULT_ORDERS);
      } else {
        setOrders([]);
      }
    }

    // 4. Expenses
    const eSaved = localStorage.getItem(`ll_${compId}_expenses`);
    if (eSaved) {
      setExpenses(JSON.parse(eSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_expenses');
        setExpenses(legacy ? JSON.parse(legacy) : DEFAULT_EXPENSES);
      } else {
        setExpenses([]);
      }
    }

    // 5. Promos
    const pSaved = localStorage.getItem(`ll_${compId}_promos`);
    if (pSaved) {
      setPromos(JSON.parse(pSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_promos');
        setPromos(legacy ? JSON.parse(legacy) : DEFAULT_PROMOS);
      } else {
        setPromos(DEFAULT_PROMOS);
      }
    }

    // 6. Notifications
    const nSaved = localStorage.getItem(`ll_${compId}_notifications`);
    if (nSaved) {
      setNotifications(JSON.parse(nSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_notifications');
        setNotifications(legacy ? JSON.parse(legacy) : DEFAULT_NOTIFICATIONS);
      } else {
        setNotifications([]);
      }
    }

    // 7. Users
    const uSaved = localStorage.getItem(`ll_${compId}_users`);
    if (uSaved) {
      setUsers(JSON.parse(uSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_users');
        setUsers(legacy ? JSON.parse(legacy) : DEFAULT_USERS);
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
        setUsers([seededAdmin]);
      }
    }

    // 8. Drawer Cash
    const dcSaved = localStorage.getItem(`ll_${compId}_drawercash`);
    if (dcSaved) {
      setDrawerCash(parseFloat(dcSaved));
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_drawercash');
        setDrawerCash(legacy ? parseFloat(legacy) : 350.00);
      } else {
        setDrawerCash(350.00);
      }
    }

    // 9. Active Branch
    const abSaved = localStorage.getItem(`ll_${compId}_activebranch`);
    if (abSaved) {
      setActiveBranch(abSaved);
    } else {
      if (compId === 'comp-default') {
        const legacy = localStorage.getItem('ll_activebranch');
        setActiveBranch(legacy || 'Downtown HQ');
      } else {
        setActiveBranch('Branch Main');
      }
    }

    // 10. Active Role
    const arSaved = localStorage.getItem(`ll_${compId}_activerole`);
    setActiveRole(arSaved || 'Admin');

    // 11. Current Delivery Boy
    const cdbSaved = localStorage.getItem(`ll_${compId}_active_delivery_boy`);
    setCurrentDeliveryBoy(cdbSaved || null);
  };

  // Sync companies list
  useEffect(() => {
    localStorage.setItem('ll_companies', JSON.stringify(companies));
  }, [companies]);

  // Initial load
  useEffect(() => {
    loadCompanyData(activeCompanyId);
  }, []);

  // Multi-tenant state syncing back to local storage
  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_services`, JSON.stringify(services));
  }, [services, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_customers`, JSON.stringify(customers));
  }, [customers, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_orders`, JSON.stringify(orders));
  }, [orders, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_expenses`, JSON.stringify(expenses));
  }, [expenses, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_promos`, JSON.stringify(promos));
  }, [promos, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_notifications`, JSON.stringify(notifications));
  }, [notifications, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_users`, JSON.stringify(users));
  }, [users, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_drawercash`, drawerCash.toString());
  }, [drawerCash, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_activebranch`, activeBranch);
  }, [activeBranch, activeCompanyId]);

  useEffect(() => {
    localStorage.setItem(`ll_${activeCompanyId}_activerole`, activeRole);
  }, [activeRole, activeCompanyId]);

  useEffect(() => {
    if (currentDeliveryBoy) {
      localStorage.setItem(`ll_${activeCompanyId}_active_delivery_boy`, currentDeliveryBoy);
    } else {
      localStorage.removeItem(`ll_${activeCompanyId}_active_delivery_boy`);
    }
  }, [currentDeliveryBoy, activeCompanyId]);

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

  const createCompany = (name: string, slug: string, adminEmail: string, adminPass: string) => {
    const newId = 'comp-' + Math.floor(1000 + Math.random() * 9000);
    const newCompany: Company = {
      id: newId,
      name,
      slug: slug.toLowerCase().trim(),
      createdAt: new Date().toISOString().split('T')[0],
      adminEmail: adminEmail.trim().toLowerCase()
    };

    const seededAdmin: User = {
      id: 'u-1',
      name: 'Company Admin',
      role: 'admin',
      email: adminEmail.trim().toLowerCase(),
      password: adminPass,
      phone: '',
      address: '',
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
