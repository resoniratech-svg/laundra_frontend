import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface WizardProps {
  token: string | null;
  onClose: () => void;
  onComplete: () => void;
  addAuditLog: (action: string, details: string) => void;
  resumeData?: { companyId: string, step: number };
}

import { getApiBaseUrl } from '../config';
import { useDatabase } from '../DatabaseContext';

const BASE_URL = getApiBaseUrl();

export default function CompanyOnboardingWizard({ token, onClose, onComplete, addAuditLog, resumeData }: WizardProps) {
  const { db, saveDB } = useDatabase();
  const [step, setStep] = useState(resumeData?.step || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 data
  const [compName, setCompName] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compAltPhone, setCompAltPhone] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compGst, setCompGst] = useState('');
  const [compType, setCompType] = useState('Laundry');
  
  // Wizard state
  const [companyId, setCompanyId] = useState<string>(resumeData?.companyId || '');
  const [companyEmailOtp, setCompanyEmailOtp] = useState('');
  
  // Step 3 data
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  
  // Step 5 data
  const [customPlanName, setCustomPlanName] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customAdmins, setCustomAdmins] = useState(1);
  const [customCashiers, setCustomCashiers] = useState(0);
  const [customDelivery, setCustomDelivery] = useState(0);
  const [customCustomers, setCustomCustomers] = useState(100);
  const [customOrders, setCustomOrders] = useState(100);
  const [customValidity, setCustomValidity] = useState(0);

  useEffect(() => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setCustomValidity(diffDays);
    } else {
      setCustomValidity(0);
    }
  }, [customStartDate, customEndDate]);

  // Fetch company details if resuming setup or companyId is already created
  useEffect(() => {
    if (companyId && token) {
      fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch company details');
      })
      .then(data => {
        if (data.name) setCompName(data.name);
        if (data.address) setCompAddress(data.address);
        if (data.phone) setCompPhone(data.phone);
        if (data.shop_contact_no) setCompAltPhone(data.shop_contact_no);
      })
      .catch(err => console.error('Failed to load company details for onboarding wizard:', err));
    }
  }, [companyId, token]);

  
  // Step 6 / 10 data: Permissions & Access Controls
  const [portalPermissions, setPortalPermissions] = useState({
    adminPortal: {
      enabled: true,
      dashboard: true,
      orders: true,
      posCashier: true,
      customers: true,
      services: true,
      prepaidPackages: true,
      deliveries: true,
      expenses: true,
      reports: true,
      coupons: true,
      loyalty: true,
      staffAttendance: true,
      auditLogs: true,
      settings: true
    },
    cashierPortal: {
      enabled: true,
      dashboard: true,
      posCashier: true,
      orders: true,
      customers: true,
      expenses: true,
      deliveries: true,
      prepaidPackages: true,
      loyalty: true,
      services: true,
      coupons: true,
      announcements: true,
      reviews: true
    },
    customerPortal: {
      enabled: true,
      placeOrder: true,
      orderTracking: true,
      wallet: true,
      prepaidPackages: true,
      supportTickets: true,
      reviews: true,
      offers: true
    },
    deliveryPortal: {
      enabled: true,
      activeDeliveries: true,
      pickups: true,
      mapNavigation: true,
      history: true,
      leaveRequests: true
    }
  });

  const [expandedPortal, setExpandedPortal] = useState<'admin' | 'cashier' | 'customer' | 'delivery' | null>('admin');

  // Step 7 data
  const [file, setFile] = useState<File | null>(null);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const url = companyId 
        ? `${BASE_URL}/api/v1/saas-admin/companies/${companyId}`
        : `${BASE_URL}/api/v1/saas-admin/companies`;
      const method = companyId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: compName,
          address: compAddress,
          phone: compPhone,
          shop_contact_no: compAltPhone
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      if (!companyId) {
        setCompanyId(data.id);
        addAuditLog('ONBOARDING_STEP1', `Created company record for ${compName}`);
      } else {
        addAuditLog('ONBOARDING_STEP1', `Updated company record for ${compName}`);
      }
      
      // Skipping company email OTP (user request: only verify admin email)
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/verify-otp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: compEmail, otp: companyEmailOtp })
      });
      if (!res.ok) throw new Error(await res.text());
      addAuditLog('ONBOARDING_STEP2', `Verified company email for ${compName}`);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/admins/send-otp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send OTP');
      }
      if (data.otp_debug) {
        alert(`ℹ️ [TEST MODE - SMTP Unconfigured]\n\nYour OTP code is: ${data.otp_debug}\n\n(To receive real emails, configure your SMTP credentials in Super Admin -> Global Settings).`);
      }
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/verify-otp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, otp: adminOtp })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errData.detail || 'Invalid or expired OTP');
      }
      setStep(5);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStep5 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payloadPlanName = customPlanName.trim() || 'CUSTOM';
      const payload = {
        plan_name: payloadPlanName,
        price: customPrice,
        start_date: customStartDate,
        end_date: customEndDate,
        max_admins: customAdmins,
        max_cashiers: customCashiers,
        max_delivery_staff: customDelivery,
        max_customers: customCustomers,
        max_orders_per_month: customOrders
      };
      
      const res = await fetch(`${BASE_URL}/api/v1/saas-admin/subscriptions/${companyId}/assign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      addAuditLog('ONBOARDING_STEP5', `Assigned custom subscription to company`);
      
      // Create Admin here now that subscription exists
      const adminRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/admins`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: adminName, email: adminEmail, phone: adminPhone, password: adminPass, otp: adminOtp })
      });
      if (!adminRes.ok) throw new Error(await adminRes.text());
      addAuditLog('ONBOARDING_STEP4', `Created company admin ${adminEmail}`);
      
      setStep(7);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStep6 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      for (const [feat, isEnabled] of Object.entries(features)) {
        if (isEnabled) {
          await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/features`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature_key: feat })
          });
        }
      }
      addAuditLog('ONBOARDING_STEP6', `Enabled features for company`);
      setStep(7);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStep7 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setStep(8);
      return;
    }
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_URL}/api/v1/companies/${companyId}/services/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // Form data sets own content type
        body: formData
      });
      if (!res.ok) throw new Error(await res.text());
      addAuditLog('ONBOARDING_STEP7', `Imported service catalog`);
      setStep(8);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStep9 = async () => {
    setLoading(true); setError('');
    try {
      // 1. Save portalPermissions to localStorage for immediate lookup
      if (companyId) {
        try {
          localStorage.setItem(`ll_company_${companyId}_permissions`, JSON.stringify(portalPermissions));
          const mapRaw = localStorage.getItem('ll_company_permissions_map');
          const map = mapRaw ? JSON.parse(mapRaw) : {};
          map[companyId] = portalPermissions;
          localStorage.setItem('ll_company_permissions_map', JSON.stringify(map));
        } catch (e) {}
      }

      // 2. Update company object in db.companies
      const updatedCompanies = db.companies.map(c => {
        if (c.id === companyId) {
          return {
            ...c,
            portalPermissions,
            features: {
              ...c.features,
              cashierPortal: portalPermissions.cashierPortal?.enabled !== false,
              cashierModule: (portalPermissions.cashierPortal?.posCashier !== false) || (portalPermissions.adminPortal.posCashier !== false),
              deliveryModule: portalPermissions.deliveryPortal.enabled,
              expenseModule: portalPermissions.adminPortal.expenses,
              reports: portalPermissions.adminPortal.reports,
              coupons: portalPermissions.adminPortal.coupons,
              wallet: portalPermissions.customerPortal.wallet
            }
          };
        }
        return c;
      });
      saveDB({ companies: updatedCompanies });

      // 3. Sync features to backend
      if (companyId) {
        try {
          await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/features`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              portalPermissions,
              features: {
                adminPortal: portalPermissions.adminPortal.enabled,
                cashierPortal: portalPermissions.cashierPortal?.enabled !== false,
                customerPortal: portalPermissions.customerPortal.enabled,
                deliveryPortal: portalPermissions.deliveryPortal.enabled,
                cashierModule: (portalPermissions.cashierPortal?.posCashier !== false) || (portalPermissions.adminPortal.posCashier !== false),
                expenseModule: portalPermissions.adminPortal.expenses,
                coupons: portalPermissions.adminPortal.coupons,
                wallet: portalPermissions.customerPortal.wallet
              }
            })
          }).catch(() => null);
        } catch (e) {}
      }

      const statusRes = await fetch(`${BASE_URL}/api/v1/saas-admin/companies/${companyId}/status?status=ACTIVE`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statusRes.ok) throw new Error(await statusRes.text());
      addAuditLog('ONBOARDING_STEP9', `Activated company ${compName} with configured permissions`);
      onComplete();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const toggleFeature = (key: string) => setFeatures({ ...features, [key]: !features[key] });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', width: '900px', maxWidth: '95%', height: '80vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Header */}
        {(() => {
          const getStepNum = (s: number) => {
            if (s === 1) return 1;
            if (s === 3) return 2;
            if (s === 4) return 3;
            if (s === 5) return 4;
            if (s === 7) return 5;
            if (s === 8) return 6;
            if (s === 10) return 7;
            if (s === 9) return 8;
            return s;
          };
          return (
            <div style={{ padding: '24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: '#0f172a' }}>Company Onboarding Wizard</h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Step {getStepNum(step)} of 8</div>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>
          );
        })()}

        {/* Content */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>{error}</div>}

          {step === 1 && (
            <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3>1. Create Company</h3>
              <input required maxLength={20} placeholder="Company Name" value={compName} onChange={e => setCompName(e.target.value)} style={inputStyle} />
              <input maxLength={20} placeholder="Company Address" value={compAddress} onChange={e => setCompAddress(e.target.value)} style={inputStyle} />
              <input
                type="tel"
                maxLength={15}
                placeholder="Company Phone Number"
                value={compPhone}
                onChange={e => setCompPhone(e.target.value.replace(/[a-zA-Z]/g, ''))}
                style={inputStyle}
              />
              <input
                type="tel"
                maxLength={15}
                placeholder="Company Alternate Phone Number (optional)"
                value={compAltPhone}
                onChange={e => setCompAltPhone(e.target.value.replace(/[a-zA-Z]/g, ''))}
                style={inputStyle}
              />
              <button disabled={loading} type="submit" style={btnStyle}>{loading ? 'Saving...' : 'Next Step →'}</button>
            </form>
          )}

          {/* Step 2 (Company Email OTP) is skipped based on user request */}
          {step === 3 && (
            <form onSubmit={handleStep3} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3>2. Create Company Admin</h3>
              <input required placeholder="Admin Name" value={adminName} onChange={e => setAdminName(e.target.value)} style={inputStyle} />
              <input required type="email" placeholder="Admin Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} style={inputStyle} />
              <input required placeholder="Admin Phone" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} style={inputStyle} />
              <input required type="password" placeholder="Temporary Password" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStep(1)} style={{ ...btnStyle, background: '#64748b', flex: 1, marginTop: 0 }}>← Back</button>
                <button disabled={loading} type="submit" style={{ ...btnStyle, flex: 2, marginTop: 0 }}>{loading ? 'Sending OTP...' : 'Next Step →'}</button>
              </div>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleStep4} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3>3. Verify Admin Email</h3>
              <p>An OTP was sent to <strong>{adminEmail}</strong>.</p>
              <input required placeholder="Enter 6-digit OTP" value={adminOtp} onChange={e => setAdminOtp(e.target.value)} style={inputStyle} />
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>We will assign a subscription before fully creating the admin due to backend constraints.</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStep(3)} style={{ ...btnStyle, background: '#64748b', flex: 1, marginTop: 0 }}>← Back</button>
                <button type="submit" style={{ ...btnStyle, flex: 2, marginTop: 0 }}>Next Step →</button>
              </div>
            </form>
          )}

          {step === 5 && (
            <form onSubmit={handleStep5} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3>4. Create Custom Pricing Plan</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Plan Name</label>
                  <input required placeholder="Custom Plan Name" value={customPlanName} onChange={e => setCustomPlanName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Overall Price (QR)</label>
                  <input type="number" required value={customPrice} onChange={e => setCustomPrice(parseFloat(e.target.value) || 0)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Start Date</label>
                  <input type="date" required value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>End Date</label>
                  <input type="date" required value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Validity (Days)</label>
                  <input type="number" disabled value={customValidity} style={{ ...inputStyle, background: '#f1f5f9' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', marginBottom: '2px' }}>Max Admins</label>
                  <input type="number" value={customAdmins} onChange={e => setCustomAdmins(parseInt(e.target.value) || 1)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', marginBottom: '2px' }}>Max Cashiers</label>
                  <input type="number" value={customCashiers} onChange={e => setCustomCashiers(parseInt(e.target.value) || 1)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', marginBottom: '2px' }}>Max Deliverys</label>
                  <input type="number" value={customDelivery} onChange={e => setCustomDelivery(parseInt(e.target.value) || 1)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', marginBottom: '2px' }}>Max Customers</label>
                  <input type="number" value={customCustomers} onChange={e => setCustomCustomers(parseInt(e.target.value) || 1)} style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', marginBottom: '2px' }}>Max Monthly Orders</label>
                  <input type="number" value={customOrders} onChange={e => setCustomOrders(parseInt(e.target.value) || 1)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStep(3)} style={{ ...btnStyle, background: '#64748b', flex: 1, marginTop: 0 }}>← Back</button>
                <button disabled={loading} type="submit" style={{ ...btnStyle, flex: 2, marginTop: 0 }}>{loading ? 'Assigning...' : 'Assign & Create Admin →'}</button>
              </div>
            </form>
          )}

          {/* Step 5 (Enable Platform Features) removed per user request */}          {step === 7 && (
            <form onSubmit={handleStep7} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3>5. Import Service Catalog (Optional)</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Upload an Excel file (.xlsx) with columns: Category, Name, Price, Description, Is Active</p>
              <input type="file" accept=".xlsx, .xls" onChange={e => setFile(e.target.files?.[0] || null)} style={{ padding: '10px' }} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStep(5)} style={{ ...btnStyle, background: '#64748b', flex: 1, marginTop: 0 }}>← Back</button>
                <button disabled={loading} type="submit" style={{ ...btnStyle, flex: 2, marginTop: 0 }}>{loading ? 'Importing...' : 'Skip / Next Step →'}</button>
              </div>
            </form>
          )}

          {step === 8 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3>6. Review & Confirm</h3>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', fontSize: '0.9rem' }}>
                <p><strong>Company:</strong> {compName}</p>
                {compPhone && <p><strong>Company Phone:</strong> {compPhone}</p>}
                {compAltPhone && <p><strong>Company Alternate Phone:</strong> {compAltPhone}</p>}
                <p><strong>Admin:</strong> {adminName} ({adminEmail})</p>
                <p><strong>Plan:</strong> {customPlanName || 'Custom'} (QR {customPrice})</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStep(7)} style={{ ...btnStyle, background: '#64748b', flex: 1, marginTop: 0 }}>← Back</button>
                <button onClick={() => setStep(10)} style={{ ...btnStyle, flex: 2, marginTop: 0 }}>Continue to Feature Permissions →</button>
              </div>
            </div>
          )}

          {step === 10 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#0f172a' }}>7. Module & Portal Feature Permissions & Access Controls</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Enable or disable entire portals or fine-tune individual sub-module permissions for this tenant. Disabled items will be hidden across all users of this company.
                </p>
              </div>

              {/* 🏢 ADMIN PORTAL */}
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
                <div style={{ padding: '16px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setExpandedPortal(expandedPortal === 'admin' ? null : 'admin')}>
                    <span style={{ fontSize: '1.4rem' }}>🏢</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>Admin Portal</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Management Dashboard, Orders, POS, Services, Staff, Settings</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
                      <input 
                        type="checkbox" 
                        checked={portalPermissions.adminPortal.enabled} 
                        onChange={e => setPortalPermissions({
                          ...portalPermissions,
                          adminPortal: { ...portalPermissions.adminPortal, enabled: e.target.checked }
                        })}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                      />
                      {portalPermissions.adminPortal.enabled ? 'Master Enabled' : 'Master Disabled'}
                    </label>
                    <button type="button" onClick={() => setExpandedPortal(expandedPortal === 'admin' ? null : 'admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                      {expandedPortal === 'admin' ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {expandedPortal === 'admin' && portalPermissions.adminPortal.enabled && (
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', background: '#fafafa' }}>
                    {[
                      { key: 'dashboard', label: '📊 Dashboard Analytics' },
                      { key: 'orders', label: '📦 Orders Management' },
                      { key: 'posCashier', label: '💵 POS / Cashier Module' },
                      { key: 'customers', label: '👥 Customer Management' },
                      { key: 'services', label: '🏷️ Services & Catalog Engine' },
                      { key: 'prepaidPackages', label: '💳 Prepaid Packages & Wallet' },
                      { key: 'deliveries', label: '🚚 Delivery Operations' },
                      { key: 'expenses', label: '💸 Expenses & Financials' },
                      { key: 'reports', label: '📈 Reports & Analytics' },
                      { key: 'coupons', label: '🎟️ Coupons & Promotions' },
                      { key: 'loyalty', label: '⭐ Loyalty & Rewards' },
                      { key: 'staffAttendance', label: '🕒 Staff & Attendance' },
                      { key: 'auditLogs', label: '🛡️ Audit Logs & Security' },
                      { key: 'settings', label: '⚙️ Settings & Profile' }
                    ].map(mod => (
                      <label key={mod.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={(portalPermissions.adminPortal as any)[mod.key] !== false} 
                          onChange={e => setPortalPermissions({
                            ...portalPermissions,
                            adminPortal: { ...portalPermissions.adminPortal, [mod.key]: e.target.checked }
                          })}
                          style={{ accentColor: '#2563eb' }}
                        />
                        {mod.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 💵 CASHIER PORTAL */}
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
                <div style={{ padding: '16px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setExpandedPortal(expandedPortal === 'cashier' ? null : 'cashier')}>
                    <span style={{ fontSize: '1.4rem' }}>💵</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>Cashier Portal</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Front Counter Desk, POS Register, Invoices, Customer Lookup, Petty Cash Expenses</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
                      <input 
                        type="checkbox" 
                        checked={portalPermissions.cashierPortal?.enabled !== false} 
                        onChange={e => setPortalPermissions({
                          ...portalPermissions,
                          cashierPortal: { ...(portalPermissions.cashierPortal || {}), enabled: e.target.checked }
                        })}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                      />
                      {portalPermissions.cashierPortal?.enabled !== false ? 'Master Enabled' : 'Master Disabled'}
                    </label>
                    <button type="button" onClick={() => setExpandedPortal(expandedPortal === 'cashier' ? null : 'cashier')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                      {expandedPortal === 'cashier' ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {expandedPortal === 'cashier' && portalPermissions.cashierPortal?.enabled !== false && (
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', background: '#fafafa' }}>
                    {[
                      { key: 'dashboard', label: '📊 Cashier Operational Dashboard' },
                      { key: 'posCashier', label: '🛒 POS & Cash Register Shift' },
                      { key: 'orders', label: '📦 Orders & Invoices' },
                      { key: 'customers', label: '👥 Customer Directory' },
                      { key: 'expenses', label: '💸 Expenses Book (Cash Drawer)' },
                      { key: 'deliveries', label: '🚚 Driver Cash Handovers' },
                      { key: 'prepaidPackages', label: '💳 Prepaid Packages' },
                      { key: 'loyalty', label: '⭐ Wallet & Loyalty' },
                      { key: 'services', label: '🏷️ Service Catalog & Rates' },
                      { key: 'coupons', label: '🎟️ Coupons & Promos' },
                      { key: 'announcements', label: '📢 Announcements' },
                      { key: 'reviews', label: '⭐ Customer Reviews' }
                    ].map(mod => (
                      <label key={mod.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={(portalPermissions.cashierPortal as any)?.[mod.key] !== false} 
                          onChange={e => setPortalPermissions({
                            ...portalPermissions,
                            cashierPortal: { ...(portalPermissions.cashierPortal || {}), [mod.key]: e.target.checked }
                          })}
                          style={{ accentColor: '#2563eb' }}
                        />
                        {mod.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 👤 CUSTOMER PORTAL */}
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
                <div style={{ padding: '16px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setExpandedPortal(expandedPortal === 'customer' ? null : 'customer')}>
                    <span style={{ fontSize: '1.4rem' }}>👤</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>Customer Portal</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Self-service ordering, Live Tracking, Digital Wallet, Support</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
                      <input 
                        type="checkbox" 
                        checked={portalPermissions.customerPortal.enabled} 
                        onChange={e => setPortalPermissions({
                          ...portalPermissions,
                          customerPortal: { ...portalPermissions.customerPortal, enabled: e.target.checked }
                        })}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                      />
                      {portalPermissions.customerPortal.enabled ? 'Master Enabled' : 'Master Disabled'}
                    </label>
                    <button type="button" onClick={() => setExpandedPortal(expandedPortal === 'customer' ? null : 'customer')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                      {expandedPortal === 'customer' ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {expandedPortal === 'customer' && portalPermissions.customerPortal.enabled && (
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', background: '#fafafa' }}>
                    {[
                      { key: 'placeOrder', label: '🧺 Place New Order' },
                      { key: 'orderTracking', label: '🚚 Order Tracking & History' },
                      { key: 'wallet', label: '💰 Wallet & Add Funds' },
                      { key: 'prepaidPackages', label: '💳 Prepaid Packages' },
                      { key: 'supportTickets', label: '💬 Support Tickets' },
                      { key: 'reviews', label: '⭐ Reviews & Ratings' },
                      { key: 'offers', label: '🏷️ Promotions & Offers' }
                    ].map(mod => (
                      <label key={mod.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={(portalPermissions.customerPortal as any)[mod.key] !== false} 
                          onChange={e => setPortalPermissions({
                            ...portalPermissions,
                            customerPortal: { ...portalPermissions.customerPortal, [mod.key]: e.target.checked }
                          })}
                          style={{ accentColor: '#2563eb' }}
                        />
                        {mod.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 🚚 DELIVERY PORTAL */}
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
                <div style={{ padding: '16px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setExpandedPortal(expandedPortal === 'delivery' ? null : 'delivery')}>
                    <span style={{ fontSize: '1.4rem' }}>🚚</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>Delivery Portal</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Driver App, Pickups, Map Navigation, Delivery Log, Leave Requests</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>
                      <input 
                        type="checkbox" 
                        checked={portalPermissions.deliveryPortal.enabled} 
                        onChange={e => setPortalPermissions({
                          ...portalPermissions,
                          deliveryPortal: { ...portalPermissions.deliveryPortal, enabled: e.target.checked }
                        })}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                      />
                      {portalPermissions.deliveryPortal.enabled ? 'Master Enabled' : 'Master Disabled'}
                    </label>
                    <button type="button" onClick={() => setExpandedPortal(expandedPortal === 'delivery' ? null : 'delivery')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                      {expandedPortal === 'delivery' ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {expandedPortal === 'delivery' && portalPermissions.deliveryPortal.enabled && (
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', background: '#fafafa' }}>
                    {[
                      { key: 'activeDeliveries', label: '📦 Active Deliveries' },
                      { key: 'pickups', label: '📍 Pickup Requests' },
                      { key: 'mapNavigation', label: '🗺️ Map & Navigation' },
                      { key: 'history', label: '📜 Delivery History' },
                      { key: 'leaveRequests', label: '🏖️ Leave Requests' }
                    ].map(mod => (
                      <label key={mod.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={(portalPermissions.deliveryPortal as any)[mod.key] !== false} 
                          onChange={e => setPortalPermissions({
                            ...portalPermissions,
                            deliveryPortal: { ...portalPermissions.deliveryPortal, [mod.key]: e.target.checked }
                          })}
                          style={{ accentColor: '#2563eb' }}
                        />
                        {mod.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStep(8)} style={{ ...btnStyle, background: '#64748b', flex: 1, marginTop: 0 }}>← Back</button>
                <button onClick={() => setStep(9)} style={{ ...btnStyle, flex: 2, marginTop: 0 }}>Save Permissions & Provision →</button>
              </div>
            </div>
          )}

          {step === 9 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', paddingTop: '30px' }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <h3>8. Tenant Environment Ready!</h3>
              <p style={{ color: '#64748b', textAlign: 'center', maxWidth: '500px' }}>
                The isolated tenant environment for <strong>{compName}</strong> has been successfully provisioned.
              </p>
              
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', width: '100%', maxWidth: '550px', fontSize: '0.85rem' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Provisioned Access Controls Summary:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🏢 Admin Portal:</span>
                    <strong style={{ color: portalPermissions.adminPortal.enabled ? '#16a34a' : '#dc2626' }}>
                      {portalPermissions.adminPortal.enabled ? 'Master Enabled' : 'Disabled'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>👤 Customer Portal:</span>
                    <strong style={{ color: portalPermissions.customerPortal.enabled ? '#16a34a' : '#dc2626' }}>
                      {portalPermissions.customerPortal.enabled ? 'Master Enabled' : 'Disabled'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🚚 Delivery Portal:</span>
                    <strong style={{ color: portalPermissions.deliveryPortal.enabled ? '#16a34a' : '#dc2626' }}>
                      {portalPermissions.deliveryPortal.enabled ? 'Master Enabled' : 'Disabled'}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', width: '100%' }}>
                <button type="button" onClick={() => setStep(10)} style={{ ...btnStyle, background: '#64748b', flex: 1, marginTop: 0 }}>← Back</button>
                <button onClick={handleStep9} disabled={loading} style={{ ...btnStyle, flex: 2, marginTop: 0 }}>
                  {loading ? 'Activating...' : 'Activate Company'}
                </button>
              </div>
            </div>
          )}

          {/* Catch-all: if step number is not handled, show a helpful fallback instead of blank */}
          {![1, 3, 4, 5, 7, 8, 10, 9].includes(step) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', paddingTop: '40px' }}>
              <div style={{ fontSize: '2.5rem' }}>⚠️</div>
              <h3 style={{ color: '#b45309' }}>Resuming from Step {step}</h3>
              <p style={{ color: '#64748b', textAlign: 'center' }}>
                This step was previously completed. Continue to the next available step.
              </p>
              <button onClick={() => setStep(10)} style={{ ...btnStyle, width: 'auto', padding: '12px 32px', background: '#f59e0b' }}>
                Continue → Module & Portal Permissions
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const inputStyle = { padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' };
const btnStyle = { padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' };
