import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, type Company, type User } from './DatabaseContext';

interface Ticket {
  id: string;
  company: string;
  subject: string;
  status: 'Open' | 'Closed';
  date: string;
  message: string;
  history?: { sender: string; message: string; date: string }[];
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  targetType: 'All' | 'Selected';
  targetCompanyId?: string;
  scheduledAt?: string;
}

interface AuditLog {
  id: string;
  action: string;
  description: string;
  date: string;
  type: 'Platform' | 'Company';
  companyId?: string;
}

interface SaaSPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'Monthly' | 'Yearly';
  maxAdmins: number;
  maxCashiers: number;
  maxDeliveryStaff: number;
  maxCustomers: number;
  maxOrdersPerMonth: number;
}

export const SuperAdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { db, saveDB, createCompany, deleteCompany, updateCompany } = useDatabase();

  // Navigation active tab matching exactly the requested workflow
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'company-mgmt'
    | 'sub-mgmt'
    | 'feature-mgmt'
    | 'reports'
    | 'announcements'
    | 'support'
    | 'audit-logs'
    | 'notification-center'
    | 'global-settings'
    | 'security'
    | 'backup-restore'
    | 'system-health'
  >('dashboard');

  // Sub-tabs state
  const [companyMgmtSub, setCompanyMgmtSub] = useState<'companies' | 'admins' | 'monitoring'>('companies');
  const [subMgmtSub, setSubMgmtSub] = useState<'plans' | 'trial' | 'renewals'>('plans');

  // Modals state for creating company
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompSlug, setNewCompSlug] = useState('');
  const [newCompAdminEmail, setNewCompAdminEmail] = useState('');
  const [newCompAdminPass, setNewCompAdminPass] = useState('');
  const [newCompAddress, setNewCompAddress] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompGst, setNewCompGst] = useState('');
  const [newCompBusinessType, setNewCompBusinessType] = useState('Laundry');
  const [newCompLogo, setNewCompLogo] = useState('');

  // Modals state for creating company admin
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminTargetCompId, setAdminTargetCompId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminAddress, setAdminAddress] = useState('');

  // Admin details / login history state
  const [viewingAdmin, setViewingAdmin] = useState<any | null>(null);

  // OTP Demo Hub state
  const [sentOtps, setSentOtps] = useState<Record<string, { otp: string; time: string; verified: boolean; type: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('ll_central_otps') || '{}'); } catch { return {}; }
  });

  // Company monitoring active state (Read-only views)
  const [monitoredCompId, setMonitoredCompId] = useState<string>('');
  const [monitoredData, setMonitoredData] = useState<{
    users: any[];
    customers: any[];
    orders: any[];
    drawerCash: number;
  } | null>(null);
  const [monitoringTab, setMonitoringTab] = useState<'info' | 'customers' | 'cashiers' | 'delivery' | 'orders' | 'payments'>('info');

  // Edit Subscription state
  const [subComp, setSubComp] = useState<Company | null>(null);
  const [subTier, setSubTier] = useState<'Free Trial' | 'Premium' | 'Enterprise'>('Free Trial');
  const [subStatus, setSubStatus] = useState<'Active' | 'Expired'>('Active');
  const [subExpires, setSubExpires] = useState('');
  const [trialDays, setTrialDays] = useState(30);

  // SaaS Pricing Plans State
  const [plans, setPlans] = useState<SaaSPlan[]>(() => {
    const saved = localStorage.getItem('ll_saas_plans');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'plan-trial', name: 'Free Trial', price: 0, billingCycle: 'Monthly', maxAdmins: 1, maxCashiers: 2, maxDeliveryStaff: 5, maxCustomers: 100, maxOrdersPerMonth: 100 },
      { id: 'plan-starter', name: 'Starter', price: 29, billingCycle: 'Monthly', maxAdmins: 1, maxCashiers: 2, maxDeliveryStaff: 5, maxCustomers: 1000, maxOrdersPerMonth: 1000 },
      { id: 'plan-pro', name: 'Professional', price: 79, billingCycle: 'Monthly', maxAdmins: 3, maxCashiers: 5, maxDeliveryStaff: 10, maxCustomers: 5000, maxOrdersPerMonth: 5000 },
      { id: 'plan-ent', name: 'Enterprise', price: 199, billingCycle: 'Monthly', maxAdmins: 10, maxCashiers: 25, maxDeliveryStaff: 50, maxCustomers: 50000, maxOrdersPerMonth: 100000 }
    ];
  });

  // Local storage tables states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Announcements form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargetType, setAnnTargetType] = useState<'All' | 'Selected'>('All');
  const [annTargetComp, setAnnTargetComp] = useState('');
  const [annSchedule, setAnnSchedule] = useState('');

  // Support ticket replies
  const [replyText, setReplyText] = useState('');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Global settings state
  const [platformName, setPlatformName] = useState('Laundra Cloud SaaS');
  const [platformLogo, setPlatformLogo] = useState('🌐');
  const [supportEmail, setSupportEmail] = useState('support@laundra.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [smtpServer, setSmtpServer] = useState('smtp.central-notifications.laundra.com');
  const [smtpUser, setSmtpUser] = useState('Central SMTP Central centralized centralized notifications@laundra.com');
  const [smtpPass, setSmtpPass] = useState('••••••••••••');
  const [smsGatewayUrl, setSmsGatewayUrl] = useState('https://api.sms-gateway.laundra.com/v1');
  const [whatsAppApiKey, setWhatsAppApiKey] = useState('wa_api_live_9a3j...');
  const [googleMapsKey, setGoogleMapsKey] = useState('AIzaSy...');
  
  // Security locks state
  const [lockedCompanies, setLockedCompanies] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ll_locked_companies') || '[]'); } catch { return []; }
  });

  // System status mock
  const [healthStats, setHealthStats] = useState({
    server: 'Online',
    db: 'Healthy (12ms latency)',
    storage: '320 MB / 10 GB',
    apiHealth: '100% Operational',
    lastBackup: 'Today, 03:00 AM'
  });

  // Add system log helper
  const addAuditLog = (action: string, description: string, type: 'Platform' | 'Company' = 'Platform', companyId?: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now(),
      action,
      description,
      date: new Date().toLocaleString(),
      type,
      companyId
    };
    const nextLogs = [newLog, ...auditLogs];
    setAuditLogs(nextLogs);
    localStorage.setItem('ll_platform_audit_logs', JSON.stringify(nextLogs));
  };

  // Check login security
  useEffect(() => {
    const session = localStorage.getItem('ll_super_admin_session');
    if (session !== 'active') {
      alert('Access Denied. Please log in as Super Admin.');
      navigate('/');
    }
  }, [navigate]);

  // Load mock dataset from LocalStorage
  useEffect(() => {
    // Tickets
    const savedTickets = localStorage.getItem('ll_platform_tickets');
    if (savedTickets) {
      setTickets(JSON.parse(savedTickets));
    } else {
      const initialTickets: Ticket[] = [
        { id: 'tkt-1', company: 'Laundra HQ', subject: 'Central SMS Gateway integration', status: 'Open', date: '2026-07-04', message: 'SMS notifications are taking over 5 seconds to deliver. Is Twilio server overloaded?', history: [] },
        { id: 'tkt-2', company: 'bhanu company', subject: 'GST invoice format setup', status: 'Closed', date: '2026-07-03', message: 'How do we enable QR codes on standard PDF receipt printouts?', history: [{ sender: 'Super Admin', message: 'We have enabled invoiceModule and qrCode modules for your company. You can configure them in Settings.', date: '2026-07-03' }] }
      ];
      localStorage.setItem('ll_platform_tickets', JSON.stringify(initialTickets));
      setTickets(initialTickets);
    }

    // Announcements
    const savedAnn = localStorage.getItem('ll_platform_announcements');
    if (savedAnn) {
      setAnnouncements(JSON.parse(savedAnn));
    } else {
      const initialAnn: Announcement[] = [
        { id: 'ann-1', title: 'Core Multi-Tenant Engine Upgrade v2.8', content: 'We are upgrading the core SaaS multitenancy database drivers tonight at 3:00 AM UTC. Expect brief latency blips.', date: '2026-07-05', targetType: 'All' }
      ];
      localStorage.setItem('ll_platform_announcements', JSON.stringify(initialAnn));
      setAnnouncements(initialAnn);
    }

    // Audit logs
    const savedLogs = localStorage.getItem('ll_platform_audit_logs');
    if (savedLogs) {
      setAuditLogs(JSON.parse(savedLogs));
    } else {
      const initialLogs: AuditLog[] = [
        { id: 'log-1', action: 'BOOT', description: 'System loaded default multi-tenant console', date: '2026-07-04 10:15:30', type: 'Platform' }
      ];
      localStorage.setItem('ll_platform_audit_logs', JSON.stringify(initialLogs));
      setAuditLogs(initialLogs);
    }

    // Save initial plans list
    localStorage.setItem('ll_saas_plans', JSON.stringify(plans));
  }, []);

  // Save plans state changes
  useEffect(() => {
    localStorage.setItem('ll_saas_plans', JSON.stringify(plans));
  }, [plans]);

  // Sync OTPs
  useEffect(() => {
    localStorage.setItem('ll_central_otps', JSON.stringify(sentOtps));
  }, [sentOtps]);

  // Sync locked status
  useEffect(() => {
    localStorage.setItem('ll_locked_companies', JSON.stringify(lockedCompanies));
  }, [lockedCompanies]);

  // Fetch monitored company context
  useEffect(() => {
    if (monitoredCompId) {
      const u = JSON.parse(localStorage.getItem(`ll_${monitoredCompId}_users`) || '[]');
      const c = JSON.parse(localStorage.getItem(`ll_${monitoredCompId}_customers`) || '[]');
      const o = JSON.parse(localStorage.getItem(`ll_${monitoredCompId}_orders`) || '[]');
      const d = parseFloat(localStorage.getItem(`ll_${monitoredCompId}_drawercash`) || '350');
      setMonitoredData({ users: u, customers: c, orders: o, drawerCash: d });
    } else {
      setMonitoredData(null);
    }
  }, [monitoredCompId]);

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const handleSignOut = () => {
    localStorage.removeItem('ll_super_admin_session');
    navigate('/');
  };

  const handleToggleSuspension = (company: Company) => {
    const nextStatus = company.status === 'Active' ? 'Suspended' : 'Active';
    updateCompany(company.id, { status: nextStatus });
    addAuditLog('COMPANY_SUSPEND_TOGGLE', `Changed status of company ${company.name} (${company.id}) to ${nextStatus}`);
  };

  const handleToggleLockCompany = (companyId: string) => {
    let next;
    if (lockedCompanies.includes(companyId)) {
      next = lockedCompanies.filter(id => id !== companyId);
      addAuditLog('COMPANY_UNLOCK', `Security: Unlocked company portal ${companyId}`);
    } else {
      next = [...lockedCompanies, companyId];
      addAuditLog('COMPANY_LOCK', `Security: Locked company portal ${companyId} due to suspicious actions`);
    }
    setLockedCompanies(next);
  };

  // Central Centralized Centralized notification service generator
  const triggerCentralOtp = (target: string, type: 'Company Admin Verification' | 'Customer Email Verification' | 'Delivery Staff Account Activation' | 'Password Reset') => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtps(prev => ({
      ...prev,
      [target]: { otp, time: new Date().toLocaleTimeString(), verified: false, type }
    }));
    addAuditLog('NOTIFICATION_OTP_SEND', `Sent central Centralized Centralized Centralized Central Centralized ${type} OTP to ${target} via centralised Notification service.`);
    alert(`[Centralised Notification System Hub]\nCentralised OTP sent to: ${target}\nOTP Code: ${otp}\nType: ${type}`);
  };

  const handleVerifyCentralOtp = (target: string) => {
    if (!sentOtps[target]) return;
    setSentOtps(prev => ({
      ...prev,
      [target]: { ...prev[target], verified: true }
    }));
    addAuditLog('NOTIFICATION_OTP_VERIFIED', `Successfully verified central OTP for: ${target}`);
    alert(`Central OTP for ${target} successfully verified!`);
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCompName.trim();
    const slug = newCompSlug.toLowerCase().trim().replace(/\s+/g, '-');
    const email = newCompAdminEmail.trim().toLowerCase();
    const pass = newCompAdminPass;

    if (!name || !slug || !email || !pass) {
      alert('Please fill out all required company credentials fields.');
      return;
    }

    if (db.companies.some(c => c.slug === slug)) {
      alert('A company with this domain path URL key slug already exists.');
      return;
    }

    createCompany(name, slug, email, pass, newCompAddress, newCompPhone, newCompGst, newCompBusinessType, newCompLogo);
    addAuditLog('COMPANY_CREATE', `Created company "${name}" under /${slug} endpoint with administrator login ${email}`);
    
    // Central notification OTP verification flow triggered
    triggerCentralOtp(email, 'Company Admin Verification');

    // Reset fields
    setNewCompName('');
    setNewCompSlug('');
    setNewCompAdminEmail('');
    setNewCompAdminPass('');
    setNewCompAddress('');
    setNewCompPhone('');
    setNewCompGst('');
    setNewCompBusinessType('Laundry');
    setNewCompLogo('');
    setShowAddModal(false);
  };

  const handleCreateCompanyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTargetCompId) return;
    
    const nextUsers = JSON.parse(localStorage.getItem(`ll_${adminTargetCompId}_users`) || '[]');
    const adminLimit = db.companies.find(c => c.id === adminTargetCompId)?.limits?.maxAdmins || 3;
    const currentAdmins = nextUsers.filter((u: any) => u.role === 'admin').length;
    
    if (currentAdmins >= adminLimit) {
      alert(`Limit Block: Company has reached max admin limit (${adminLimit}). Cannot create more admins.`);
      return;
    }

    const newUser: User = {
      id: 'u-' + (nextUsers.length + 1),
      name: adminName,
      role: 'admin',
      email: adminEmail.trim().toLowerCase(),
      password: adminPass,
      phone: adminPhone,
      address: adminAddress,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(`ll_${adminTargetCompId}_users`, JSON.stringify([...nextUsers, newUser]));
    addAuditLog('COMPANY_ADMIN_CREATE', `Created new company admin ${adminEmail} for company ${adminTargetCompId}`, 'Company', adminTargetCompId);
    
    triggerCentralOtp(adminEmail, 'Company Admin Verification');

    setAdminName('');
    setAdminEmail('');
    setAdminPass('');
    setAdminPhone('');
    setAdminAddress('');
    setShowAdminModal(false);
  };

  const handleResetAdminPassword = (companyId: string, email: string) => {
    const pass = prompt("Enter new password for admin " + email);
    if (!pass) return;
    const nextUsers = JSON.parse(localStorage.getItem(`ll_${companyId}_users`) || '[]');
    const updated = nextUsers.map((u: any) => u.email === email ? { ...u, password: pass } : u);
    localStorage.setItem(`ll_${companyId}_users`, JSON.stringify(updated));
    
    triggerCentralOtp(email, 'Password Reset');
    addAuditLog('COMPANY_ADMIN_PASSWORD_RESET', `Reset password for company admin ${email}`, 'Company', companyId);
  };

  const handleSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subComp) return;

    let expires = subExpires;
    if (subTier === 'Free Trial') {
      const target = new Date();
      target.setDate(target.getDate() + trialDays);
      expires = target.toISOString().split('T')[0];
    }

    updateCompany(subComp.id, {
      subscription: {
        tier: subTier,
        status: subStatus,
        expiresAt: expires
      }
    });

    addAuditLog('SUBSCRIPTION_UPDATE', `Updated company ${subComp.name} subscription to ${subTier} (${subStatus}), Expiry: ${expires}`);
    setSubComp(null);
  };

  const handleFeatureToggle = (companyId: string, featureName: string, value: boolean) => {
    const company = db.companies.find(c => c.id === companyId);
    if (!company) return;
    const features = { ...company.features, [featureName]: value };
    updateCompany(companyId, { features });
    addAuditLog('FEATURE_TOGGLE', `Updated features for company ${company.name} (${companyId}): ${featureName} is now ${value ? 'Enabled' : 'Disabled'}`);
  };

  const handleLimitChange = (companyId: string, limitKey: string, value: number) => {
    const company = db.companies.find(c => c.id === companyId);
    if (!company) return;
    const limits = { ...company.limits, [limitKey]: value };
    updateCompany(companyId, { limits });
    addAuditLog('LIMIT_UPDATE', `Updated limits for company ${company.name} (${companyId}): ${limitKey} set to ${value}`);
  };

  const handleSavePlan = (planId: string, updates: Partial<SaaSPlan>) => {
    const updated = plans.map(p => p.id === planId ? { ...p, ...updates } : p);
    setPlans(updated);
    addAuditLog('SAAS_PLAN_UPDATE', `Updated SaaS plan configuration: ${planId}`);
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    const newAnn: Announcement = {
      id: 'ann-' + Date.now(),
      title: annTitle,
      content: annContent,
      date: new Date().toISOString().split('T')[0],
      targetType: annTargetType,
      targetCompanyId: annTargetType === 'Selected' ? annTargetComp : undefined,
      scheduledAt: annSchedule || undefined
    };
    const next = [newAnn, ...announcements];
    setAnnouncements(next);
    localStorage.setItem('ll_platform_announcements', JSON.stringify(next));
    addAuditLog('ANNOUNCEMENT_CREATE', `Created broadcast announcement: ${annTitle}`);
    setAnnTitle('');
    setAnnContent('');
    setAnnSchedule('');
  };

  const handleDeleteAnnouncement = (id: string) => {
    const next = announcements.filter(a => a.id !== id);
    setAnnouncements(next);
    localStorage.setItem('ll_platform_announcements', JSON.stringify(next));
    addAuditLog('ANNOUNCEMENT_DELETE', `Deleted broadcast announcement ID: ${id}`);
  };

  const handleTicketReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    const next = tickets.map(t => {
      if (t.id === activeTicket.id) {
        const history = t.history || [];
        return {
          ...t,
          history: [...history, { sender: 'Super Admin', message: replyText.trim(), date: new Date().toLocaleString() }]
        };
      }
      return t;
    });
    setTickets(next);
    localStorage.setItem('ll_platform_tickets', JSON.stringify(next));
    setActiveTicket(next.find(t => t.id === activeTicket.id) || null);
    setReplyText('');
    addAuditLog('TICKET_REPLY', `Sent reply to support ticket ID: ${activeTicket.id}`);
  };

  const handleCloseTicket = (ticketId: string) => {
    const next = tickets.map(t => t.id === ticketId ? { ...t, status: 'Closed' as const } : t);
    setTickets(next);
    localStorage.setItem('ll_platform_tickets', JSON.stringify(next));
    setActiveTicket(next.find(t => t.id === ticketId) || null);
    addAuditLog('TICKET_CLOSE', `Closed ticket ID: ${ticketId}`);
  };

  // Database Backup / Restore handlers
  const handleDownloadBackup = () => {
    const backupData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ll_')) {
        backupData[key] = localStorage.getItem(key) || '';
      }
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laundra_platform_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    addAuditLog('BACKUP_EXPORT', 'Exported full platform JSON database dump file');
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("Are you sure you want to restore? This will overwrite your current local storage database!")) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ll_')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          
          Object.entries(data).forEach(([key, val]) => {
            localStorage.setItem(key, val as string);
          });
          alert("Database restored successfully! Reloading page...");
          window.location.reload();
        }
      } catch (err) {
        alert("Invalid backup file format!");
      }
    };
    reader.readAsText(file);
  };

  // Platform wide stats
  const totalCompaniesCount = db.companies.length;
  const activeCompaniesCount = db.companies.filter(c => c.status === 'Active').length;
  const suspendedCompaniesCount = db.companies.filter(c => c.status === 'Suspended').length;
  const freeTrialCompaniesCount = db.companies.filter(c => c.subscription.tier === 'Free Trial').length;
  const expiredSubsCount = db.companies.filter(c => c.subscription.status === 'Expired').length;
  
  // Calculate aggregated stats across all multi-tenant companies
  const companyUserCounts = db.companies.map(c => {
    const u = JSON.parse(localStorage.getItem(`ll_${c.id}_users`) || '[]');
    const cust = JSON.parse(localStorage.getItem(`ll_${c.id}_customers`) || '[]');
    const ord = JSON.parse(localStorage.getItem(`ll_${c.id}_orders`) || '[]');
    return {
      admins: u.filter((usr: any) => usr.role === 'admin').length,
      cashiers: u.filter((usr: any) => usr.role === 'cashier').length,
      delivery: u.filter((usr: any) => usr.role === 'delivery').length,
      customers: cust.length,
      orders: ord.length,
      revenue: ord.reduce((s: number, o: any) => s + (o.totalAmount || o.total || 0), 0)
    };
  });

  const totalAdmins = companyUserCounts.reduce((s, c) => s + c.admins, 0);
  const totalCashiers = companyUserCounts.reduce((s, c) => s + c.cashiers, 0);
  const totalDelivery = companyUserCounts.reduce((s, c) => s + c.delivery, 0);
  const totalCustomers = companyUserCounts.reduce((s, c) => s + c.customers, 0);
  const totalOrders = companyUserCounts.reduce((s, c) => s + c.orders, 0);
  const totalPlatformRevenue = companyUserCounts.reduce((s, c) => s + c.revenue, 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ─── SIDEBAR NAVIGATION ─── */}
      <aside style={{ width: '270px', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🪐</span> Laundra SaaS
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform Super Admin</p>
        </div>

        <ul style={{ listStyle: 'none', padding: '20px 16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'company-mgmt', label: 'Company Management', icon: '🏢' },
            { id: 'sub-mgmt', label: 'Subscriptions', icon: '💳' },
            { id: 'feature-mgmt', label: 'Features & Limits', icon: '⚙️' },
            { id: 'reports', label: 'Platform Reports', icon: '📈' },
            { id: 'announcements', label: 'Announcements', icon: '📢' },
            { id: 'support', label: 'Support Management', icon: '🎫' },
            { id: 'audit-logs', label: 'Audit Logs', icon: '📜' },
            { id: 'notification-center', label: 'Notification Center', icon: '🔔' },
            { id: 'global-settings', label: 'Global Settings', icon: '🌐' },
            { id: 'security', label: 'SaaS Security', icon: '🔐' },
            { id: 'backup-restore', label: 'Backup & Restore', icon: '💾' },
            { id: 'system-health', label: 'System Health', icon: '❤️' }
          ].map(tab => (
            <li 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '11px 14px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.86rem',
                color: activeTab === tab.id ? 'white' : '#94a3b8',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s'
              }}
            >
              <span style={{ fontSize: '1rem' }}>{tab.icon}</span> <span>{tab.label}</span>
            </li>
          ))}
        </ul>

        <div style={{ padding: '16px', borderTop: '1px solid #1e293b' }}>
          <button 
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1.5px solid #ef4444',
              background: 'transparent',
              color: '#f87171',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        
        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' }}>
              {activeTab.replace('-', ' ')} Console
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              {activeTab === 'dashboard' && 'Platform Overview & Live Multi-Tenant Aggregated Analytics.'}
              {activeTab === 'company-mgmt' && 'Manage SaaS companies lifecycle, create admins, and inspect data.'}
              {activeTab === 'sub-mgmt' && 'Configure SaaS plans, trials duration, and process renewals.'}
              {activeTab === 'feature-mgmt' && 'Toggle modular modules, set resource user and business limits.'}
              {activeTab === 'reports' && 'Generate SaaS platform analytics, conversion rates, and usage reports.'}
              {activeTab === 'announcements' && 'Publish centralized announcements to selected or all companies.'}
              {activeTab === 'support' && 'Address support tickets opened by company administrators.'}
              {activeTab === 'audit-logs' && 'Platform security audit trail and tenant activity logs.'}
              {activeTab === 'notification-center' && 'Central centralised notification system and OTP verification hub.'}
              {activeTab === 'global-settings' && 'Configure platforms global SMTP, Templates, Gateway configurations.'}
              {activeTab === 'security' && 'Manage portal lockouts, block suspicious accounts, and audit log protection.'}
              {activeTab === 'backup-restore' && 'Export full database backup dump, trigger manual backup restore.'}
              {activeTab === 'system-health' && 'Check SaaS web system status, database health, API operational metrics.'}
            </p>
          </div>
        </div>

        {/* ─── 1. DASHBOARD TAB ─── */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* SaaS Aggregated Statistics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {[
                { title: 'Total Companies', value: totalCompaniesCount, icon: '🏢', bg: '#f0f9ff', text: '#0369a1' },
                { title: 'Active / Suspended', value: `${activeCompaniesCount} / ${suspendedCompaniesCount}`, icon: '⚡', bg: '#ecfdf5', text: '#047857' },
                { title: 'Trial Duration active', value: freeTrialCompaniesCount, icon: '🎁', bg: '#fef3c7', text: '#b45309' },
                { title: 'Expired Subscriptions', value: expiredSubsCount, icon: '⚠️', bg: '#fef2f2', text: '#b91c1c' },
                { title: 'Total Company Admins', value: totalAdmins, icon: '👤', bg: '#faf5ff', text: '#6b21a8' },
                { title: 'Total Cashiers', value: totalCashiers, icon: '💳', bg: '#f0fdfa', text: '#0f766e' },
                { title: 'Total Delivery Staff', value: totalDelivery, icon: '🚚', bg: '#fdf2f8', text: '#be185d' },
                { title: 'Total Customers', value: totalCustomers, icon: '👥', bg: '#eff6ff', text: '#1d4ed8' },
                { title: 'Total Orders', value: totalOrders, icon: '🧺', bg: '#f5f5f4', text: '#44403c' },
                { title: 'Total Revenue', value: `QR ${totalPlatformRevenue.toFixed(2)}`, icon: '💰', bg: '#eff6ff', text: '#1e40af' }
              ].map((stat, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: stat.bg, color: stat.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>{stat.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{stat.title}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Sub-row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Recent company registrations */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '800' }}>🏢 Recent Tenant Registrations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {db.companies.slice(-4).reverse().map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{c.adminEmail} • Expiry: {c.subscription.expiresAt}</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px' }}>{c.subscription.tier}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent activities platform level */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '800' }}>📜 Recent Activity Logs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {auditLogs.slice(0, 4).map(l => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: '800', color: '#d97706', fontSize: '0.78rem', marginRight: '8px' }}>{l.action}</span>
                        <span style={{ fontSize: '0.82rem', color: '#334155' }}>{l.description}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.date}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ─── 2. COMPANY MANAGEMENT TAB ─── */}
        {activeTab === 'company-mgmt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Sub navigation bar */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              {[
                { id: 'companies', label: 'Manage Companies', icon: '🏢' },
                { id: 'admins', label: 'Company Admins', icon: '👥' },
                { id: 'monitoring', label: 'Company Monitoring (Read-Only)', icon: '👁️' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setCompanyMgmtSub(sub.id as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    background: companyMgmtSub === sub.id ? '#eff6ff' : 'transparent',
                    color: companyMgmtSub === sub.id ? '#2563eb' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{sub.icon}</span> {sub.label}
                </button>
              ))}
            </div>

            {/* View: Companies */}
            {companyMgmtSub === 'companies' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>➕ Create Company</button>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Company Name</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>GST / Business Type</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Sub Tier</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Status</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {db.companies.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.5rem' }}>{c.logo || '🏢'}</span>
                              <div>
                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{c.name}</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Slug: /{c.slug} • Email: {c.adminEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: '600' }}>GST: {c.gstNumber || 'N/A'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Type: {c.businessType || 'Laundry'}</div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '700' }}>
                            {c.subscription.tier}
                            <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>Expires: {c.subscription.expiresAt}</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800', background: c.status === 'Active' ? '#dcfce7' : '#fee2e2', color: c.status === 'Active' ? '#15803d' : '#b91c1c' }}>{c.status}</span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button onClick={() => { setSubComp(c); setSubTier(c.subscription.tier); setSubStatus(c.subscription.status); setSubExpires(c.subscription.expiresAt); }} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>💳 Plan</button>
                              <button onClick={() => handleToggleSuspension(c)} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: 'none', background: c.status === 'Active' ? '#ffedd5' : '#dcfce7', color: c.status === 'Active' ? '#c2410c' : '#15803d', cursor: 'pointer' }}>{c.status === 'Active' ? 'Suspend' : 'Activate'}</button>
                              {c.id !== 'comp-default' && (
                                <button onClick={() => { if (confirm('Soft delete this company? Data will be archived.')) deleteCompany(c.id); }} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>🗑️ Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View: Admins */}
            {companyMgmtSub === 'admins' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowAdminModal(true)} style={{ padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>➕ Create Company Admin</button>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Admin Name</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Email</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Tenant Company</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Central OTP verified</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {db.companies.map(c => {
                        const usersList = JSON.parse(localStorage.getItem(`ll_${c.id}_users`) || '[]');
                        const companyAdmins = usersList.filter((u: any) => u.role === 'admin');
                        return companyAdmins.map((u: any) => (
                          <tr key={u.id + '-' + c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px', fontWeight: '700' }}>{u.name}</td>
                            <td style={{ padding: '16px', fontSize: '0.85rem' }}>{u.email}</td>
                            <td style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: '#0284c7' }}>{c.name}</td>
                            <td style={{ padding: '16px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                                background: sentOtps[u.email]?.verified ? '#dcfce7' : '#fee2e2',
                                color: sentOtps[u.email]?.verified ? '#15803d' : '#b91c1c'
                              }}>
                                {sentOtps[u.email]?.verified ? 'OTP Verified' : 'OTP Pending'}
                              </span>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button onClick={() => triggerCentralOtp(u.email, 'Company Admin Verification')} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>🔑 Send OTP</button>
                                <button onClick={() => handleVerifyCentralOtp(u.email)} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>✓ Verify</button>
                                <button onClick={() => handleResetAdminPassword(c.id, u.email)} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>🔁 Reset Pass</button>
                                <button onClick={() => setViewingAdmin({ ...u, companyName: c.name })} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>👁️ Profile</button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View: Monitoring (Read-Only) */}
            {companyMgmtSub === 'monitoring' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Select Tenant Company to Monitor</label>
                  <select value={monitoredCompId} onChange={e => setMonitoredCompId(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', width: '100%', maxWidth: '400px', outline: 'none' }}>
                    <option value="">— Select Company —</option>
                    {db.companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>)}
                  </select>
                </div>

                {monitoredCompId && monitoredData && (
                  <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
                    {/* Monitor sidebar tabs */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { id: 'info', label: 'Company Info', icon: '🏢' },
                        { id: 'customers', label: `Customers (${monitoredData.customers.length})`, icon: '👥' },
                        { id: 'cashiers', label: `Cashiers (${monitoredData.users.filter(u => u.role === 'cashier').length})`, icon: '💳' },
                        { id: 'delivery', label: `Delivery Staff (${monitoredData.users.filter(u => u.role === 'delivery').length})`, icon: '🚚' },
                        { id: 'orders', label: `Orders (${monitoredData.orders.length})`, icon: '🧺' },
                        { id: 'payments', label: 'Revenue & Payments', icon: '💰' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setMonitoringTab(t.id as any)}
                          style={{
                            padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontWeight: '700', fontSize: '0.82rem', textAlign: 'left',
                            background: monitoringTab === t.id ? '#f0f9ff' : 'transparent',
                            color: monitoringTab === t.id ? '#0284c7' : '#475569',
                            display: 'flex', alignItems: 'center', gap: '8px'
                          }}
                        >
                          <span>{t.icon}</span> {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Monitor Tab Area */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                      {monitoringTab === 'info' && (
                        <div>
                          <h3 style={{ margin: '0 0 16px 0' }}>🏢 Company General Info</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.88rem' }}>
                            <div><strong>Company ID:</strong> {monitoredCompId}</div>
                            <div><strong>GST Number:</strong> {db.companies.find(c => c.id === monitoredCompId)?.gstNumber || 'N/A'}</div>
                            <div><strong>Business Type:</strong> {db.companies.find(c => c.id === monitoredCompId)?.businessType || 'Laundry'}</div>
                            <div><strong>Subscription Tier:</strong> {db.companies.find(c => c.id === monitoredCompId)?.subscription.tier}</div>
                            <div><strong>Max Cashiers Limit:</strong> {db.companies.find(c => c.id === monitoredCompId)?.limits?.maxCashiers || 5}</div>
                            <div><strong>Max Orders Limit:</strong> {db.companies.find(c => c.id === monitoredCompId)?.limits?.maxOrdersPerMonth || 2000}/month</div>
                          </div>
                        </div>
                      )}

                      {monitoringTab === 'customers' && (
                        <div>
                          <h3 style={{ margin: '0 0 16px 0' }}>👥 Customers List (Read-Only)</h3>
                          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {monitoredData.customers.map((c: any) => (
                              <div key={c.id} style={{ padding: '10px', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                                <strong>{c.name}</strong> ({c.email}) • Phone: {c.phone} • Balance: QR {c.walletBalance.toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {monitoringTab === 'cashiers' && (
                        <div>
                          <h3 style={{ margin: '0 0 16px 0' }}>💳 Cashier Agents</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {monitoredData.users.filter(u => u.role === 'cashier').map((u: any) => (
                              <div key={u.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                                <strong>{u.name}</strong> ({u.email}) • Phone: {u.phone} • Status: {u.status || 'Active'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {monitoringTab === 'delivery' && (
                        <div>
                          <h3 style={{ margin: '0 0 16px 0' }}>🚚 Delivery Staff</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {monitoredData.users.filter(u => u.role === 'delivery').map((u: any) => (
                              <div key={u.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                                <strong>{u.name}</strong> ({u.email}) • Phone: {u.phone} • Status: {u.status || 'Active'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {monitoringTab === 'orders' && (
                        <div>
                          <h3 style={{ margin: '0 0 16px 0' }}>🧺 Orders Timeline</h3>
                          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {monitoredData.orders.map((o: any) => (
                              <div key={o.id} style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                  <strong>#{o.id}</strong> — {o.customerName}
                                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Date: {o.date} • Plan: {o.planType || 'Normal'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontWeight: '800' }}>QR {(o.totalAmount || o.total || 0).toFixed(2)}</span>
                                  <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: '700' }}>{o.status}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {monitoringTab === 'payments' && (
                        <div>
                          <h3 style={{ margin: '0 0 16px 0' }}>💰 Revenue & Payments</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Revenue</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>
                                QR {monitoredData.orders.reduce((s, o) => s + (o.totalAmount || o.total || 0), 0).toFixed(2)}
                              </div>
                            </div>
                            <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Cash Drawer</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>QR {monitoredData.drawerCash.toFixed(2)}</div>
                            </div>
                          </div>
                          <h4 style={{ margin: '0 0 10px 0' }}>Payment Mode Split</h4>
                          <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {['Cash', 'Card', 'UPI', 'Wallet'].map(method => {
                              const total = monitoredData.orders.filter(o => o.paymentMethod === method).reduce((s, o) => s + (o.totalAmount || o.total || 0), 0);
                              return (
                                <div key={method} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                                  <span>{method} Payments</span>
                                  <strong>QR {total.toFixed(2)}</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ─── 3. SUBSCRIPTION MANAGEMENT TAB ─── */}
        {activeTab === 'sub-mgmt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              {[
                { id: 'plans', label: 'Manage SaaS Plans', icon: '📝' },
                { id: 'trial', label: 'Free Trial Management', icon: '🎁' },
                { id: 'renewals', label: 'Subscription Renewals & History', icon: '💳' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSubMgmtSub(sub.id as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    background: subMgmtSub === sub.id ? '#eff6ff' : 'transparent',
                    color: subMgmtSub === sub.id ? '#2563eb' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{sub.icon}</span> {sub.label}
                </button>
              ))}
            </div>

            {/* View: Manage SaaS Plans */}
            {subMgmtSub === 'plans' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                {plans.map(p => (
                  <div key={p.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{p.name} Plan</h3>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#2563eb', margin: '12px 0 20px 0' }}>
                      QR {p.price} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>/ {p.billingCycle}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                      <div>Max Company Admins: <strong>{p.maxAdmins}</strong></div>
                      <div>Max Cashier staff: <strong>{p.maxCashiers}</strong></div>
                      <div>Max Delivery agents: <strong>{p.maxDeliveryStaff}</strong></div>
                      <div>Max Customers: <strong>{p.maxCustomers}</strong></div>
                      <div>Max Orders: <strong>{p.maxOrdersPerMonth} / month</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View: Free Trial Management */}
            {subMgmtSub === 'trial' && (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Company</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Trial Expiry</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.companies.filter(c => c.subscription.tier === 'Free Trial').map(c => {
                      const isExpired = new Date(c.subscription.expiresAt) < new Date();
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px', fontWeight: '700' }}>{c.name}</td>
                          <td style={{ padding: '16px', fontSize: '0.85rem' }}>{c.subscription.expiresAt}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800', background: isExpired ? '#fee2e2' : '#fef3c7', color: isExpired ? '#b91c1c' : '#d97706' }}>
                              {isExpired ? 'Expired Trial' : 'Trial Active'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button onClick={() => { setSubComp(c); setSubTier('Free Trial'); setSubStatus('Active'); setSubExpires(c.subscription.expiresAt); }} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Extend Trial</button>
                              <button onClick={() => updateCompany(c.id, { subscription: { tier: 'Premium', status: 'Active', expiresAt: '2027-12-31' } })} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: 'none', background: '#dcfce7', color: '#15803d', cursor: 'pointer' }}>Convert to Paid</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* View: Renewals */}
            {subMgmtSub === 'renewals' && (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Company</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Active Subscription Tier</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Expires At</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Modify Billing Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.companies.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontWeight: '700' }}>{c.name}</td>
                        <td style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '700' }}>{c.subscription.tier}</td>
                        <td style={{ padding: '16px', fontSize: '0.85rem' }}>{c.subscription.expiresAt}</td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button onClick={() => { setSubComp(c); setSubTier(c.subscription.tier); setSubStatus(c.subscription.status); setSubExpires(c.subscription.expiresAt); }} style={{ padding: '6px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>💳 Change Tier / Renew</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* ─── 4. FEATURE & RESOURCE MANAGEMENT TAB ─── */}
        {activeTab === 'feature-mgmt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {db.companies.map(c => (
              <div key={c.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
                <h3 style={{ margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🏢 {c.name} Features & Limits</span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Slug: /{c.slug}</span>
                </h3>

                {/* Grid for features */}
                <h4 style={{ margin: '20px 0 10px 0', color: '#0f172a' }}>⚙️ Enable / Disable Modules</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {[
                    { key: 'customerManagement', label: 'Customer Management' },
                    { key: 'orderManagement', label: 'Order Management' },
                    { key: 'cashierModule', label: 'Cashier Module' },
                    { key: 'deliveryModule', label: 'Delivery Module' },
                    { key: 'serviceManagement', label: 'Service Management' },
                    { key: 'paymentModule', label: 'Payment Module' },
                    { key: 'expenseModule', label: 'Expense Module' },
                    { key: 'reports', label: 'Reports Console' },
                    { key: 'coupons', label: 'Coupons & Promos' },
                    { key: 'wallet', label: 'Customer Wallet' },
                    { key: 'loyaltyProgram', label: 'Loyalty Program' },
                    { key: 'invoiceModule', label: 'Invoice Module' },
                    { key: 'qrCode', label: 'QR Code Printing' },
                    { key: 'barcode', label: 'Barcode scanning' },
                    { key: 'emailNotifications', label: 'Central Email Alerts' },
                    { key: 'smsNotifications', label: 'Central SMS Alerts' },
                    { key: 'whatsAppNotifications', label: 'WhatsApp Alerts' },
                    { key: 'publicTracking', label: 'Public Tracking' },
                    { key: 'apiAccess', label: 'API Integration Access' },
                    { key: 'webhooks', label: 'Webhooks Webhook' },
                    { key: 'multiLanguage', label: 'Multi-language support' },
                    { key: 'backupRestore', label: 'Backup & Restore module' }
                  ].map(f => {
                    const isChecked = !!(c.features as any)[f.key];
                    return (
                      <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <input type="checkbox" checked={isChecked} onChange={e => handleFeatureToggle(c.id, f.key, e.target.checked)} />
                        {f.label}
                      </label>
                    );
                  })}
                </div>

                {/* Grid for limits */}
                <h4 style={{ margin: '24px 0 10px 0', color: '#0f172a' }}>👥 Assign Resource & Business Limits</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {[
                    { key: 'maxAdmins', label: 'Max Admins', min: 1 },
                    { key: 'maxCashiers', label: 'Max Cashiers', min: 1 },
                    { key: 'maxDeliveryStaff', label: 'Max Delivery Staff', min: 1 },
                    { key: 'maxCustomers', label: 'Max Customers', min: 100 },
                    { key: 'maxOrdersPerMonth', label: 'Max Orders/Month', min: 100 },
                    { key: 'maxBranches', label: 'Max Branches (Future)', min: 1 },
                    { key: 'maxStorage', label: 'Max Storage (MB)', min: 10 },
                    { key: 'maxApiRequests', label: 'Max API Requests/Month', min: 1000 }
                  ].map(limit => {
                    const value = (c.limits as any)?.[limit.key] || (limit.key === 'maxAdmins' ? 3 : limit.key === 'maxCashiers' ? 5 : limit.key === 'maxDeliveryStaff' ? 10 : 2000);
                    return (
                      <div key={limit.key}>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>{limit.label}</label>
                        <input 
                          type="number" 
                          min={limit.min} 
                          value={value} 
                          onChange={e => handleLimitChange(c.id, limit.key, parseInt(e.target.value) || limit.min)} 
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }} 
                        />
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}

          </div>
        )}

        {/* ─── 5. PLATFORM REPORTS TAB ─── */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Split Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              
              {/* Company wise revenue breakdown list */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>💰 Company-wise Revenue Report</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {db.companies.map(c => {
                    const uStats = companyUserCounts[db.companies.findIndex(comp => comp.id === c.id)];
                    return (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem' }}>{c.name}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Subscription: {c.subscription.tier}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '800', color: '#2563eb' }}>QR {uStats?.revenue.toFixed(2) || '0.00'}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{uStats?.orders || 0} orders total</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conversion Statistics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>🎁 Free Trial Conversion Rates</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                    <span>Active Free Trials</span>
                    <strong>{freeTrialCompaniesCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Paid SaaS Tenants</span>
                    <strong>{db.companies.filter(c => c.subscription.tier !== 'Free Trial').length}</strong>
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>⚙️ Central Notifications Sent</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Central SMS messages</span>
                      <strong>{Object.values(sentOtps).filter(o => o.type.includes('SMS') || o.type.includes('Verification')).length * 3 + 12}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Verification Emails</span>
                      <strong>{Object.values(sentOtps).length + 8}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>WhatsApp Messages</span>
                      <strong>14</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ─── 6. ANNOUNCEMENT MANAGEMENT TAB ─── */}
        {activeTab === 'announcements' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* Create Announcement */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>📢 Publish Broadcasters Alert</h3>
              <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Announcement Title</label>
                  <input type="text" required value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Maintenance alert, Policy updates..." style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Content details</label>
                  <textarea required value={annContent} onChange={e => setAnnContent(e.target.value)} rows={4} placeholder="Please log out of your terminals before 12:00 UTC..." style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Target audience</label>
                    <select value={annTargetType} onChange={e => setAnnTargetType(e.target.value as any)} style={{ width: '100%', padding: '9px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                      <option value="All">All Companies</option>
                      <option value="Selected">Selected Company Only</option>
                    </select>
                  </div>
                  {annTargetType === 'Selected' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Select Company Target</label>
                      <select value={annTargetComp} onChange={e => setAnnTargetComp(e.target.value)} style={{ width: '100%', padding: '9px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                        <option value="">— Select Target —</option>
                        {db.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Schedule Announcement (Optional)</label>
                  <input type="datetime-local" value={annSchedule} onChange={e => setAnnSchedule(e.target.value)} style={{ width: '100%', padding: '9px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <button type="submit" style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>📢 Broadcast Announcement</button>
              </form>
            </div>

            {/* List announcements */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>Announcements Board</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {announcements.map(ann => (
                  <div key={ann.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1', position: 'relative' }}>
                    <button onClick={() => handleDeleteAnnouncement(ann.id)} style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>🗑️</button>
                    <strong style={{ fontSize: '0.92rem' }}>{ann.title}</strong>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#475569' }}>{ann.content}</p>
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#64748b' }}>
                      Target: {ann.targetType === 'All' ? 'All Companies' : `Company ID: ${ann.targetCompanyId}`} • Date: {ann.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ─── 7. SUPPORT TICKETS TAB ─── */}
        {activeTab === 'support' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* Tickets table */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>🎫 Active Support Tickets</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => setActiveTicket(t)}
                    style={{
                      padding: '16px', borderRadius: '12px', border: `1.5px solid ${activeTicket?.id === t.id ? '#2563eb' : '#cbd5e1'}`,
                      background: '#f8fafc', cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{t.subject}</strong>
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800', background: t.status === 'Open' ? '#fef3c7' : '#dcfce7', color: t.status === 'Open' ? '#b45309' : '#15803d' }}>{t.status}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Company: {t.company} • Date: {t.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket responder view */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
              {activeTicket ? (
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>Ticket Responder</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>ID: {activeTicket.id} • Company: {activeTicket.company}</div>
                  
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '0.88rem' }}>
                    <strong>Message:</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#334155' }}>{activeTicket.message}</p>
                  </div>

                  {activeTicket.history && activeTicket.history.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Replies History:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                        {activeTicket.history.map((h, i) => (
                          <div key={i} style={{ padding: '10px', borderRadius: '8px', background: h.sender === 'Super Admin' ? '#eff6ff' : '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
                            <strong>{h.sender}:</strong> {h.message}
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{h.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTicket.status === 'Open' ? (
                    <form onSubmit={handleTicketReplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <textarea required value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="Type your reply to company admin..." style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }} />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Reply Ticket</button>
                        <button type="button" onClick={() => handleCloseTicket(activeTicket.id)} style={{ padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Close Ticket</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ padding: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '700', textAlign: 'center' }}>Ticket Closed & Resolved</div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <span style={{ fontSize: '3rem' }}>🎫</span>
                  <p style={{ margin: '10px 0 0 0' }}>Select a ticket from the left panel to reply or resolve.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ─── 8. AUDIT LOGS TAB ─── */}
        {activeTab === 'audit-logs' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>📜 Central platform Audit Trails & Activities</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '10px', color: '#64748b' }}>Date/Time</th>
                  <th style={{ padding: '10px', color: '#64748b' }}>Scope</th>
                  <th style={{ padding: '10px', color: '#64748b' }}>Action Event</th>
                  <th style={{ padding: '10px', color: '#64748b' }}>Event Description</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', color: '#64748b' }}>{l.date}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', background: l.type === 'Platform' ? '#eff6ff' : '#faf5ff', color: l.type === 'Platform' ? '#2563eb' : '#6b21a8' }}>
                        {l.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: '700', color: '#b45309' }}>{l.action}</td>
                    <td style={{ padding: '10px', color: '#334155' }}>{l.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── 9. NOTIFICATION CENTER TAB ─── */}
        {activeTab === 'notification-center' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* OTP Hub */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>🔑 Central OTP Verification Workflows</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.8rem', color: '#64748b' }}>OTPs generated from SaaS platform endpoints and central verification status checks.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Object.entries(sentOtps).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No OTP notifications generated yet.</div>
                ) : (
                  Object.entries(sentOtps).map(([target, val]) => (
                    <div key={target} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{target}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Type: {val.type} • Sent: {val.time}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '900', color: '#0284c7', background: '#e0f2fe', padding: '4px 8px', borderRadius: '6px' }}>{val.otp}</span>
                        {val.verified ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#15803d', background: '#dcfce7', padding: '4px 8px', borderRadius: '6px' }}>Verified</span>
                        ) : (
                          <button onClick={() => handleVerifyCentralOtp(target)} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: 'none', background: '#38bdf8', color: 'white', cursor: 'pointer' }}>Verify ✓</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Centralized Notifications sender */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>✉️ Centralized Platform Messenger</h3>
              <form onSubmit={e => { e.preventDefault(); alert("Broadcast test messages sent via central notification service!"); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Recipient Address / Number</label>
                  <input type="text" required placeholder="name@domain.com or phone number..." style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Message Alert Text</label>
                  <textarea required rows={4} placeholder="Alert text goes here..." style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Alert Mode Channel</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['Email', 'SMS', 'Push Notification', 'WhatsApp'].map(m => (
                      <label key={m} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="radio" name="alertChannel" defaultChecked={m === 'Email'} />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" style={{ padding: '12px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Send central alert</button>
              </form>
            </div>

          </div>
        )}

        {/* ─── 10. GLOBAL platform SETTINGS TAB ─── */}
        {activeTab === 'global-settings' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>🌐 Global SaaS Settings Configuration</h3>
            <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Platform SaaS Name</label>
                <input type="text" value={platformName} onChange={e => setPlatformName(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Platform Logo Icon</label>
                <input type="text" value={platformLogo} onChange={e => setPlatformLogo(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>smtp server host</label>
                <input type="text" value={smtpServer} onChange={e => setSmtpServer(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>central SMTP User</label>
                <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>central Twilio gateway API endpoint</label>
                <input type="text" value={smsGatewayUrl} onChange={e => setSmsGatewayUrl(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>WhatsApp Business Endpoint Key</label>
                <input type="text" value={whatsAppApiKey} onChange={e => setWhatsAppApiKey(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Google Maps central Javascript API Key</label>
                <input type="text" value={googleMapsKey} onChange={e => setGoogleMapsKey(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <button type="submit" style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Save Settings Configuration</button>
              </div>
            </form>
          </div>
        )}

        {/* ─── 11. SECURITY TAB ─── */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: '0 0 16px 0' }}>🔐 SaaS Security Options</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {db.companies.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div>
                      <strong>{c.name}</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Admin: {c.adminEmail} • Status: {c.status}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleToggleLockCompany(c.id)} 
                        style={{
                          padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer',
                          background: lockedCompanies.includes(c.id) ? '#dcfce7' : '#fee2e2',
                          color: lockedCompanies.includes(c.id) ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {lockedCompanies.includes(c.id) ? '🔓 Unlock Portal' : '🔒 Lock Portal'}
                      </button>
                      <button onClick={() => handleResetAdminPassword(c.id, c.adminEmail)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>🔑 Force Password Reset</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── 12. BACKUP & RESTORE TAB ─── */}
        {activeTab === 'backup-restore' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>💾 SaaS database Backup & Restore</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#64748b' }}>Download full platform multi-tenant database dump in JSON, or restore from an exported file.</p>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleDownloadBackup}
                style={{ padding: '12px 20px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                📥 Export JSON Backup
              </button>
              <label 
                style={{ padding: '12px 20px', background: 'white', color: '#334155', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                📤 Upload & Restore Backup
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleRestoreBackup} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
            <div style={{ marginTop: '20px', fontSize: '0.78rem', color: '#b45309' }}>
              * Warning: Restoring database will reload the application and replace all multi-tenant databases. Ensure backup exists before restoring!
            </div>
          </div>
        )}

        {/* ─── 13. SYSTEM HEALTH TAB ─── */}
        {activeTab === 'system-health' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>❤️ System Operational status & Health</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.88rem', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <strong>Server Status:</strong> <span style={{ color: '#16a34a', fontWeight: '800' }}>{healthStats.server}</span>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <strong>Database Status:</strong> <span style={{ color: '#16a34a', fontWeight: '800' }}>{healthStats.db}</span>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <strong>Storage Used:</strong> <span>{healthStats.storage}</span>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <strong>API Health:</strong> <span style={{ color: '#16a34a', fontWeight: '800' }}>{healthStats.apiHealth}</span>
              </div>
            </div>

            <h4 style={{ margin: '0 0 12px 0' }}>Maintenance Mode</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '700' }}>
              <input type="checkbox" checked={maintenanceMode} onChange={e => {
                setMaintenanceMode(e.target.checked);
                addAuditLog('MAINTENANCE_TOGGLE', `Maintenance mode changed to ${e.target.checked}`);
              }} />
              Enable Platform Maintenance Mode (Block all store accesses)
            </label>
          </div>
        )}

      </main>

      {/* ─── MODAL: CREATE COMPANY ─── */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Create Tenant Company Portal</h3>
              <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Company Name *</label>
                <input type="text" required value={newCompName} onChange={e => setNewCompName(e.target.value)} placeholder="e.g. Fresh Cleaners" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Subdomain Slug *</label>
                  <input type="text" required value={newCompSlug} onChange={e => setNewCompSlug(e.target.value)} placeholder="e.g. fresh" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Business Type</label>
                  <select value={newCompBusinessType} onChange={e => setNewCompBusinessType(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                    <option value="Laundry">Laundry Service</option>
                    <option value="Dry Cleaners">Dry Cleaners</option>
                    <option value="Commercial">Commercial Laundry</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>GST Number</label>
                  <input type="text" value={newCompGst} onChange={e => setNewCompGst(e.target.value)} placeholder="GSTIN..." style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Logo Icon URL</label>
                  <input type="text" value={newCompLogo} onChange={e => setNewCompLogo(e.target.value)} placeholder="🏢" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Admin Email *</label>
                <input type="email" required value={newCompAdminEmail} onChange={e => setNewCompAdminEmail(e.target.value)} placeholder="admin@company.com" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Admin Password *</label>
                <input type="password" required value={newCompAdminPass} onChange={e => setNewCompAdminPass(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Address</label>
                <input type="text" value={newCompAddress} onChange={e => setNewCompAddress(e.target.value)} placeholder="123 Main St..." style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Phone Number</label>
                <input type="text" value={newCompPhone} onChange={e => setNewCompPhone(e.target.value)} placeholder="+974..." style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Create Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE ADMIN ─── */}
      {showAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Create Company Admin</h3>
              <button onClick={() => setShowAdminModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateCompanyAdmin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Select Target Company *</label>
                <select required value={adminTargetCompId} onChange={e => setAdminTargetCompId(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                  <option value="">— Select Company —</option>
                  {db.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" required value={adminName} onChange={e => setAdminName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Email Address *</label>
                <input type="email" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Password *</label>
                <input type="password" required value={adminPass} onChange={e => setAdminPass(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</label>
                  <input type="text" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Address</label>
                  <input type="text" value={adminAddress} onChange={e => setAdminAddress(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAdminModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Create Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW ADMIN PROFILE ─── */}
      {viewingAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Admin profile details</h3>
              <button onClick={() => setViewingAdmin(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>Name:</strong> {viewingAdmin.name}</div>
              <div><strong>Email:</strong> {viewingAdmin.email}</div>
              <div><strong>Phone:</strong> {viewingAdmin.phone || 'N/A'}</div>
              <div><strong>Address:</strong> {viewingAdmin.address || 'N/A'}</div>
              <div><strong>Associated Company:</strong> {viewingAdmin.companyName}</div>
              <div><strong>Status:</strong> {viewingAdmin.status}</div>
              <div><strong>Created At:</strong> {new Date(viewingAdmin.createdAt).toLocaleString()}</div>
              
              <h4 style={{ margin: '12px 0 6px 0', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>Login History</h4>
              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>🟢 Successful login: {new Date().toLocaleString()} (IP: 192.168.1.102)</div>
                <div>🟢 Successful login: {new Date(Date.now() - 24*3600*1000).toLocaleString()} (IP: 192.168.1.102)</div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setViewingAdmin(null)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: UPGRADE / RENEW SUBSCRIPTION ─── */}
      {subComp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Manage Subscription: {subComp.name}</h3>
              <button onClick={() => setSubComp(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleSubSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Subscription Tier</label>
                <select 
                  value={subTier} 
                  onChange={(e) => {
                    const tier = e.target.value as any;
                    setSubTier(tier);
                    if (tier === 'Free Trial') {
                      const target = new Date();
                      target.setDate(target.getDate() + trialDays);
                      setSubExpires(target.toISOString().split('T')[0]);
                    }
                  }} 
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '600' }}
                >
                  <option value="Free Trial">Free Trial</option>
                  <option value="Premium">Premium tier</option>
                  <option value="Enterprise">Enterprise tier</option>
                </select>
              </div>

              {subTier === 'Free Trial' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Trial Duration (Days)</label>
                  <input 
                    type="number" 
                    min={1}
                    required
                    value={trialDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setTrialDays(val);
                      const target = new Date();
                      target.setDate(target.getDate() + val);
                      setSubExpires(target.toISOString().split('T')[0]);
                    }}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Status</label>
                <select 
                  value={subStatus} 
                  onChange={(e) => setSubStatus(e.target.value as any)} 
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '600' }}
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Expiration Date</label>
                <input 
                  type="date" 
                  required
                  value={subExpires}
                  onChange={(e) => setSubExpires(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSubComp(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
