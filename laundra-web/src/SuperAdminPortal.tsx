import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, type Company, type User } from './DatabaseContext';
import { ServiceCatalogUploader } from './components/ServiceCatalogUploader';
import CompanyOnboardingWizard from './components/CompanyOnboardingWizard';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Ticket {
  id: string;
  company: string;
  subject: string;
  status: 'Open' | 'Closed';
  date: string;
  message: string;
  assignedTo?: string;
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
  userEmail?: string;
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
  maxBranches: number;
  maxStorage: number;
  maxApiRequests: number;
}

interface OTPLog {
  id: string;
  target: string;
  otp: string;
  type: string;
  time: string;
  status: 'Pending' | 'Verified';
}

export const SuperAdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { db, saveDB, createCompany, updateCompany, changeActiveCompany, token } = useDatabase();

  // Navigation main active tab matching the required SaaS workflow
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'company-mgmt'
    | 'sub-mgmt'
    | 'reports'
    | 'announcements'
    | 'support'
    | 'audit-logs'
    | 'notification-center'
    | 'global-settings'
    | 'security'
    | 'backup-restore'
    | 'system-health'
  >(() => {
    return (localStorage.getItem('ll_active_super_admin_tab') as any) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('ll_active_super_admin_tab', activeTab);
  }, [activeTab]);

  // Sub-tabs states
  const [companyMgmtSub, setCompanyMgmtSub] = useState<'companies' | 'admins' | 'monitoring' | 'services'>('companies');
  const [subMgmtSub, setSubMgmtSub] = useState<'plans' | 'trial' | 'renewals'>('plans');
  const [reportsSub, setReportsSub] = useState<'revenue' | 'conversion' | 'usage' | 'stats'>('revenue');

  // Filter & Search states
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('All');
  const [adminSearch, setAdminSearch] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState<'All' | 'Platform' | 'Company'>('All');

  // Modals state for creating company
  const [showWizard, setShowWizard] = useState(false);
  const [resumeWizardData, setResumeWizardData] = useState<{ companyId: string, step: number } | undefined>(undefined);
  const [newCompName, setNewCompName] = useState('');
  const [newCompSlug, setNewCompSlug] = useState('');
  const [newCompAdminEmail, setNewCompAdminEmail] = useState('');
  const [newCompAdminPass, setNewCompAdminPass] = useState('');
  const [newCompAddress, setNewCompAddress] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompGst, setNewCompGst] = useState('');
  const [newCompBusinessType, setNewCompBusinessType] = useState('Dry Cleaners');
  const [newCompLogo, setNewCompLogo] = useState('');

  // Modals state for editing company
  const [editingCompanyDetails, setEditingCompanyDetails] = useState<Company | null>(null);
  const [editCompName, setEditCompName] = useState('');
  const [editCompAddress, setEditCompAddress] = useState('');
  const [editCompArea, setEditCompArea] = useState('');
  const [editCompPhone, setEditCompPhone] = useState('');
  const [editCompGst, setEditCompGst] = useState('');
  const [editCompBusinessType, setEditCompBusinessType] = useState('Dry Cleaners');
  const [editCompStatus, setEditCompStatus] = useState('ACTIVE');
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPhone, setEditAdminPhone] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  // Subscription snapshot for display in edit modal
  const [editSubPlanName, setEditSubPlanName] = useState('');
  const [editSubStartDate, setEditSubStartDate] = useState('');
  const [editSubEndDate, setEditSubEndDate] = useState('');
  const [editSubPrice, setEditSubPrice] = useState<number | null>(null);
  const [editSubMaxAdmins, setEditSubMaxAdmins] = useState<number | null>(null);
  const [editSubMaxCashiers, setEditSubMaxCashiers] = useState<number | null>(null);
  const [editSubMaxDelivery, setEditSubMaxDelivery] = useState<number | null>(null);
  const [editSubMaxCustomers, setEditSubMaxCustomers] = useState<number | null>(null);
  const [editSubMaxOrders, setEditSubMaxOrders] = useState<number | null>(null);

  // Modals state for viewing company full profile
  const [viewingCompanyProfile, setViewingCompanyProfile] = useState<Company | null>(null);

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

  // SaaS Plans CRUD states
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState(0);
  const [newPlanAdmins, setNewPlanAdmins] = useState(3);
  const [newPlanCashiers, setNewPlanCashiers] = useState(5);
  const [newPlanDelivery, setNewPlanDelivery] = useState(10);
  const [newPlanCustomers, setNewPlanCustomers] = useState(5000);
  const [newPlanOrders, setNewPlanOrders] = useState(5000);
  const [newPlanValidity, setNewPlanValidity] = useState(30);
  const [newPlanStartDate, setNewPlanStartDate] = useState('');
  const [newPlanEndDate, setNewPlanEndDate] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Central Centralized OTP management state
  const [otpLogs, setOtpLogs] = useState<OTPLog[]>(() => {
    try { return JSON.parse(localStorage.getItem('ll_otp_logs') || '[]'); } catch { return []; }
  });

  // --- Phase 1: Backend Integration State ---
  const [backendCompanies, setBackendCompanies] = useState<any[]>([]);
  const [backendMetrics, setBackendMetrics] = useState<any>(null);
  const [backendAdmins, setBackendAdmins] = useState<any[]>([]);
  const [backendAnnouncements, setBackendAnnouncements] = useState<any[]>([]);
  const [backendAuditLogs, setBackendAuditLogs] = useState<any[]>([]);
  const [backendTickets, setBackendTickets] = useState<any[]>([]);
  const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

  const fetchBackendData = async () => {
    if (!token) return;
    try {
      const [metricsRes, compsRes, adminsRes, annsRes, logsRes, tktsRes, plansRes, settingsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/saas-admin/metrics`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/saas-admin/companies`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/saas-admin/admins`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/saas-admin/announcements`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/saas-admin/audit-logs`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/support/tickets`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/saas/plans`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/v1/saas-admin/settings`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (metricsRes.ok) setBackendMetrics(await metricsRes.json());
      if (compsRes.ok) setBackendCompanies(await compsRes.json());
      if (adminsRes.ok) setBackendAdmins(await adminsRes.json());
      if (annsRes.ok) setBackendAnnouncements(await annsRes.json());
      if (logsRes.ok) setBackendAuditLogs(await logsRes.json());
      if (tktsRes.ok) setBackendTickets(await tktsRes.json());
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.platform_name) setPlatformName(settingsData.platform_name);
        if (settingsData.logo_url) setPlatformLogo(settingsData.logo_url);
        if (settingsData.smtp_host) setSmtpServer(settingsData.smtp_host);
        if (settingsData.smtp_port) setSmtpPort(settingsData.smtp_port);
        if (settingsData.smtp_username) setSmtpUser(settingsData.smtp_username);
        if (settingsData.smtp_password) setSmtpPassword(settingsData.smtp_password);
        if (settingsData.sms_api_key) setSmsGatewayUrl(settingsData.sms_api_key);
        if (settingsData.whatsapp_api_key) setWhatsAppApiKey(settingsData.whatsapp_api_key);
        if (settingsData.google_maps_api_key) setGoogleMapsKey(settingsData.google_maps_api_key);
      }
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        const mappedPlans = plansData.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          billingCycle: p.billing_cycle,
          maxAdmins: p.max_admins,
          maxCashiers: p.max_cashiers,
          maxDeliveryStaff: p.max_delivery_staff,
          maxCustomers: p.max_customers,
          maxOrdersPerMonth: p.max_orders_per_month,
          maxBranches: 1,
          maxStorage: p.max_storage_mb,
          maxApiRequests: p.max_api_requests
        }));
        setPlans(mappedPlans);
        localStorage.setItem('ll_saas_plans', JSON.stringify(mappedPlans));
      }
    } catch (e) {
      console.error('Failed to fetch SaaS admin backend data:', e);
    }
  };

  useEffect(() => {
    // Clear any leftover impersonation states when loading the Super Admin portal
    localStorage.removeItem('ll_impersonatedCompanyId');
    localStorage.removeItem('ll_active_workspace');
    localStorage.removeItem('ll_activerole');
    fetchBackendData();
  }, [token]);

  useEffect(() => {
    if (newPlanStartDate && newPlanEndDate) {
      const start = new Date(newPlanStartDate);
      const end = new Date(newPlanEndDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setNewPlanValidity(diffDays);
      }
    }
  }, [newPlanStartDate, newPlanEndDate]);
  // ------------------------------------------

  // Company monitoring active state (Read-only views)
  const [monitoredCompId, setMonitoredCompId] = useState<string>('');
  const [monitoredData, setMonitoredData] = useState<{
    users: any[];
    customers: any[];
    orders: any[];
    drawerCash: number;
  } | null>(null);
  const [monitoringTab, setMonitoringTab] = useState<'info' | 'customers' | 'cashiers' | 'delivery' | 'orders' | 'payments'>('info');

  // Specific monitoring details modals
  const [viewingMonitoredCustomer, setViewingMonitoredCustomer] = useState<any | null>(null);
  const [viewingMonitoredOrder, setViewingMonitoredOrder] = useState<any | null>(null);

  // Edit Subscription state
  const [subComp, setSubComp] = useState<Company | null>(null);
  const [subTier, setSubTier] = useState<'Free Trial' | 'Premium' | 'Enterprise'>('Free Trial');
  const [subStatus, setSubStatus] = useState<'Active' | 'Expired'>('Active');
  const [subExpires, setSubExpires] = useState('');
  const [trialDays, setTrialDays] = useState(30);

  // Renewal modal state
  const [renewComp, setRenewComp] = useState<any | null>(null);
  const [renewNewEndDate, setRenewNewEndDate] = useState('');
  const [renewAmount, setRenewAmount] = useState(0);
  const [renewLoading, setRenewLoading] = useState(false);

  // Edit Subscription modal state
  const [editSubCompany, setEditSubCompany] = useState<any | null>(null);
  const [esPrice, setEsPrice] = useState(0);
  const [esPlanName, setEsPlanName] = useState('');
  const [esMaxAdmins, setEsMaxAdmins] = useState(1);
  const [esMaxCashiers, setEsMaxCashiers] = useState(0);
  const [esMaxDelivery, setEsMaxDelivery] = useState(0);
  const [esMaxCustomers, setEsMaxCustomers] = useState(100);
  const [esMaxOrders, setEsMaxOrders] = useState(100);
  const [esLoading, setEsLoading] = useState(false);

  // Local storage tables states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Announcements form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargetType, setAnnTargetType] = useState<'ALL' | 'ADMINS' | 'CUSTOMERS' | 'DELIVERY_BOYS'>('ALL');
  const [annTargetComp, setAnnTargetComp] = useState('');
  const [annSchedule, setAnnSchedule] = useState('');

  // Support ticket replies & assignments
  const [replyText, setReplyText] = useState('');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  // Global settings state
  const [platformName, setPlatformName] = useState('Laundra Cloud SaaS');
  const [platformLogo, setPlatformLogo] = useState('🪐');
  const supportEmail = 'support@laundra.com';
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [smtpServer, setSmtpServer] = useState('smtp.central-notifications.laundra.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('notifications@laundra.com');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smsGatewayUrl, setSmsGatewayUrl] = useState('https://api.sms-gateway.laundra.com/v1');
  const [whatsAppApiKey, setWhatsAppApiKey] = useState('wa_api_live_9a3j...');
  const [googleMapsKey, setGoogleMapsKey] = useState('AIzaSy...');
  const [emailTemplate, setEmailTemplate] = useState('Hi {{name}}, your verification OTP is {{otp}}.');
  
  // Security locks & simulated failed login attempts
  const [lockedCompanies, setLockedCompanies] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ll_locked_companies') || '[]'); } catch { return []; }
  });
  const failedAttemptsLog = [
    { id: 'f-1', target: 'admin@bhanu.com', ip: '102.15.22.45', time: new Date(Date.now() - 3600 * 1000).toLocaleString() },
    { id: 'f-2', target: 'staff@laundra.com', ip: '201.88.92.11', time: new Date(Date.now() - 7200 * 1000).toLocaleString() }
  ];
  const [blockedIps, setBlockedIps] = useState<string[]>(['201.88.92.11']);

  // System status mock
  const healthStats = {
    server: 'Online',
    db: 'Healthy (11ms latency)',
    storage: '320 MB / 10 GB',
    apiHealth: '100% Operational',
    lastBackup: 'Today, 03:00 AM'
  };
  const [autoBackupSchedule, setAutoBackupSchedule] = useState('Daily');

  // Add system log helper
  const addAuditLog = (action: string, description: string, type: 'Platform' | 'Company' = 'Platform', companyId?: string, userEmail?: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now(),
      action,
      description,
      date: new Date().toLocaleString(),
      type,
      companyId,
      userEmail
    };
    const nextLogs = [newLog, ...auditLogs];
    setAuditLogs(nextLogs);
    localStorage.setItem('ll_platform_audit_logs', JSON.stringify(nextLogs));
  };

  // Load mock dataset from LocalStorage
  useEffect(() => {
    // Tickets
    const savedTickets = localStorage.getItem('ll_platform_tickets');
    if (savedTickets) {
      setTickets(JSON.parse(savedTickets));
    } else {
      const initialTickets: Ticket[] = [
        { id: 'tkt-1', company: 'Laundra HQ', subject: 'Central SMS Gateway integration', status: 'Open', date: '2026-07-04', message: 'SMS notifications are taking over 5 seconds to deliver. Is Twilio server overloaded?', assignedTo: 'Agent Sarah', history: [] },
        { id: 'tkt-2', company: 'bhanu company', subject: 'GST invoice format setup', status: 'Closed', date: '2026-07-03', message: 'How do we enable QR codes on standard PDF receipt printouts?', assignedTo: 'Agent Alex', history: [{ sender: 'Super Admin', message: 'We have enabled invoiceModule and qrCode modules for your company. You can configure them in Settings.', date: '2026-07-03' }] }
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
  }, []);

  // Sync states to LocalStorage


  useEffect(() => {
    localStorage.setItem('ll_otp_logs', JSON.stringify(otpLogs));
  }, [otpLogs]);

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

  const handleImpersonate = (companyId: string, companyName: string) => {
    if (confirm(`Are you sure you want to log in as Admin for ${companyName}?`)) {
      localStorage.setItem('ll_impersonatedCompanyId', companyId);
      localStorage.setItem('ll_active_workspace', 'admin');
      localStorage.setItem('ll_activerole', 'Admin');
      changeActiveCompany(companyId);
      navigate('/admin');
    }
  };

  const handleToggleSuspension = async (company: any) => {
    const nextStatus = company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${company.id}/status?status=${nextStatus}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        addAuditLog('COMPANY_SUSPEND_TOGGLE', `Changed status of company ${company.name} (${company.id}) to ${nextStatus}`);
        fetchBackendData(); // Refresh list
      } else {
        alert('Failed to update company status');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating company status');
    }
  };

  const handleHardDeleteCompany = async (company: Company) => {
    if (confirm(`⚠️ WARNING: Are you sure you want to completely delete company "${company.name}" and all of its associated users, subscriptions, and data from the database? This action cannot be undone.`)) {
      try {
        const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${company.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok || res.status === 404) {
          // We also remove it from local state
          const updatedCompanies = db.companies.filter(c => c.id !== company.id);
          saveDB({ companies: updatedCompanies });
          setBackendCompanies(prev => prev.filter(c => c.id !== company.id));
          addAuditLog('COMPANY_HARD_DELETE', `Completely deleted company ${company.name} and all data from database`);
        } else {
          alert('Failed to delete from backend: ' + await res.text());
        }
      } catch (err) {
        console.error('Delete error', err);
        // Fallback to local delete
        const updatedCompanies = db.companies.filter(c => c.id !== company.id);
        saveDB({ companies: updatedCompanies });
        setBackendCompanies(prev => prev.filter(c => c.id !== company.id));
      }
    }
  };

  const handleToggleLockCompany = (companyId: string) => {
    let next;
    if (lockedCompanies.includes(companyId)) {
      next = lockedCompanies.filter(id => id !== companyId);
      addAuditLog('COMPANY_UNLOCK', `Security: Unlocked company portal ${companyId}`);
    } else {
      next = [...lockedCompanies, companyId];
      addAuditLog('COMPANY_LOCK', `Security: Locked company portal ${companyId} due to security risk`);
    }
    setLockedCompanies(next);
  };

  const handleToggleAdminStatus = (companyId: string, email: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    const nextUsers = JSON.parse(localStorage.getItem(`ll_${companyId}_users`) || '[]');
    const updated = nextUsers.map((u: any) => u.email === email ? { ...u, status: nextStatus } : u);
    localStorage.setItem(`ll_${companyId}_users`, JSON.stringify(updated));
    addAuditLog('COMPANY_ADMIN_STATUS', `Security: toggled status of ${email} to ${nextStatus}`);
  };

  // Central Notification OTP generator
  const triggerCentralOtp = (target: string, type: 'Company Admin Verification' | 'Customer Email Verification' | 'Delivery Staff Account Activation' | 'Password Reset') => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const newLog: OTPLog = {
      id: 'otp-' + Date.now(),
      target,
      otp,
      type,
      time: new Date().toLocaleTimeString(),
      status: 'Pending'
    };
    setOtpLogs(prev => [newLog, ...prev]);
    addAuditLog('NOTIFICATION_OTP_SEND', `Sent central ${type} OTP to ${target} via centralised Notification service.`);
    alert(`[Centralised Notification System Hub]\nCentralised OTP sent to: ${target}\nOTP Code: ${otp}\nType: ${type}`);
  };

  const handleVerifyCentralOtp = (target: string) => {
    setOtpLogs(prev => prev.map(o => o.target === target ? { ...o, status: 'Verified' as const } : o));
    addAuditLog('NOTIFICATION_OTP_VERIFIED', `Successfully verified central OTP for: ${target}`);
    alert(`Central OTP for ${target} successfully verified!`);
  };

  // Create Company Submit
  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
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

    const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      // 1. Create Company via Backend
      const createCompRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: newCompPhone || 'N/A',
          address: newCompAddress || undefined,
          gst_number: newCompGst || undefined,
          business_type: newCompBusinessType,
          logo: newCompLogo || undefined
        })
      });

      if (!createCompRes.ok) {
        const errorData = await createCompRes.json();
        throw new Error(errorData.detail || 'Failed to create company on backend');
      }
      
      const companyData = await createCompRes.json();
      const companyId = companyData.id;

      // 2. Trigger the real OTP email for the Admin
      const otpRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/admins/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: email })
      });

      if (!otpRes.ok) {
        throw new Error('Company created, but failed to send admin OTP.');
      }

      const otpData = await otpRes.json();
      const otp = otpData.otp_debug; // Read the generated OTP to bypass verification for Super Admin

      // 3. Finalize Admin Creation
      const adminRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Company Admin',
          email: email,
          phone: newCompPhone || 'N/A',
          password: pass,
          otp: otp
        })
      });

      if (!adminRes.ok) {
        const errorData = await adminRes.json();
        throw new Error(errorData.detail || 'Company created, but failed to create admin user.');
      }

      // Sync with local mock state for UI consistency until fully migrated
      createCompany(name, slug, email, pass, newCompAddress, newCompPhone, newCompGst, newCompBusinessType, newCompLogo);
      addAuditLog('COMPANY_CREATE', `Created company "${name}" under /${slug} endpoint with administrator login ${email} via Backend integration`);

      alert(`Success! Company created and Welcome OTP email sent to ${email}`);

      setNewCompName('');
      setNewCompSlug('');
      setNewCompAdminEmail('');
      setNewCompAdminPass('');
      setNewCompAddress('');
      setNewCompPhone('');
      setNewCompGst('');
      setNewCompBusinessType('Dry Cleaners');
      setNewCompLogo('');
      setShowWizard(false);

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Edit Company Details Submit
  const handleEditCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompanyDetails) return;

    try {
      const compRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${editingCompanyDetails.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCompName,
          phone: editCompPhone,
          address: editCompAddress,
          area: editCompArea,
          gst_number: editCompGst,
          business_type: editCompBusinessType
        })
      });
      if (!compRes.ok) throw new Error('Failed to update company details');

      const statusRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${editingCompanyDetails.id}/status?status=${editCompStatus.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statusRes.ok) throw new Error('Failed to update company status');

      const admin = backendAdmins.find((a: any) => a.tenant_id === editingCompanyDetails.id);
      if (admin) {
        const adminRes = await fetch(`${BASE_URL}/api/v1/saas-admin/admins/${admin.id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editAdminName,
            phone: editAdminPhone
          })
        });
        if (!adminRes.ok) throw new Error('Failed to update admin details');
      }

      addAuditLog('COMPANY_DETAILS_EDIT', `Updated company details for: ${editCompName}`);
      setEditingCompanyDetails(null);
      fetchBackendData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Create Company Admin Submit
  const handleCreateCompanyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTargetCompId) return;
    
    const nextUsers = JSON.parse(localStorage.getItem(`ll_${adminTargetCompId}_users`) || '[]');
    const adminLimit = db.companies.find(c => c.id === adminTargetCompId)?.limits?.maxAdmins || 3;
    const currentAdmins = nextUsers.filter((u: any) => u.role === 'admin').length;
    
    if (currentAdmins >= adminLimit) {
      alert(`Limit Block: Company has reached max admin limit (${adminLimit}). Cannot create more admins.`);
      return;
    }

    const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      // 1. Send OTP email via backend
      const otpRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${adminTargetCompId}/admins/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: adminEmail })
      });

      if (!otpRes.ok) {
        throw new Error('Failed to send admin OTP via backend.');
      }

      const otpData = await otpRes.json();
      const otp = otpData.otp_debug;

      // 2. Create the Admin using the backend
      const adminRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${adminTargetCompId}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          phone: adminPhone || 'N/A',
          password: adminPass,
          otp: otp
        })
      });

      if (!adminRes.ok) {
        const errorData = await adminRes.json();
        throw new Error(errorData.detail || 'Failed to create admin user on backend.');
      }

      // Keep local state in sync until fully migrated
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
      addAuditLog('COMPANY_ADMIN_CREATE', `Created new company admin ${adminEmail} for company ${adminTargetCompId} via Backend API`, 'Company', adminTargetCompId);

      alert(`Success! Admin created and Welcome OTP email sent to ${adminEmail}`);

      setAdminName('');
      setAdminEmail('');
      setAdminPass('');
      setAdminPhone('');
      setAdminAddress('');
      setShowAdminModal(false);

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
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

  // Subscription manager saving
  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subComp) return;

    let targetDate = new Date(subExpires);
    if (subTier === 'Free Trial') {
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + trialDays);
    }
    const days = Math.max(1, Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)));

    let planName = subTier.toUpperCase().replace(/ /g, '_');

    try {
      await fetch(`${BASE_URL}/api/v1/saas-admin/subscriptions/${subComp.id}/assign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_name: planName, days })
      });
      addAuditLog('SUBSCRIPTION_UPDATE', `Updated company ${subComp.name} subscription to ${subTier}, Days: ${days}`);
      fetchBackendData();
      setSubComp(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update subscription');
    }
    setSubComp(null);
  };

  // SaaS Pricing Plans CRUD
  const handleCreateSaaSPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName) return;

    const payload = {
      name: newPlanName,
      price: newPlanPrice,
      billing_cycle: 'MONTHLY',
      max_admins: newPlanAdmins,
      max_cashiers: newPlanCashiers,
      max_delivery_staff: newPlanDelivery,
      max_customers: newPlanCustomers,
      max_orders_per_month: newPlanOrders
    };

    try {
      if (editingPlanId) {
        const res = await fetch(`${BASE_URL}/api/v1/saas/plans/${editingPlanId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          addAuditLog('SAAS_PLAN_UPDATE', `Updated SaaS Pricing Plan: ${newPlanName}`);
        } else {
          const errData = await res.json();
          alert(`Error: ${errData.detail || 'Failed to update plan'}`);
          return;
        }
      } else {
        const res = await fetch(`${BASE_URL}/api/v1/saas/plans`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          addAuditLog('SAAS_PLAN_CREATE', `Created new SaaS Pricing Plan: ${newPlanName}`);
        } else {
          const errData = await res.json();
          alert(`Error: ${errData.detail || 'Failed to create plan'}`);
          return;
        }
      }
      
      fetchBackendData();
      setEditingPlanId(null);
      setNewPlanName('');
      setNewPlanPrice(0);
      setNewPlanAdmins(3);
      setNewPlanCashiers(5);
      setNewPlanDelivery(10);
      setNewPlanCustomers(5000);
      setNewPlanOrders(5000);
      setNewPlanValidity(30);
      setNewPlanStartDate('');
      setNewPlanEndDate('');
    } catch (err) {
      console.error(err);
      alert('Failed to save SaaS plan');
    }
  };

  const handleEditPlanClick = (p: SaaSPlan) => {
    setEditingPlanId(p.id);
    setNewPlanName(p.name);
    setNewPlanPrice(p.price);
    setNewPlanAdmins(p.maxAdmins);
    setNewPlanCashiers(p.maxCashiers);
    setNewPlanDelivery(p.maxDeliveryStaff);
    setNewPlanCustomers(p.maxCustomers);
    setNewPlanOrders(p.maxOrdersPerMonth);
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Delete this SaaS pricing plan?')) {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/saas/plans/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          addAuditLog('SAAS_PLAN_DELETE', `Deleted SaaS Plan ID: ${id}`);
          fetchBackendData();
        } else {
          const errData = await res.json();
          alert(`Error: ${errData.detail || 'Failed to delete plan'}`);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to delete SaaS plan');
      }
    }
  };

  // Feature Toggling
  const handleFeatureToggle = async (companyId: string, featureName: string, value: boolean) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/features/${featureName}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: value })
      });
      if (res.status === 404 && value) {
        await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/features`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature_key: featureName })
        });
      }
      addAuditLog('FEATURE_TOGGLE', `Updated features for company (${companyId}): ${featureName} is now ${value ? 'Enabled' : 'Disabled'}`);
      fetchBackendData();
    } catch (e) { console.error(e); }
  };

  // Limit Change
  const handleLimitChange = (companyId: string, limitKey: string, value: number) => {
    // Limits are tied to subscription plans in the new backend, keeping this as UI-only for now
  };

  const quickUpdateSubStatus = async (companyId: string, status: string) => {
    try {
      await fetch(`${BASE_URL}/api/v1/saas-admin/subscriptions/${companyId}/status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchBackendData();
    } catch (e) { console.error(e); }
  };

  const quickAssignSub = async (companyId: string, planName: string, days: number) => {
    try {
      await fetch(`${BASE_URL}/api/v1/saas-admin/subscriptions/${companyId}/assign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_name: planName, days })
      });
      fetchBackendData();
    } catch (e) { console.error(e); }
  };

  // Broadcast announcements
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    if (!annTargetComp) {
      alert('Please select a target company.');
      return;
    }

    let targetCompanies: string | undefined = undefined;
    if (annTargetComp && annTargetComp !== 'ALL') {
      targetCompanies = annTargetComp;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/announcements`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          status: 'PUBLISHED',
          target_audience: annTargetType,
          target_companies: targetCompanies,
          scheduled_at: annSchedule ? new Date(annSchedule).toISOString() : null
        })
      });
      if (res.ok) {
        addAuditLog('ANNOUNCEMENT_CREATE', `Created broadcast announcement: ${annTitle}`);
        setAnnTitle('');
        setAnnContent('');
        setAnnSchedule('');
        setAnnTargetComp('');
        fetchBackendData();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create announcement');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addAuditLog('ANNOUNCEMENT_DELETE', `Deleted broadcast announcement ID: ${id}`);
        fetchBackendData();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete announcement');
    }
  };

  // Support ticket replies & assignments
  const handleTicketReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${activeTicket.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ response: replyText.trim() })
      });
      if (res.ok) {
        setReplyText('');
        addAuditLog('TICKET_REPLY', `Sent reply to support ticket ID: ${activeTicket.id}`);
        fetchBackendData();
        setActiveTicket(null);
      } else {
        alert('Failed to send reply');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handleAssignTicket = (ticketId: string, agent: string) => {
    const next = tickets.map(t => t.id === ticketId ? { ...t, assignedTo: agent } : t);
    setTickets(next);
    localStorage.setItem('ll_platform_tickets', JSON.stringify(next));
    setActiveTicket(next.find(t => t.id === ticketId) || null);
    addAuditLog('TICKET_ASSIGN', `Assigned support ticket ID: ${ticketId} to ${agent}`);
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/support/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addAuditLog('TICKET_CLOSE', `Closed ticket ID: ${ticketId}`);
        fetchBackendData();
        setActiveTicket(null);
      } else {
        alert('Failed to close ticket');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      platform_name: platformName,
      support_email: supportEmail,
      maintenance_mode: maintenanceMode,
      logo_url: platformLogo,
      smtp_host: smtpServer,
      smtp_port: smtpPort,
      smtp_username: smtpUser,
      smtp_password: smtpPassword,
      sms_api_key: smsGatewayUrl,
      whatsapp_api_key: whatsAppApiKey,
      google_maps_api_key: googleMapsKey
    };
    try {
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        localStorage.setItem('ll_platform_settings', JSON.stringify({ platformName, supportEmail, maintenanceMode, smtpServer, smtpUser, smsGatewayUrl, whatsAppApiKey, googleMapsKey, emailTemplate }));
        addAuditLog('SETTINGS_UPDATE', 'Updated global developer configurations & central templates');
        fetchBackendData();
        alert('Global settings saved successfully to the backend!');
      } else {
        alert('Failed to save global settings');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving global settings');
    }
  };

  // Block IPs & suspicious targets
  const handleBlockIp = (ip: string) => {
    if (!blockedIps.includes(ip)) {
      setBlockedIps([...blockedIps, ip]);
      addAuditLog('SECURITY_IP_BLOCK', `Blocked suspicious IP: ${ip}`);
      alert(`IP address ${ip} has been blocked.`);
    }
  };

  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `laundra_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addAuditLog('SETTINGS_UPDATE', 'Super Admin downloaded database backup');
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.companies && parsed.users) {
            saveDB(parsed);
            alert('Database restored successfully!');
            addAuditLog('SETTINGS_UPDATE', 'Super Admin restored database from backup file');
          } else {
            alert('Invalid backup file structure!');
          }
        } catch {
          alert('Error parsing JSON backup file!');
        }
      };
    }
  };

  // Platform wide stats
  const totalCompaniesCount = backendMetrics?.companies?.total || 0;
  const activeCompaniesCount = backendMetrics?.companies?.active || 0;
  const suspendedCompaniesCount = backendMetrics?.companies?.suspended || 0;
  const freeTrialCompaniesCount = backendMetrics?.companies?.on_free_trial || 0;
  const expiredSubsCount = backendMetrics?.companies?.expired_subscriptions || 0;
  
  const totalAdmins = backendMetrics?.users?.admins || 0;
  const totalCashiers = backendMetrics?.users?.cashiers || 0;
  const totalDelivery = backendMetrics?.users?.delivery_staff || 0;
  const totalCustomers = backendMetrics?.users?.customers || 0;
  const totalOrders = backendMetrics?.platform?.total_orders || 0;
  const totalPlatformRevenue = backendMetrics?.platform?.monthly_recurring_revenue || 0;

  // Filtered lists
  const filteredCompanies = backendCompanies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(companySearch.toLowerCase());
    const matchesStatus = companyStatusFilter === 'All' || c.status === companyStatusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ─── SIDEBAR NAVIGATION ─── */}
      <aside style={{ width: '270px', background: '#ffffff', color: '#1e293b', display: 'flex', flexDirection: 'column', padding: '24px 0', borderRight: '1px solid #e2e8f0', boxShadow: '2px 0 8px rgba(0,0,0,0.02)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{platformLogo}</span> {platformName}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform Super Admin</p>
        </div>

        <ul style={{ listStyle: 'none', padding: '20px 16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
            { id: 'company-mgmt', label: 'Company Management', icon: '🏢' },
            { id: 'sub-mgmt', label: 'Subscription Mgmt', icon: '💳' },
            { id: 'reports', label: 'Platform Reports', icon: '📈' },
            { id: 'announcements', label: 'Announcements', icon: '📢' },
            { id: 'support', label: 'Support Management', icon: '🎫' },
            { id: 'audit-logs', label: 'Audit Logs', icon: '📜' },
            { id: 'global-settings', label: 'Global Settings', icon: '⚙️' }
          ].map(tab => (
            <li 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '11px 14px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: activeTab === tab.id ? '#eff6ff' : 'transparent',
                color: activeTab === tab.id ? '#2563eb' : '#475569',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#1e293b';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span> {tab.label}
              </span>
              {tab.id === 'support' && backendTickets.filter(t => t.status === 'OPEN').length > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800' }}>
                  {backendTickets.filter(t => t.status === 'OPEN').length}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button 
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1.5px solid #fca5a5',
              background: '#fef2f2',
              color: '#ef4444',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
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
              {activeTab === 'reports' && 'Generate SaaS platform analytics, conversion rates, and usage reports.'}
              {activeTab === 'announcements' && 'Publish centralized announcements to selected or all companies.'}
              {activeTab === 'support' && 'Address support tickets opened by company administrators.'}
              {activeTab === 'audit-logs' && 'Platform security audit trail and tenant activity logs.'}
              {activeTab === 'global-settings' && 'Configure platforms global SMTP, Templates, Gateway configurations.'}
              {activeTab === 'security' && 'Manage portal lockouts, block suspicious accounts, and audit log protection.'}
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
                  {backendCompanies.slice(-4).reverse().map(c => {
                    const admin = backendAdmins.find((a: any) => a.tenant_id === c.id);
                    const adminEmail = admin?.email || c.email || 'N/A';
                    const planName = c.subscription?.tier || 'None';
                    const expiry = c.subscription?.expiresAt || 'N/A';
                    return (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>{c.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{adminEmail} • Expiry: {expiry}</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px' }}>{planName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent activities platform level */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '800' }}>📜 Recent Activity Logs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {backendAuditLogs.slice(0, 4).map(l => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: '800', color: '#d97706', fontSize: '0.78rem', marginRight: '8px' }}>{l.action}</span>
                        <span style={{ fontSize: '0.82rem', color: '#334155' }}>{l.details || l.module}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(l.created_at).toLocaleString()}</span>
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

                { id: 'services', label: 'Service Catalog Engine', icon: '📦' }
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                    <input 
                      type="text" 
                      value={companySearch} 
                      onChange={e => setCompanySearch(e.target.value)} 
                      placeholder="🔍 Search companies..." 
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', width: '250px', outline: 'none' }} 
                    />
                    <select 
                      value={companyStatusFilter} 
                      onChange={e => setCompanyStatusFilter(e.target.value)} 
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none' }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                  <button onClick={() => setShowWizard(true)} style={{ padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>➕ Create Company</button>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Company Name</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Admin Name</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Admin Phone</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Admin Email</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Status</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map(c => {
                        const admin = backendAdmins.find((u: any) => u.tenant_id === c.id);
                        return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div>
                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{c.name}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600' }}>
                            {admin?.name || 'No Admin'}
                          </td>
                          <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                            {admin?.phone || 'N/A'}
                          </td>
                          <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                            {admin?.email || c.email || 'N/A'}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800', background: c.status === 'Active' || c.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: c.status === 'Active' || c.status === 'ACTIVE' ? '#15803d' : '#b91c1c' }}>{c.status}</span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {c.status === 'ONBOARDING' && (
                                <button onClick={() => {
                                  const hasSub = !!c.subscription;
                                  const step = hasSub ? 6 : 3;
                                  setResumeWizardData({ companyId: c.id, step });
                                  setShowWizard(true);
                                }} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #eab308', background: '#fef08a', color: '#854d0e', cursor: 'pointer' }}>🚀 Resume Setup</button>
                              )}
                              <button onClick={() => setViewingCompanyProfile(c)} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>👁️ Profile</button>
                              <button onClick={() => handleImpersonate(c.id, c.name)} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #0284c7', background: '#f0f9ff', color: '#0284c7', cursor: 'pointer' }}>🔑 Impersonate</button>
                              <button onClick={() => handleResetAdminPassword(c.id, admin?.email || c.email || '')} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>🔁 Reset Pass</button>
                              <button onClick={() => { 
                                setEditingCompanyDetails(c);
                                setEditCompName(c.name || '');
                                setEditCompAddress(c.address || '');
                                setEditCompArea(c.area || '');
                                setEditCompPhone(c.phone || '');
                                setEditCompGst(c.gst_number || '');
                                setEditCompBusinessType(c.business_type || 'Dry Cleaners');
                                setEditCompStatus(c.status || 'ACTIVE');
                                // Pre-fill subscription snapshot
                                setEditSubPlanName(c.subscription?.tier || '');
                                setEditSubStartDate(c.subscription?.startDate || '');
                                setEditSubEndDate(c.subscription?.expiresAt || '');
                                setEditSubPrice(c.subscription?.price ?? null);
                                setEditSubMaxAdmins(c.subscription?.maxAdmins ?? null);
                                setEditSubMaxCashiers(c.subscription?.maxCashiers ?? null);
                                setEditSubMaxDelivery(c.subscription?.maxDeliveryStaff ?? null);
                                setEditSubMaxCustomers(c.subscription?.maxCustomers ?? null);
                                setEditSubMaxOrders(c.subscription?.maxOrdersPerMonth ?? null);
                                const a = backendAdmins.find((a: any) => a.tenant_id === c.id);
                                setEditAdminName(a?.name || '');
                                setEditAdminPhone(a?.phone || '');
                                setEditAdminEmail(a?.email || c.email || '');
                              }} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>✏️ Edit</button>
                              {c.id !== 'comp-default' && (
                                <button onClick={() => handleHardDeleteCompany(c)} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: '700', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>🗑️ Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View: Services (Excel Import) */}
            {companyMgmtSub === 'services' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Select Tenant Company for Service Import</label>
                  <select value={monitoredCompId} onChange={e => setMonitoredCompId(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', width: '100%', maxWidth: '400px', outline: 'none' }}>
                    <option value="">— Select Company —</option>
                    {backendCompanies.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.slug || c.id})</option>)}
                  </select>
                </div>
                {monitoredCompId && (
                  <ServiceCatalogUploader companyId={monitoredCompId} />
                )}
              </div>
            )}

          </div>
        )}

        {/* ─── 3. SUBSCRIPTION MANAGEMENT TAB ─── */}
        {activeTab === 'sub-mgmt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Company</th>
                      <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Subscription Type</th>
                      <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>Start Date</th>
                      <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>End Date</th>
                      <th style={{ padding: '14px 20px', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backendCompanies.map(c => {
                      const tierName = c.subscription?.tier ? c.subscription.tier.toUpperCase() : 'NONE';
                      const isPremium = tierName.includes('MASTER') || tierName.includes('PREMIUM') || tierName.includes('PRIMIUM');
                      return (
                        <React.Fragment key={c.id}>
                          <tr style={{ borderBottom: c.subscription ? 'none' : '1px solid #f1f5f9' }}>
                            <td style={{ padding: '18px 20px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.1rem' }}>🏢</span> {c.name}
                            </td>
                            <td style={{ padding: '18px 20px', fontSize: '0.85rem' }}>
                              {c.subscription ? (
                                <span style={{ 
                                  padding: '4px 10px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.72rem', 
                                  fontWeight: '800', 
                                  background: isPremium ? '#fffbeb' : '#eff6ff', 
                                  color: isPremium ? '#b45309' : '#1d4ed8', 
                                  border: isPremium ? '1px solid #fde68a' : '1px solid #bfdbfe',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {isPremium ? '⭐' : '🔹'} {c.subscription.tier}
                                </span>
                              ) : (
                                <span style={{ 
                                  padding: '4px 10px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.72rem', 
                                  fontWeight: '800', 
                                  background: '#f1f5f9', 
                                  color: '#64748b', 
                                  border: '1px solid #cbd5e1',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  ⚪ None
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '18px 20px', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                              📅 {c.subscription?.startDate || 'N/A'}
                            </td>
                            <td style={{ padding: '18px 20px', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                              📅 {c.subscription?.expiresAt || 'N/A'}
                            </td>
                            <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                              {c.subscription && (
                                <div style={{ display: 'inline-flex', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      setRenewComp(c);
                                      setRenewNewEndDate(c.subscription?.expiresAt || '');
                                      setRenewAmount(c.subscription?.price ?? 0);
                                    }}
                                    style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '8px', border: '1px solid #86efac', background: '#ecfdf5', color: '#047857', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >🔄 Renew</button>
                                  <button
                                    onClick={() => {
                                      setEditSubCompany(c);
                                      setEsPlanName(c.subscription?.tier || '');
                                      setEsPrice(c.subscription?.price ?? 0);
                                      setEsMaxAdmins(c.subscription?.maxAdmins ?? 1);
                                      setEsMaxCashiers(c.subscription?.maxCashiers ?? 0);
                                      setEsMaxDelivery(c.subscription?.maxDeliveryStaff ?? 0);
                                      setEsMaxCustomers(c.subscription?.maxCustomers ?? 100);
                                      setEsMaxOrders(c.subscription?.maxOrdersPerMonth ?? 100);
                                    }}
                                    style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '8px', border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >✏️ Edit</button>
                                </div>
                              )}
                            </td>
                          </tr>
                          {c.subscription && (
                            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                              <td colSpan={5} style={{ padding: '12px 20px', fontSize: '0.8rem', color: '#475569' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ 
                                    padding: '5px 12px', 
                                    borderRadius: '8px', 
                                    background: '#ecfdf5', 
                                    color: '#047857', 
                                    fontWeight: '700',
                                    border: '1px solid #a7f3d0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    💵 Price: QR {c.subscription.price ?? 'N/A'}
                                  </span>
                                  <span style={{ 
                                    padding: '5px 12px', 
                                    borderRadius: '8px', 
                                    background: '#f1f5f9', 
                                    color: '#475569', 
                                    fontWeight: '700',
                                    border: '1px solid #e2e8f0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    👥 Max Admins: {c.subscription.maxAdmins ?? 'N/A'}
                                  </span>
                                  <span style={{ 
                                    padding: '5px 12px', 
                                    borderRadius: '8px', 
                                    background: '#f1f5f9', 
                                    color: '#475569', 
                                    fontWeight: '700',
                                    border: '1px solid #e2e8f0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    💼 Max Cashiers: {c.subscription.maxCashiers ?? 'N/A'}
                                  </span>
                                  <span style={{ 
                                    padding: '5px 12px', 
                                    borderRadius: '8px', 
                                    background: '#f1f5f9', 
                                    color: '#475569', 
                                    fontWeight: '700',
                                    border: '1px solid #e2e8f0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    🚚 Max Deliveries: {c.subscription.maxDeliveryStaff ?? 'N/A'}
                                  </span>
                                  <span style={{ 
                                    padding: '5px 12px', 
                                    borderRadius: '8px', 
                                    background: '#f1f5f9', 
                                    color: '#475569', 
                                    fontWeight: '700',
                                    border: '1px solid #e2e8f0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    👤 Max Customers: {c.subscription.maxCustomers ?? 'N/A'}
                                  </span>
                                  <span style={{ 
                                    padding: '5px 12px', 
                                    borderRadius: '8px', 
                                    background: '#f0f9ff', 
                                    color: '#0369a1', 
                                    fontWeight: '700',
                                    border: '1px solid #e0f2fe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    📦 Max Monthly Orders: {c.subscription.maxOrdersPerMonth ?? 'N/A'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

          </div>
        )}

        {/* Feature & Resource Management tab has been removed */}

        {/* ─── 5. PLATFORM REPORTS TAB ─── */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              {[
                { id: 'revenue', label: 'Platform Revenue Report', icon: '💰' },
                { id: 'stats', label: 'Order & Customer Stats', icon: '👥' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setReportsSub(sub.id as any)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                    background: reportsSub === sub.id ? '#eff6ff' : 'transparent',
                    color: reportsSub === sub.id ? '#2563eb' : '#64748b',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {reportsSub === 'revenue' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 16px 0' }}>💰 Company-wise Revenue Report</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {backendCompanies.map(c => {
                      const tier = c.subscription?.tier || 'No Subscription';
                      const price = c.subscription?.price ?? 0;
                      const revenue = price.toFixed(2);
                      const startDate = c.subscription?.startDate;
                      const endDate = c.subscription?.expiresAt;
                      return (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div>
                            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{c.name}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px', fontWeight: '600' }}>Subscription: <span style={{ color: '#2563eb' }}>{tier}</span></div>
                            {c.subscription && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                <span>📅 Start: <strong>{startDate}</strong></span>
                                <span>•</span>
                                <span>📅 End: <strong>{endDate}</strong></span>
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '800', color: '#10b981', fontSize: '1.05rem' }}>QR {revenue}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1', height: 'fit-content' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>SaaS Subscription Revenue</h3>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#059669', marginBottom: '10px' }}>
                    QR {backendCompanies.reduce((sum, c) => sum + (c.subscription?.price ?? 0), 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>Calculated from the total value of active subscription periods (Start Date to End Date).</div>
                </div>
              </div>
            )}


            {reportsSub === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem' }}>
                  <div style={{ padding: '18px 24px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Customers</div>
                      <div style={{ fontSize: '2rem', fontWeight: '950', color: '#1e40af', marginTop: '4px' }}>{totalCustomers}</div>
                    </div>
                    <span style={{ fontSize: '2.5rem' }}>👥</span>
                  </div>
                  <div style={{ padding: '18px 24px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Orders</div>
                      <div style={{ fontSize: '2rem', fontWeight: '950', color: '#065f46', marginTop: '4px' }}>{totalOrders}</div>
                    </div>
                    <span style={{ fontSize: '2.5rem' }}>📦</span>
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 18px 0', fontSize: '1.15rem', color: '#0f172a' }}>🏢 Company-wise Statistics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {backendCompanies.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{c.name}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                            ID: {c.id}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ padding: '6px 14px', background: '#eff6ff', color: '#1e40af', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            👥 Customers: {c.customer_count ?? 0}
                          </span>
                          <span style={{ padding: '6px 14px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            📦 Orders: {c.order_count ?? 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
                  {annTargetComp && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Target audience</label>
                      <select value={annTargetType} onChange={e => setAnnTargetType(e.target.value as any)} style={{ width: '100%', padding: '9px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                        <option value="ALL">All Users</option>
                        <option value="ADMINS">Company Admins</option>
                        <option value="DELIVERY_BOYS">Delivery Staff</option>
                        <option value="CUSTOMERS">Customers</option>
                      </select>
                    </div>
                  )}
                  <div style={{ gridColumn: annTargetComp ? 'span 1' : 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>Target Company</label>
                    <select value={annTargetComp} onChange={e => setAnnTargetComp(e.target.value)} style={{ width: '100%', padding: '9px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                      <option value="">-- Choose Target Company --</option>
                      <option value="ALL">All Companies (Global)</option>
                      {backendCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
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
                {backendAnnouncements.map(ann => (
                  <div key={ann.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1', position: 'relative' }}>
                    <button onClick={() => handleDeleteAnnouncement(ann.id)} style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>🗑️</button>
                    <strong style={{ fontSize: '0.92rem' }}>{ann.title}</strong>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#475569' }}>{ann.content}</p>
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#64748b' }}>
                      Target: {ann.target_audience} • Company: {ann.target_companies ? (backendCompanies.find(c => c.id === ann.target_companies)?.name || 'Selected Company') : 'All Companies'} • Date: {ann.created_at?.split('T')[0]}
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
                {backendTickets.map(t => (
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
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Company: {t.company_name || 'N/A'} • Admin: {t.admin_name || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket responder view */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #cbd5e1' }}>
              {activeTicket ? (
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>Ticket Responder</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div><strong>Ticket ID:</strong> {activeTicket.id.substring(0,8)}...</div>
                    <div><strong>Date:</strong> {new Date(activeTicket.created_at).toLocaleDateString()}</div>
                    <div><strong>Company Name:</strong> {activeTicket.company_name || 'N/A'}</div>
                    <div><strong>Admin Name:</strong> {activeTicket.admin_name || 'N/A'}</div>
                    <div><strong>Admin Email:</strong> {activeTicket.admin_email || 'N/A'}</div>
                    <div><strong>Admin Phone:</strong> {activeTicket.admin_phone || 'N/A'}</div>
                  </div>
                  
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '0.88rem' }}>
                    <strong>Message:</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#334155' }}>{activeTicket.description}</p>
                  </div>

                  {activeTicket.internal_notes && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Admin Reply:</strong>
                      <div style={{ padding: '10px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #cbd5e1', fontSize: '0.82rem', marginTop: '6px' }}>
                        {activeTicket.internal_notes}
                      </div>
                    </div>
                  )}

                  {activeTicket.status === 'OPEN' ? (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>📜 Central platform Audit Trails & Activities</h3>
            </div>
            
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
                {backendAuditLogs
                  .filter(l => auditTypeFilter === 'All' || (auditTypeFilter === 'Platform' ? !l.tenant_id : l.tenant_id))
                  .map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', color: '#64748b' }}>{new Date(l.created_at).toLocaleString()}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', background: !l.tenant_id ? '#eff6ff' : '#faf5ff', color: !l.tenant_id ? '#2563eb' : '#6b21a8' }}>
                          {!l.tenant_id ? 'Platform' : 'Company'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontWeight: '700', color: '#b45309' }}>{l.action}</td>
                      <td style={{ padding: '10px', color: '#334155' }}>{l.details || l.module}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── 9. GLOBAL PLATFORM SETTINGS TAB ─── */}
        {activeTab === 'global-settings' && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>⚙️ Global Platform Settings</h3>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.88rem' }}>Configure global SMTP servers, gateway integrations, and basic branding variables.</p>
            
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>Platform Title Name</label>
                  <input type="text" value={platformName} onChange={e => setPlatformName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>Platform Logo Icon URL</label>
                  <input type="text" value={platformLogo} onChange={e => setPlatformLogo(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', fontWeight: '800' }}>📧 Central SMTP Configuration</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>SMTP Host Server</label>
                    <input type="text" value={smtpServer} onChange={e => setSmtpServer(e.target.value)} placeholder="e.g. smtp.gmail.com" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>SMTP Port</label>
                    <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="e.g. 587" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>SMTP Username (Email)</label>
                    <input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="e.g. user@gmail.com" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>SMTP Password / App Secret</label>
                    <input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', fontWeight: '800' }}>🌐 API Gateways & Integrations</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>SMS Gateway Provider Endpoint</label>
                    <input type="text" value={smsGatewayUrl} onChange={e => setSmsGatewayUrl(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>WhatsApp Business API Key</label>
                    <input type="text" value={whatsAppApiKey} onChange={e => setWhatsAppApiKey(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>Google Maps Javascript Web Key</label>
                  <input type="text" value={googleMapsKey} onChange={e => setGoogleMapsKey(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}>
                  Save Global Configurations
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notification Center and Backup Restore have been removed */}



      </main>

      {showWizard && (
        <CompanyOnboardingWizard
          token={token}
          onClose={() => { setShowWizard(false); setResumeWizardData(undefined); }}
          onComplete={() => {
            setShowWizard(false);
            setResumeWizardData(undefined);
            fetchBackendData();
          }}
          addAuditLog={addAuditLog}
          resumeData={resumeWizardData}
        />
      )}

      {/* ─── MODAL: EDIT COMPANY DETAILS ─── */}
      {editingCompanyDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '840px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', padding: '20px 24px', color: 'white', position: 'relative', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Edit Company Details</h3>
              <button onClick={() => setEditingCompanyDetails(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <form onSubmit={handleEditCompanySubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                
                {/* Left Column: Editable Form Fields */}
                <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Company Name</label>
                    <input type="text" required value={editCompName} onChange={e => setEditCompName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Status</label>
                    <select value={editCompStatus} onChange={e => setEditCompStatus(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Address</label>
                    <input type="text" value={editCompAddress} onChange={e => setEditCompAddress(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>

                  <h4 style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>Admin Details</h4>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Admin Name</label>
                      <input type="text" value={editAdminName} onChange={e => setEditAdminName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Admin Phone</label>
                      <input type="text" value={editAdminPhone} onChange={e => setEditAdminPhone(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Admin Email</label>
                    <input type="text" readOnly disabled value={editAdminEmail} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Right Column: Read-only Subscription Plan Details */}
                {editSubPlanName && (
                  <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>📋 Subscription Plan Details</h4>
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.82rem', border: '1px solid #e2e8f0', flex: 1 }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Plan Name</div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{editSubPlanName || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Price (QR)</div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{editSubPrice !== null ? `QR ${editSubPrice}` : 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Start Date</div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{editSubStartDate || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>End Date</div>
                        <div style={{ fontWeight: '700', color: '#dc2626' }}>{editSubEndDate || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Admins</div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{editSubMaxAdmins ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Cashiers</div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{editSubMaxCashiers ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Deliveries</div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{editSubMaxDelivery ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Customers</div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{editSubMaxCustomers ?? 'N/A'}</div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Monthly Orders</div>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{editSubMaxOrders ?? 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '6px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button type="button" onClick={() => setEditingCompanyDetails(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW COMPANY PROFILE ─── */}
      {viewingCompanyProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Company Profile: {viewingCompanyProfile.name}</h3>
              <button onClick={() => setViewingCompanyProfile(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const profileAdmin = backendAdmins.find((a: any) => a.tenant_id === viewingCompanyProfile.id);
                return (
                  <>
                    <div><strong>Company Name:</strong> {viewingCompanyProfile.name}</div>
                    <div><strong>Company Address:</strong> {viewingCompanyProfile.address || 'N/A'}</div>

                    <div><strong>Admin Phone Number:</strong> {profileAdmin?.phone || 'N/A'}</div>
                    <div><strong>Admin Gmail:</strong> {profileAdmin?.email || viewingCompanyProfile.email || 'N/A'}</div>

                    <h4 style={{ margin: '16px 0 8px 0', fontSize: '0.95rem', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>📋 Subscription Details</h4>
                    {viewingCompanyProfile.subscription ? (
                      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem', border: '1px solid #cbd5e1' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Plan Name</div>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{viewingCompanyProfile.subscription.tier || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Price</div>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{viewingCompanyProfile.subscription.price !== undefined && viewingCompanyProfile.subscription.price !== null ? `QR ${viewingCompanyProfile.subscription.price}` : 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Start Date</div>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{viewingCompanyProfile.subscription.startDate || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>End Date</div>
                          <div style={{ fontWeight: '800', color: '#dc2626' }}>{viewingCompanyProfile.subscription.expiresAt || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Admins</div>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{viewingCompanyProfile.subscription.maxAdmins ?? 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Cashiers</div>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{viewingCompanyProfile.subscription.maxCashiers ?? 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Deliveries</div>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{viewingCompanyProfile.subscription.maxDeliveryStaff ?? 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Customers</div>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{viewingCompanyProfile.subscription.maxCustomers ?? 'N/A'}</div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Max Monthly Orders</div>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{viewingCompanyProfile.subscription.maxOrdersPerMonth ?? 'N/A'}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontStyle: 'italic' }}>No active subscription.</div>
                    )}
                  </>
                );
              })()}
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setViewingCompanyProfile(null)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Close Profile</button>
              </div>
            </div>
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
                  {plans.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
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

      {/* ─── MODAL: RENEW SUBSCRIPTION ─── */}
      {renewComp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '460px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #065f46, #059669)', padding: '22px 28px', color: 'white', position: 'relative' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Subscription Renewal</div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>🔄 {renewComp.name}</h3>
              <button onClick={() => setRenewComp(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Current Plan Info */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Plan Name</div>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>{renewComp.subscription?.tier || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Current End Date</div>
                  <div style={{ fontWeight: '800', color: '#dc2626', fontSize: '1rem' }}>{renewComp.subscription?.expiresAt || 'N/A'}</div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Amount Paid (QR)</label>
                <input
                  type="number"
                  min={0}
                  value={renewAmount}
                  onChange={e => setRenewAmount(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', boxSizing: 'border-box' }}
                  placeholder="Enter amount paid"
                />
              </div>

              {/* New End Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>New End Date</label>
                <input
                  type="date"
                  value={renewNewEndDate}
                  onChange={e => setRenewNewEndDate(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', boxSizing: 'border-box' }}
                />
              </div>

              {/* Extension info badge */}
              {renewNewEndDate && renewComp.subscription?.expiresAt && (() => {
                const oldEnd = new Date(renewComp.subscription.expiresAt);
                const newEnd = new Date(renewNewEndDate);
                const extDays = Math.ceil((newEnd.getTime() - oldEnd.getTime()) / (1000 * 60 * 60 * 24));
                return extDays > 0 ? (
                  <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '12px 16px', fontSize: '0.85rem', color: '#15803d', fontWeight: '700' }}>
                    ✅ Extending by <strong>{extDays} days</strong> — new end date: <strong>{renewNewEndDate}</strong>
                  </div>
                ) : extDays < 0 ? (
                  <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '12px 16px', fontSize: '0.85rem', color: '#dc2626', fontWeight: '700' }}>
                    ⚠️ New end date is before the current end date
                  </div>
                ) : null;
              })()}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '18px', marginTop: '4px' }}>
                <button type="button" onClick={() => setRenewComp(null)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: 'transparent', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button
                  disabled={renewLoading || !renewNewEndDate}
                  onClick={async () => {
                    if (!renewNewEndDate) return;
                    setRenewLoading(true);
                    try {
                      const newEnd = new Date(renewNewEndDate);
                      const days = Math.max(1, Math.ceil((newEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                      await fetch(`${BASE_URL}/api/v1/saas-admin/subscriptions/${renewComp.id}/assign`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          plan_name: renewComp.subscription?.tier || 'CUSTOM',
                          days,
                          price: renewAmount,
                          end_date: renewNewEndDate
                        })
                      });
                      addAuditLog('SUBSCRIPTION_RENEWAL', `Renewed ${renewComp.name} subscription to ${renewNewEndDate}, Amount: QR ${renewAmount}`);
                      fetchBackendData();
                      setRenewComp(null);
                    } catch (err) {
                      alert('Failed to renew subscription');
                    }
                    setRenewLoading(false);
                  }}
                  style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: renewLoading || !renewNewEndDate ? '#94a3b8' : 'linear-gradient(135deg, #059669, #047857)', color: 'white', fontWeight: '700', cursor: renewLoading || !renewNewEndDate ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}
                >
                  {renewLoading ? 'Saving...' : '🔄 Confirm Renewal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT SUBSCRIPTION LIMITS ─── */}
      {editSubCompany && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', padding: '22px 28px', color: 'white', position: 'relative' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Edit Subscription</div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>✏️ {editSubCompany.name}</h3>
              <button onClick={() => setEditSubCompany(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Plan Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Plan Name</label>
                <input type="text" value={esPlanName} onChange={e => setEsPlanName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', boxSizing: 'border-box' }} />
              </div>
              {/* Price */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Price (QR)</label>
                <input type="number" min={0} value={esPrice} onChange={e => setEsPrice(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', boxSizing: 'border-box' }} />
              </div>
              {/* Limits Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Max Admins</label>
                  <input type="number" min={0} value={esMaxAdmins} onChange={e => setEsMaxAdmins(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Max Cashiers</label>
                  <input type="number" min={0} value={esMaxCashiers} onChange={e => setEsMaxCashiers(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Max Deliveries</label>
                  <input type="number" min={0} value={esMaxDelivery} onChange={e => setEsMaxDelivery(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Max Customers</label>
                  <input type="number" min={0} value={esMaxCustomers} onChange={e => setEsMaxCustomers(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Max Monthly Orders</label>
                <input type="number" min={0} value={esMaxOrders} onChange={e => setEsMaxOrders(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', boxSizing: 'border-box' }} />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px' }}>
                <button type="button" onClick={() => setEditSubCompany(null)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: 'transparent', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button
                  disabled={esLoading}
                  onClick={async () => {
                    setEsLoading(true);
                    try {
                      const sub = editSubCompany.subscription;
                      const endDate = sub?.expiresAt || new Date().toISOString().split('T')[0];
                      const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                      await fetch(`${BASE_URL}/api/v1/saas-admin/subscriptions/${editSubCompany.id}/assign`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          plan_name: esPlanName || sub?.tier || 'CUSTOM',
                          days,
                          price: esPrice,
                          end_date: endDate,
                          start_date: sub?.startDate || new Date().toISOString().split('T')[0],
                          max_admins: esMaxAdmins,
                          max_cashiers: esMaxCashiers,
                          max_delivery_staff: esMaxDelivery,
                          max_customers: esMaxCustomers,
                          max_orders_per_month: esMaxOrders
                        })
                      });
                      addAuditLog('SUBSCRIPTION_EDIT', `Updated ${editSubCompany.name} subscription limits: Admins=${esMaxAdmins}, Cashiers=${esMaxCashiers}, Delivery=${esMaxDelivery}, Customers=${esMaxCustomers}, Orders=${esMaxOrders}`);
                      fetchBackendData();
                      setEditSubCompany(null);
                    } catch (err) {
                      alert('Failed to update subscription');
                    }
                    setEsLoading(false);
                  }}
                  style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: esLoading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', fontWeight: '700', cursor: esLoading ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}
                >
                  {esLoading ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW MONITORED CUSTOMER DETAILS ─── */}
      {viewingMonitoredCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Customer details view</h3>
              <button onClick={() => setViewingMonitoredCustomer(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>Name:</strong> {viewingMonitoredCustomer.name}</div>
              <div><strong>Email:</strong> {viewingMonitoredCustomer.email}</div>
              <div><strong>Phone:</strong> {viewingMonitoredCustomer.phone}</div>
              <div><strong>Address:</strong> {viewingMonitoredCustomer.address}</div>
              <div><strong>Wallet Balance:</strong> QR {viewingMonitoredCustomer.walletBalance.toFixed(2)}</div>
              <div><strong>Loyalty Points:</strong> {viewingMonitoredCustomer.loyaltyPoints}</div>
              <div><strong>Credit Balance:</strong> QR {viewingMonitoredCustomer.creditBalance.toFixed(2)}</div>
              <div><strong>Notes:</strong> {viewingMonitoredCustomer.notes || 'None'}</div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setViewingMonitoredCustomer(null)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Close Details</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW MONITORED ORDER DETAILS ─── */}
      {viewingMonitoredOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '20px 24px', color: 'white', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Order Details</h3>
              <button onClick={() => setViewingMonitoredOrder(null)} style={{ position: 'absolute', right: '20px', top: '20px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ padding: '24px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>Order ID:</strong> #{viewingMonitoredOrder.id}</div>
              <div><strong>Customer Name:</strong> {viewingMonitoredOrder.customerName}</div>
              <div><strong>Order Date:</strong> {viewingMonitoredOrder.date}</div>
              <div><strong>Total Amount:</strong> QR {(viewingMonitoredOrder.totalAmount || viewingMonitoredOrder.total || 0).toFixed(2)}</div>
              <div><strong>Payment Method:</strong> {viewingMonitoredOrder.paymentMethod}</div>
              <div><strong>Order status:</strong> {viewingMonitoredOrder.status}</div>
              <div><strong>Logistics progress:</strong> {viewingMonitoredOrder.deliveryStatus}</div>
              <div><strong>Courier Assigned:</strong> {viewingMonitoredOrder.courier || 'Unassigned'}</div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setViewingMonitoredOrder(null)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
