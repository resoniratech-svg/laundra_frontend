import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, type Order, type Customer, type Promo } from './DatabaseContext';

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
  return '👕'; // Default for Shirt, T-Shirt, etc.
};

export const CustomerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { db, saveDB, changeActiveCompany } = useDatabase();

  // Active Customer Session Check with automatic secure login via URL ?login=cust-XXX
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [catalogServices, setCatalogServices] = useState<any[]>([]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLoginId = params.get('login');
    if (urlLoginId) {
      localStorage.setItem('ll_active_customer_id', urlLoginId);
      if (db.activeCompanyId) {
        localStorage.setItem(`ll_${db.activeCompanyId}_active_customer_id`, urlLoginId);
      }
    }
  }, [db.activeCompanyId]);

  const urlParams = new URLSearchParams(window.location.search);
  const activeCustId = urlParams.get('login') || localStorage.getItem(`ll_${db.activeCompanyId}_active_customer_id`) || localStorage.getItem('ll_active_customer_id');

  useEffect(() => {
    const loadCustomer = async () => {
      const token = localStorage.getItem('ll_auth_token');
      if (token && activeCustId) {
        try {
          const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
          const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.role === 'CUSTOMER' || data.role === 'customer') {
              if (data.tenant_id) {
                if (db.activeCompanyId !== data.tenant_id) {
                  changeActiveCompany(data.tenant_id);
                }
                try {
                  const compRes = await fetch(`${BASE_URL}/api/v1/companies/public`);
                  if (compRes.ok) {
                    const comps = await compRes.json();
                    const matched = comps.find((c: any) => c.id === data.tenant_id);
                    if (matched) setCompanyName(matched.name);
                  }
                } catch (e) {
                  console.error('Failed to fetch public companies for customer portal', e);
                }
              }

              setCustomer({
                id: data.id,
                name: data.name,
                phone: data.phone || '',
                email: data.email || '',
                address: data.address || '',
                walletBalance: 0,
                loyaltyPoints: 0,
                creditBalance: 0,
                notes: '',
                qrStatus: 'Active QR'
              });
              return; // Successfully loaded from backend
            }
          }
        } catch (err) {
          console.error('Failed to fetch backend customer', err);
        }
      }

      // Magic Link / Public Endpoint Logic
      if (!activeCustId) {
        navigate('/');
        return;
      }
      
      try {
        const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/v1/customers/public/${activeCustId}`);
        if (res.ok) {
          const data = await res.json();
          setCustomer({
            id: data.id,
            name: data.name,
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            walletBalance: parseFloat(data.wallet_balance || '0'),
            loyaltyPoints: data.loyalty_points || 0,
            creditBalance: 0,
            notes: '',
            qrStatus: data.qr_status || 'Active QR'
          });
          
          if (data.tenant_id) {
            if (db.activeCompanyId !== data.tenant_id) {
              changeActiveCompany(data.tenant_id);
            }
            try {
              const compRes = await fetch(`${BASE_URL}/api/v1/companies/public`);
              if (compRes.ok) {
                const comps = await compRes.json();
                const matched = comps.find((c: any) => c.id === data.tenant_id);
                if (matched) setCompanyName(matched.name);
              }
            } catch (e) {
              console.error('Failed to fetch public companies for customer portal', e);
            }
          }
          return;
        } else {
          // Customer not found in backend
          localStorage.removeItem(`ll_${db.activeCompanyId}_active_customer_id`);
          localStorage.removeItem('ll_active_customer_id');
          navigate('/');
        }
      } catch (err) {
        console.error('Failed to fetch public customer data via magic link', err);
        navigate('/');
      }
    };

    loadCustomer();
  }, [activeCustId, db.customers, db.activeCompanyId, navigate]);

  // Fetch services and synchronize them to local DatabaseContext
  useEffect(() => {
    if (!db.activeCompanyId || db.activeCompanyId === 'comp-default') return;

    const fetchPublicServices = async () => {
      try {
        const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/v1/services/public/${db.activeCompanyId}`);
        if (res.ok) {
          const sData = await res.json();
          if (Array.isArray(sData) && sData.length > 0) {
            setCatalogServices(sData);
            // Map to db.items, db.serviceTypes, db.serviceVariants, db.itemPrices
            const mappedItems = sData.map((s: any) => ({
              id: s.id.toString(),
              englishName: s.name,
              category: s.category || 'General',
              status: 'Active'
            }));

            const mappedServiceTypes = [
              { id: 'st-1', name: 'Standard Laundry Services' }
            ];

            const mappedVariants = [
              { id: 'sv-1', name: 'Normal', serviceTypeId: 'st-1' },
              { id: 'sv-2', name: 'Express', serviceTypeId: 'st-1' }
            ];

            const mappedItemPrices: any[] = [];
            sData.forEach((s: any) => {
              mappedItemPrices.push({
                itemId: s.id.toString(),
                serviceVariantId: 'sv-1',
                price: s.price
              });
              mappedItemPrices.push({
                itemId: s.id.toString(),
                serviceVariantId: 'sv-2',
                price: s.express_price || (s.price * 1.5)
              });
            });

            saveDB({
              items: mappedItems,
              serviceTypes: mappedServiceTypes,
              serviceVariants: mappedVariants,
              itemPrices: mappedItemPrices
            });
          }
        }
      } catch (err) {
        console.error('Failed to sync public services to customer portal database context:', err);
      }
    };

    fetchPublicServices();
  }, [db.activeCompanyId]);

  // Sidebar Menu State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'invoices' | 'wallet' | 'addresses' | 'support' | 'reviews' | 'profile'>(() => {
    return (localStorage.getItem('ll_active_customer_tab') as any) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('ll_active_customer_tab', activeTab);
  }, [activeTab]);

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
  // Support ticket state
  const [backendTickets, setBackendTickets] = useState<any[]>([]);
  const [systemAnnouncements, setSystemAnnouncements] = useState<any[]>([]);

  const fetchAnnouncements = async () => {
    const token = localStorage.getItem('ll_auth_token');
    if (!token) return;
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/announcements/customer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSystemAnnouncements(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch customer announcements', err);
    }
  };

  const fetchTickets = async () => {
    const token = localStorage.getItem('ll_auth_token');
    if (!token) return;
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/portal/support`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackendTickets(data);
      }
    } catch (err) {
      console.error('Failed to fetch support tickets', err);
    }
  };

  // Ratings / Reviews state
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [myReviews, setMyReviews] = useState<any[]>([]);

  const fetchMyReviews = async () => {
    const token = localStorage.getItem('ll_auth_token');
    if (!token) return;
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/reviews/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMyReviews(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch my reviews', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchMyReviews();
    fetchAnnouncements();
  }, [customer]);

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  // Wallet add funds state
  const [addFundsAmt, setAddFundsAmt] = useState('');

  // Order Details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Order | null>(null);

  // --- ORDER WIZARD STATE ---
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 = Frequency, 2 = Catalog & Cart, 3 = Details, 4 = Payment, 5 = Success
  
  const [freq, setFreq] = useState<'One-time / Daily' | 'Monthly'>('One-time / Daily');
  const [customerCart, setCustomerCart] = useState<{ itemId: string; itemName: string; serviceTypeId: string; serviceTypeName: string; variantId: string; variantName: string; price: number; qty: number }[]>([]);
  const [selectedWizardItem, setSelectedWizardItem] = useState<any>(null);

  const [oName, setOName] = useState('');
  const [oEmail, setOEmail] = useState('');
  const [oPhone, setOPhone] = useState('');
  const [oAddress, setOAddress] = useState('');
  const [payMethod, setPayMethod] = useState<'upi' | 'phonepe' | 'gpay' | 'credit' | 'debit' | 'wallet'>('upi');

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<Promo | null>(null);

  // Service list filter categories (removed unused)

  // Pre-fill details when customer logs in
  useEffect(() => {
    if (customer) {
      setOName(customer.name);
      setOEmail(customer.email);
      setOPhone(customer.phone);
      setOAddress(customer.address);
    }
  }, [customer, showWizard]);

  // Mark customer announcements as seen when tab is active
  useEffect(() => {
    if (activeTab === 'announcements') {
      localStorage.setItem(`ll_${db.activeCompanyId}_customer_last_seen_announcements_count`, systemAnnouncements.length.toString());
    }
  }, [activeTab, systemAnnouncements.length, db.activeCompanyId]);

  if (!customer) return null;

  // Sign out customer
  const handleLogout = () => {
    localStorage.removeItem(`ll_${db.activeCompanyId}_active_customer_id`);
    localStorage.removeItem('ll_active_customer_id');
    localStorage.removeItem('ll_active_workspace');
    navigate('/');
  };

  // Filter services (removed unused)

  // Pricing helpers

  const getSubtotal = () => {
    const baseTotal = customerCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
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

  const handlePlaceOrder = async () => {
    const activeCompany = db.companies.find(c => c.id === db.activeCompanyId);
    const limits = activeCompany?.limits || { maxOrdersPerMonth: 2000 };
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyOrdersCount = db.orders.filter(o => o.date.startsWith(currentMonth)).length;
    if (monthlyOrdersCount >= (limits.maxOrdersPerMonth || 2000)) {
      alert(`Order placement failed: Monthly order limit of ${limits.maxOrdersPerMonth || 2000} reached for this company portal. Contact company admin.`);
      return;
    }

    const grandTotal = getGrandTotal();

    if (payMethod === 'wallet' && customer.walletBalance < grandTotal) {
      alert('Insufficient wallet balance! Please choose another payment method or add funds.');
      return;
    }

    const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
    const token = localStorage.getItem('ll_auth_token');

    try {
      // Fetch valid backend services to map the mock cart items to real backend UUIDs
      const servicesRes = await fetch(`${BASE_URL}/api/v1/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const servicesData = await servicesRes.json();
      const fallbackServiceId = servicesData.length > 0 ? servicesData[0].id : null;

      if (!fallbackServiceId) {
        alert('Cannot place order: No services configured in the backend.');
        return;
      }

      // Build items list using real backend service IDs
      const itemsPayload = customerCart.map(i => {
        // Try to find a backend service matching the itemName or variantName, otherwise use fallback
        const match = servicesData.find((s: any) => s.name.toLowerCase().includes(i.itemName.toLowerCase()) || i.itemName.toLowerCase().includes(s.name.toLowerCase()));
        return {
          service_id: match ? match.id : fallbackServiceId,
          quantity: i.qty
        };
      });

      const res = await fetch(`${BASE_URL}/api/v1/portal/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: itemsPayload,
          pickup_address: oAddress,
          delivery_address: oAddress,
          special_instructions: `Phone: ${oPhone}`,
          is_express: false,
          coupon_code: promoApplied?.code || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to place order: ${errData.detail || 'Unknown error'}`);
        return;
      }

      const backendOrder = await res.json();

      // Also save to local mock DB for UI display
      const newOrderId = backendOrder.order_number || String(Math.floor(100000 + Math.random() * 900000));
      const secureDeliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

      const newOrder: Order = {
        id: newOrderId,
        backendId: backendOrder.id || undefined,
        customerId: customer.id,
        customerName: customer.name,
        branch: db.activeBranch || 'Downtown HQ',
        date: new Date().toISOString().split('T')[0],
        weightItems: `${customerCart.reduce((acc, i) => acc + i.qty, 0)} Items`,
        quantity: customerCart.reduce((acc, i) => acc + i.qty, 0),
        planType: freq,
        paymentMethod: payMethod.toUpperCase(),
        paymentStatus: payMethod === 'wallet' ? 'Paid' : 'Unpaid',
        status: 'Created',
        courier: null,
        deliveryStatus: 'Pending Assignment',
        phone: oPhone,
        address: oAddress,
        services: customerCart.map(i => ({ serviceId: i.variantId, name: `${i.itemName} - ${i.serviceTypeName} (${i.variantName})`, qty: i.qty, plan: i.variantName, price: i.price })),
        totalAmount: parseFloat(backendOrder.total_amount || grandTotal),
        total: parseFloat(backendOrder.total_amount || grandTotal),
        frequency: freq,
        deliveryOtp: secureDeliveryOtp
      };

      const newNotification = {
        id: Date.now(),
        text: `New booking requested by ${customer.name}. Order #${newOrderId}`,
        time: 'Just now',
        unread: true
      };

      let updatedCustomers = db.customers;
      if (payMethod === 'wallet') {
        updatedCustomers = db.customers.map(c =>
          c.id === customer.id ? { ...c, walletBalance: c.walletBalance - grandTotal } : c
        );
      }

      saveDB({
        orders: [...db.orders, newOrder],
        notifications: [...db.notifications, newNotification],
        customers: updatedCustomers
      });

      setWizardStep(5); // Success screen

    } catch (err) {
      console.error('Order placement error:', err);
      alert('Network error placing order. Please try again.');
    }
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
  const handleAddWalletBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(addFundsAmt) || 0;
    if (val <= 0) return;

    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/customers/${customer.id}/add-funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val })
      });
      
      let newBalance = customer.walletBalance + val;
      if (res.ok) {
        const data = await res.json();
        newBalance = parseFloat(data.wallet_balance || '0');
      } else {
        console.warn('Backend failed to add funds, updating locally anyway.');
      }
      
      const updated = db.customers.map(c => c.id === customer.id ? { ...c, walletBalance: newBalance } : c);
      saveDB({ customers: updated });
      setCustomer({ ...customer, walletBalance: newBalance });
      setAddFundsAmt('');
      alert(`Successfully loaded QR ${val.toFixed(2)} to wallet!`);
    } catch (err) {
      console.error('Failed to add funds', err);
      alert('Network error while adding funds.');
    }
  };

  // Support ticket submission
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;

    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      
      const res = await fetch(`${BASE_URL}/api/v1/portal/support`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: ticketSubject,
          description: ticketMessage
        })
      });

      if (res.ok) {
        alert('Support ticket created successfully!');
        setTicketSubject('');
        setTicketMessage('');
        fetchTickets();
      } else {
        alert('Failed to create support ticket');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('Network error while creating ticket');
    }
  };



  // Submit Rating Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingComment) return;

    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('ll_auth_token');
      const res = await fetch(`${BASE_URL}/api/v1/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating: ratingStars, comment: ratingComment })
      });
      if (res.ok) {
        alert('Thank you! Your feedback has been uploaded.');
        setRatingComment('');
        setRatingStars(5);
        fetchMyReviews();
      } else {
        alert('Failed to submit review');
      }
    } catch (e) {
      console.error(e);
      alert('Network error submitting review');
    }
  };

  // Download Invoice as PDF (via Browser Print)
  const handleDownloadInvoice = (order: Order) => {
    const win = window.open('', '_blank', 'width=450,height=600');
    if (!win) return;
    const companyHeaderName = companyName || db.companies.find(c => c.id === db.activeCompanyId)?.name || 'Laundry Desk';
    const companyObj = db.companies.find(c => c.id === db.activeCompanyId);
    const fullCompanyHeader = companyObj ? `${companyObj.name}${companyObj.address ? `, ${companyObj.address}` : ''}` : companyHeaderName;

    win.document.write(`
      <html>
        <head>
          <title>Invoice #${order.id}</title>
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
          <h2>${fullCompanyHeader}</h2>
          <div class="center">${new Date(order.date).toLocaleDateString()}</div>
          <div class="divider"></div>
          <div class="row"><span class="bold">Order ID:</span><span>#${order.id}</span></div>
          <div class="row"><span class="bold">Customer:</span><span>${order.customerName}</span></div>
          <div class="row"><span class="bold">Payment:</span><span>${order.paymentMethod || 'Cash'}</span></div>
          <div class="row"><span class="bold">Status:</span><span>${order.status}</span></div>
          <div class="divider"></div>
          <div class="row bold" style="font-size: 12px; text-transform: uppercase;"><span>Services / Items</span><span>Price</span></div>
          ${order.services && order.services.length > 0 ? 
            order.services.map((s: any) => `
              <div class="row">
                <span>${s.name} ${s.express ? '(Express)' : ''} x${s.qty || 1}</span>
                <span>QR ${((s.express ? s.price * 1.5 : s.price) * (s.qty || 1)).toFixed(2)}</span>
              </div>
            `).join('') : `
              <div class="row">
                <span>${order.weightItems || 'Standard Laundry'}</span>
                <span>QR ${(order.totalAmount || order.total || 0).toFixed(2)}</span>
              </div>
            `
          }
          <div class="divider"></div>
          <div class="row bold" style="font-size: 16px;">
            <span>TOTAL AMOUNT:</span>
            <span>QR ${(order.totalAmount || order.total || 0).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="center" style="margin-top: 20px; font-size: 12px;">Thank you for your business!</div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const customerOrders = db.orders.filter(o => {
    // Primary match: by customerId (exact UUID or local ID match)
    const idMatch = o.customerId === customer.id;
    // Fallback match: by customer name (catches POS-created orders where UUID may differ)
    const nameMatch = o.customerName && customer.name &&
      o.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim();

    if (!idMatch && !nameMatch) return false;
    if (o.isDeleted) return false;
    
    if ((o.status === 'Delivered' || o.deliveryStatus === 'Delivered') && o.deliveredDate) {
      const deliveredTime = new Date(o.deliveredDate).getTime();
      const currentTime = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      if (currentTime - deliveredTime > oneDay) {
        return false;
      }
    }
    return true;
  }).reverse();

  return (
    <div className="portal-wrapper active" id="customerPortal" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex' }}>
      
      {/* Sidebar Panel */}
      <aside className="admin-sidebar" style={{ width: '260px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div className="sidebar-brand" style={{ padding: '0 20px 16px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e3a8a' }}>{companyName || db.companies.find(c => c.id === db.activeCompanyId)?.name || 'Company Name'}</span>
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
            <li onClick={() => setActiveTab('support')} className={`sidebar-menu-item ${activeTab === 'support' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'support' ? '#2563eb' : '#475569', background: activeTab === 'support' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🎫 <span>Support Desk</span>
            </li>
            {(() => {
              const lastSeen = parseInt(localStorage.getItem(`ll_${db.activeCompanyId}_customer_last_seen_announcements_count`) || '0');
              const unreadAnnouncementsCount = activeTab === 'announcements' ? 0 : Math.max(0, systemAnnouncements.length - lastSeen);

              return (
                <li onClick={() => { setActiveTab('announcements'); localStorage.setItem(`ll_${db.activeCompanyId}_customer_last_seen_announcements_count`, systemAnnouncements.length.toString()); }} className={`sidebar-menu-item ${activeTab === 'announcements' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'announcements' ? '#2563eb' : '#475569', background: activeTab === 'announcements' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📢 <span>Announcements</span>
                  </span>
                  {unreadAnnouncementsCount > 0 && (
                    <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800' }}>
                      {unreadAnnouncementsCount}
                    </span>
                  )}
                </li>
              );
            })()}
            <li onClick={() => setActiveTab('reviews')} className={`sidebar-menu-item ${activeTab === 'reviews' ? 'active' : ''}`} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: activeTab === 'reviews' ? '#2563eb' : '#475569', background: activeTab === 'reviews' ? '#eff6ff' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⭐ <span>Rate Services</span>
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
              {activeTab === 'dashboard' ? 'My Bookings & Timeline' : activeTab === 'services' ? 'Laundry Rates' : activeTab === 'invoices' ? 'My Invoices' : activeTab === 'wallet' ? 'Wallet & Loyalty Points' : activeTab === 'support' ? 'Support Tickets' : activeTab === 'reviews' ? 'Review & Feedback' : 'My Account Settings'}
            </h1>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>Customer Portal / {activeTab}</div>
          </div>
          {activeTab === 'dashboard' && (
            <button onClick={() => setActiveTab('services')} className="primary-btn" style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>🛒 Book new order</button>
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
                        <strong style={{ color: '#0f172a' }}>QR {parseFloat(String(o.totalAmount || 0)).toFixed(2)}</strong>
                        {o.status === 'Delivered' || o.deliveryStatus === 'Delivered' ? (
                          <span style={{ padding: '6px 12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            ✅ Delivered completed
                          </span>
                        ) : (
                          <button onClick={() => setSelectedOrder(o)} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>📍 Track</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications & Announcements Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Notifications Card */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0' }}>🔔 Live Notifications Feed</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                  {db.notifications.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>No activity notifications yet.</div>
                  ) : (
                    db.notifications.map(n => (
                      <div key={n.id} style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '600' }}>{n.text}</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{n.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Announcements Card */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0' }}>📢 Active Company Announcements</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                  {systemAnnouncements.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No announcements active at the moment.</div>
                  ) : (
                    systemAnnouncements.map(a => (
                      <div key={a.id} style={{ background: '#faf5ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.82rem' }}>
                        <strong style={{ color: '#5b21b6' }}>{a.title}</strong>
                        <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{a.content}</p>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Posted: {new Date(a.created_at).toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 🏷️ SERVICES TAB */}
        {activeTab === 'services' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>🧺 Service Catalog</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {Array.from(new Set(catalogServices.filter(s => s.name).map(s => s.name)))
                .map((itemName: any) => {
                  const serviceForPrice = catalogServices.find(s => s.name === itemName);
                  return (
                    <div 
                      key={itemName} 
                      onClick={() => {
                        setWizardStep(2);
                        const matchInDb = db.items.find(i => i.englishName === itemName);
                        if (matchInDb) {
                          setSelectedWizardItem(matchInDb);
                        } else {
                          setSelectedWizardItem({ id: serviceForPrice?.id?.toString() || 'unknown', englishName: itemName });
                        }
                        setShowWizard(true);
                      }}
                      style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: '3rem' }}>{getEmojiForService(itemName)}</div>
                      <h4 style={{ margin: '8px 0 0 0', fontSize: '0.9rem', fontWeight: '700', textAlign: 'center', color: '#0f172a' }}>{itemName}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '700', marginTop: '4px' }}>
                        QR {serviceForPrice ? parseFloat(serviceForPrice.price || '0').toFixed(2) : '0.00'}
                      </div>
                      <button style={{ marginTop: '10px', padding: '8px 16px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>Book Now</button>
                    </div>
                  );
                })}
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
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Date: {o.date} • Total: QR {parseFloat(String(o.totalAmount || 0)).toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setViewingInvoice(o)} style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700' }}>👁️ View</button>
                      <button onClick={() => handleDownloadInvoice(o)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700' }}>📥 Print/PDF</button>
                    </div>
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
                {backendTickets.map(t => (
                  <div key={t.id} style={{ padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong>{t.subject}</strong>
                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: t.status === 'OPEN' ? '#fffbeb' : '#dcfce7', color: t.status === 'OPEN' ? '#b45309' : '#15803d' }}>{t.status}</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{t.description}</p>
                    
                    {t.admin_response && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#eff6ff', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <strong>Company Reply:</strong> {t.admin_response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ⭐ RATE SERVICES TAB */}
        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

            {myReviews.length > 0 && (
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1', maxWidth: '500px' }}>
                <h4>Your Past Reviews</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  {myReviews.map(rev => (
                    <div key={rev.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                      <div style={{ color: '#d97706', margin: '4px 0', fontSize: '0.85rem' }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</div>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#334155' }}>{rev.comment}</p>
                      
                      {rev.reply && (
                        <div style={{ marginTop: '12px', padding: '10px', background: '#eff6ff', borderRadius: '6px', borderLeft: '3px solid #2563eb', fontSize: '0.82rem' }}>
                          <strong>Company Reply:</strong> {rev.reply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}





        {/* 📢 SYSTEM ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>📢 System Announcements</h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
              Important platform updates, maintenance schedules, and feature releases.
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ margin: 0 }}>🧺 Add Items to Cart</h3>
                  
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                      {Array.from(new Set(catalogServices.filter(s => s.name).map(s => s.name))).map(itemName => {
                        const sItem = catalogServices.find(s => s.name === itemName);
                        const itemIdStr = sItem?.id?.toString() || 'unknown';
                        const isSelected = selectedWizardItem?.englishName === itemName;
                        return (
                          <div 
                            key={itemName} 
                            onClick={() => {
                              setSelectedWizardItem(isSelected ? null : { id: itemIdStr, englishName: itemName });
                            }}
                            style={{ 
                              padding: '10px', 
                              border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1', 
                              borderRadius: '8px', 
                              background: isSelected ? '#eff6ff' : 'white', 
                              cursor: 'pointer',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: '1.5rem' }}>{getEmojiForService(itemName)}</div>
                            <div style={{ fontWeight: '700', fontSize: '0.75rem', marginTop: '4px' }}>{itemName}</div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedWizardItem && (
                      <div style={{ marginTop: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <h5 style={{ margin: '0 0 12px 0' }}>Select Service for {selectedWizardItem.englishName}</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(() => {
                            const match = catalogServices.find(s => s.name === selectedWizardItem.englishName);
                            if (!match) return null;
                            return (
                              <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Standard Laundry</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => {
                                      const existing = customerCart.find(i => i.itemId === selectedWizardItem.id && i.variantId === 'sv-1');
                                      if (existing) {
                                        setCustomerCart(customerCart.map(i => i.itemId === selectedWizardItem.id && i.variantId === 'sv-1' ? { ...i, qty: i.qty + 1 } : i));
                                      } else {
                                        setCustomerCart([...customerCart, {
                                          itemId: selectedWizardItem.id,
                                          itemName: selectedWizardItem.englishName,
                                          serviceTypeId: 'st-1',
                                          serviceTypeName: 'Standard Laundry Services',
                                          variantId: 'sv-1',
                                          variantName: 'Normal',
                                          price: match.price,
                                          qty: 1
                                        }]);
                                      }
                                      alert(`Added ${selectedWizardItem.englishName} (Normal) to cart!`);
                                    }}
                                    style={{ padding: '8px 12px', background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                  >
                                    Normal - QR {parseFloat(match.price || '0').toFixed(2)}
                                  </button>

                                  {match.express_price && (
                                    <button
                                      onClick={() => {
                                        const existing = customerCart.find(i => i.itemId === selectedWizardItem.id && i.variantId === 'sv-2');
                                        if (existing) {
                                          setCustomerCart(customerCart.map(i => i.itemId === selectedWizardItem.id && i.variantId === 'sv-2' ? { ...i, qty: i.qty + 1 } : i));
                                        } else {
                                          setCustomerCart([...customerCart, {
                                            itemId: selectedWizardItem.id,
                                            itemName: selectedWizardItem.englishName,
                                            serviceTypeId: 'st-1',
                                            serviceTypeName: 'Standard Laundry Services',
                                            variantId: 'sv-2',
                                            variantName: 'Express',
                                            price: parseFloat(match.express_price || '0'),
                                            qty: 1
                                          }]);
                                        }
                                        alert(`Added ${selectedWizardItem.englishName} (Express) to cart!`);
                                      }}
                                      style={{ padding: '8px 12px', background: '#fffbeb', border: '1.5px solid #fef3c7', color: '#b45309', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                    >
                                      Express - QR {parseFloat(match.express_price || '0').toFixed(2)}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {customerCart.length > 0 && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <h5 style={{ margin: '0 0 12px 0' }}>🛒 Your Cart</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                        {customerCart.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div>
                              <strong>{item.itemName}</strong> - {item.serviceTypeName} ({item.variantName})
                              <br/>Qty: {item.qty}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <strong>QR {(item.price * item.qty).toFixed(2)}</strong>
                              <button onClick={() => setCustomerCart(customerCart.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <button onClick={() => setWizardStep(1)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', cursor: 'pointer', borderRadius: '6px' }}>Back</button>
                    <button disabled={customerCart.length === 0} onClick={() => setWizardStep(3)} style={{ padding: '8px 16px', background: customerCart.length === 0 ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', cursor: customerCart.length === 0 ? 'not-allowed' : 'pointer', borderRadius: '6px' }}>Continue</button>
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

      {/* VIEW INVOICE MODAL */}
      {viewingInvoice && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '440px', background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>🧾 Order Invoice Details</h3>
              <button onClick={() => setViewingInvoice(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            
            <div style={{ padding: '24px', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px', fontFamily: "'Courier New', Courier, monospace" }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>
                    {(() => {
                      const companyObj = db.companies.find(c => c.id === db.activeCompanyId);
                      return companyObj ? `${companyObj.name}${companyObj.address ? `, ${companyObj.address}` : ''}` : (companyName || 'Laundry Desk');
                    })()}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{new Date(viewingInvoice.date).toLocaleDateString()}</div>
                </div>

                <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Order ID:</span>
                    <span style={{ fontWeight: '700' }}>#{viewingInvoice.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Customer:</span>
                    <span style={{ fontWeight: '700' }}>{viewingInvoice.customerName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Payment Method:</span>
                    <span style={{ fontWeight: '700' }}>{viewingInvoice.paymentMethod || 'Cash'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Status:</span>
                    <span style={{ fontWeight: '700', color: viewingInvoice.status === 'Delivered' ? '#16a34a' : '#2563eb' }}>{viewingInvoice.status}</span>
                  </div>
                </div>

                <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Services / Items</div>
                  {viewingInvoice.services && viewingInvoice.services.length > 0 ? (
                    viewingInvoice.services.map((s: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.82rem' }}>
                        <span>{s.name} {s.express ? '⚡' : ''} x{s.qty || 1}</span>
                        <span style={{ fontWeight: '700' }}>QR {((s.express ? s.price * 1.5 : s.price) * (s.qty || 1)).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span>{viewingInvoice.weightItems || 'Standard Laundry'}</span>
                      <span style={{ fontWeight: '700' }}>QR {viewingInvoice.totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', fontSize: '1rem', fontWeight: '800' }}>
                  <span>TOTAL AMOUNT:</span>
                  <span>QR {viewingInvoice.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setViewingInvoice(null)} style={{ padding: '8px 16px', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontWeight: '700' }}>Close</button>
                <button
                  onClick={() => handleDownloadInvoice(viewingInvoice)}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  🖨️ Print / Save PDF
                </button>
              </div>
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
              <div><strong>Status:</strong> {selectedOrder.status} {selectedOrder.deliveryStatus && !['Pending Assignment', 'Received', 'Pending Pickup', 'Pending'].includes(selectedOrder.deliveryStatus) && ` - 🚚 ${selectedOrder.deliveryStatus}`}</div>
              <div><strong>Items:</strong> {selectedOrder.weightItems}</div>
              <div><strong>Total Amount:</strong> QR {selectedOrder.totalAmount.toFixed(2)}</div>
              <div><strong>Delivery agent:</strong> {selectedOrder.courier || 'Unassigned'}</div>
              
              {selectedOrder.deliveryStatus && ['Courier on the way', 'Reached Customer'].includes(selectedOrder.deliveryStatus) && (
                <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span>🚚</span>
                  <span><strong>Live Courier Status:</strong> {selectedOrder.deliveryStatus}</span>
                </div>
              )}
              
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Order Created', ok: true },
                  { label: 'Accepted', ok: ['Accepted', 'Pickup Assigned', 'Picked Up', 'Received', 'Sorting', 'Washing', 'Drying', 'Ironing', 'Processing', 'Quality Check', 'Packing', 'Ready', 'Out For Delivery', 'Out for Delivery', 'Delivered'].includes(selectedOrder.status) },
                  { label: 'Received', ok: ['Received', 'Sorting', 'Washing', 'Drying', 'Ironing', 'Processing', 'Quality Check', 'Packing', 'Ready', 'Out For Delivery', 'Out for Delivery', 'Delivered'].includes(selectedOrder.status) },
                  { label: 'Washing & Processing', ok: ['Washing', 'Drying', 'Ironing', 'Processing', 'Quality Check', 'Packing', 'Ready', 'Out For Delivery', 'Out for Delivery', 'Delivered'].includes(selectedOrder.status) },
                  { label: 'Ready for Collection', ok: ['Ready', 'Out For Delivery', 'Out for Delivery', 'Delivered'].includes(selectedOrder.status) },
                  { label: 'Out For Delivery', ok: ['Out For Delivery', 'Out for Delivery', 'Delivered'].includes(selectedOrder.status) },
                  { label: 'Delivered', ok: ['Delivered'].includes(selectedOrder.status) }
                ].map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: step.ok ? '#16a34a' : '#cbd5e1' }}>{step.ok ? '🟢' : '⚪'}</span>
                    <span style={{ fontWeight: step.ok ? '700' : '400' }}>{step.label}</span>
                  </div>
                ))}
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
