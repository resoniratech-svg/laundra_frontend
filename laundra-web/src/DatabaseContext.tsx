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
  // Read state keys individually to match app.js storage signatures
  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('ll_services');
    if (saved) {
      const parsed = JSON.parse(saved) as Service[];
      return parsed.map(s => {
        const def = DEFAULT_SERVICES.find(d => d.id === s.id);
        return { ...s, image: def?.image || s.image };
      });
    }
    return DEFAULT_SERVICES;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('ll_customers');
    return saved ? JSON.parse(saved) : DEFAULT_CUSTOMERS;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('ll_orders');
    return saved ? JSON.parse(saved) : DEFAULT_ORDERS;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('ll_expenses');
    return saved ? JSON.parse(saved) : DEFAULT_EXPENSES;
  });
  const [promos, setPromos] = useState<Promo[]>(() => {
    const saved = localStorage.getItem('ll_promos');
    return saved ? JSON.parse(saved) : DEFAULT_PROMOS;
  });
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('ll_notifications');
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ll_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  const [drawerCash, setDrawerCash] = useState<number>(() => {
    const saved = localStorage.getItem('ll_drawercash');
    return saved ? parseFloat(saved) : 350.00;
  });
  const [activeBranch, setActiveBranch] = useState<string>(() => {
    return localStorage.getItem('ll_activebranch') || 'Downtown HQ';
  });
  const [activeRole, setActiveRole] = useState<string>(() => {
    return localStorage.getItem('ll_activerole') || 'Admin';
  });
  const [currentDeliveryBoy, setCurrentDeliveryBoy] = useState<string | null>(() => {
    return localStorage.getItem('ll_active_delivery_boy') || null;
  });

  // Sync back to local storage whenever a sub-state updates
  useEffect(() => {
    localStorage.setItem('ll_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('ll_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('ll_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('ll_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('ll_promos', JSON.stringify(promos));
  }, [promos]);

  useEffect(() => {
    localStorage.setItem('ll_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('ll_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ll_drawercash', drawerCash.toString());
  }, [drawerCash]);

  useEffect(() => {
    localStorage.setItem('ll_activebranch', activeBranch);
  }, [activeBranch]);

  useEffect(() => {
    localStorage.setItem('ll_activerole', activeRole);
  }, [activeRole]);

  useEffect(() => {
    if (currentDeliveryBoy) {
      localStorage.setItem('ll_active_delivery_boy', currentDeliveryBoy);
    } else {
      localStorage.removeItem('ll_active_delivery_boy');
    }
  }, [currentDeliveryBoy]);

  // Unified saveDB helper matching the signature of app.js
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
    currentDeliveryBoy
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
      saveDB
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
