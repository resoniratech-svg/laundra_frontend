import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from './DatabaseContext';
import { apiSendDeliveryOtp, apiRegisterDeliveryBoy } from './deliveryApi';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { db, saveDB, changeActiveCompany, setToken } = useDatabase();

  // Carousel State
  const [slideIndex, setSlideIndex] = useState(0);
  const heroSlides = ['hero_slide1.png', 'hero_slide2.png', 'hero_slide3.png'];

  const [publicCompanies, setPublicCompanies] = useState<any[]>([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/v1/companies/public`);
        if (res.ok) {
          const data = await res.json();
          setPublicCompanies(data);
        }
      } catch (err) {
        console.error('Failed to fetch public companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Modal States
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogIn, setShowLogIn] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // Form inputs - Signup
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupRole, setSignupRole] = useState<'customer' | 'delivery'>('customer');
  const [companySearch, setCompanySearch] = useState('');
  // Delivery Boy specific fields
  const [signupVehicleType, setSignupVehicleType] = useState('Bike');
  const [signupVehicleNumber, setSignupVehicleNumber] = useState('');
  const [signupLicenseNumber, setSignupLicenseNumber] = useState('');
  const [signupVehicleRc, setSignupVehicleRc] = useState('');
  const [signupInsuranceNumber, setSignupInsuranceNumber] = useState('');
  const [signupEmergencyContact, setSignupEmergencyContact] = useState('');
  const [signupProfilePhoto, setSignupProfilePhoto] = useState('');
  const [signupLicenseFile, setSignupLicenseFile] = useState('');
  const [signupInsuranceFile, setSignupInsuranceFile] = useState('');
  // OTP verification / steps inside signup modal
  const [signupOtpStep, setSignupOtpStep] = useState(false); // Used for customers if needed
  const [deliveryStep, setDeliveryStep] = useState(1);
  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [signupTempDetails, setSignupTempDetails] = useState<any>(null);
  // API loading / error feedback
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Form inputs - Login
  const [loginRole, setLoginRole] = useState('admin');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form inputs - PIN/Staff Auth
  const [signInRole, setSignInRole] = useState('Admin');
  const [signInPin, setSignInPin] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPass, setSignInPass] = useState('');

  // Order Tracking State
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState('');

  // ----- CUSTOMER SIGNUP -----
  const handleCustomerSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db.activeCompanyId) {
      alert("Please select a company first.");
      return;
    }
    const emailLower = signupEmail.trim().toLowerCase();
    const existing = db.users.find((u) => u.email.toLowerCase() === emailLower);
    if (existing) {
      alert('Email already registered.');
      return;
    }
    const newId = 'c-' + Date.now();
    const newCustomer = {
      id: newId,
      name: signupName,
      email: signupEmail,
      phone: signupPhone,
      address: signupAddress,
      walletBalance: 0,
      loyaltyPoints: 0,
      creditBalance: 0,
      notes: 'New account created via landing sign up',
      password: signupPassword,
    };
    const newUser = {
      id: 'u-' + Date.now(),
      name: signupName,
      role: 'customer' as const,
      email: signupEmail,
      password: signupPassword,
      phone: signupPhone,
      address: signupAddress,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    saveDB({
      customers: [...db.customers, newCustomer],
      users: [...db.users, newUser],
    });
    localStorage.setItem(`ll_${db.activeCompanyId}_active_customer_id`, newCustomer.id);
    localStorage.setItem('ll_active_customer_id', newCustomer.id);
    localStorage.setItem('ll_active_workspace', 'customer');
    setShowSignUp(false);
    navigate('/customer');
  };

  // ----- DELIVERY STAFF SIGNUP STEPS -----
  const handleDeliveryStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db.activeCompanyId) {
      alert("Please select a company first.");
      return;
    }
    const emailLower = signupEmail.trim().toLowerCase();
    const existing = db.users.find((u) => u.email.toLowerCase() === emailLower);
    if (existing) {
      alert('Email already registered.');
      return;
    }
    const details = {
      name: signupName,
      email: emailLower,
      phone: signupPhone,
      address: signupAddress,
      vehicleType: signupVehicleType,
      vehicleNumber: signupVehicleNumber,
      licenseNumber: signupLicenseNumber,
      vehicleRc: signupVehicleRc,
      profilePhoto: signupProfilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    };
    setApiLoading(true);
    setApiError('');
    try {
      await apiSendDeliveryOtp({
        email: emailLower,
        company_code: db.activeCompanyId,
      });
      setSignupTempDetails(details);
      setDeliveryStep(2);
      setApiError('');
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('already registered')) {
        alert(err.message);
        setApiLoading(false);
        return;
      }
      console.warn('[deliveryApi] send OTP failed, using local fallback:', err.message);
      setSignupTempDetails(details);
      setDeliveryStep(2);
    }
    setApiLoading(false);
  };

  const handleDeliveryStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiLoading(true);
    setApiError('');
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/auth/delivery-boy/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupTempDetails?.email, otp: signupOtpCode })
      });
      if (res.ok) {
        setDeliveryStep(3);
      } else {
        const data = await res.json();
        setApiError(`❌ Invalid OTP: ${data.detail || 'Please try again.'}`);
      }
    } catch (err) {
      console.warn('[deliveryApi] verify OTP fallback');
      if (signupOtpCode !== '909090') {
        setApiError('❌ Invalid OTP code. Please enter 909090.');
        setApiLoading(false);
        return;
      }
      setDeliveryStep(3);
    }
    setApiLoading(false);
  };

  const handleDeliveryStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiLoading(true);
    setApiError('');
    try {
      const res = await apiRegisterDeliveryBoy({
        company_code: db.activeCompanyId,
        name: signupTempDetails.name,
        phone: signupTempDetails.phone,
        email: signupTempDetails.email,
        password: signupPassword,
        vehicle_type: signupTempDetails.vehicleType,
        vehicle_number: signupTempDetails.vehicleNumber,
        license_number: signupTempDetails.licenseNumber,
        address: signupTempDetails.address,
        vehicle_rc: signupTempDetails.vehicleRc,
        profile_photo: signupTempDetails.profilePhoto,
        otp: signupOtpCode,
      });

      const newAgent: import('./DatabaseContext').User = {
        id: res.id,
        name: signupTempDetails.name,
        role: 'delivery',
        email: signupTempDetails.email,
        password: '',
        phone: signupTempDetails.phone,
        address: signupTempDetails.address,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        vehicleType: signupTempDetails.vehicleType,
        vehicleNumber: signupTempDetails.vehicleNumber,
        licenseNumber: signupTempDetails.licenseNumber,
        vehicleRc: signupTempDetails.vehicleRc,
        profilePhoto: signupTempDetails.profilePhoto,
      };
      saveDB({ users: [...db.users, newAgent] });

      alert(res.message || 'Account created! Your application is pending Admin approval.');
      setDeliveryStep(1);
      setShowSignUp(false);
    } catch (err: any) {
      console.warn('[deliveryApi] register fallback');
      const newAgent: import('./DatabaseContext').User = {
        id: 'u-dlv-' + Date.now(),
        name: signupTempDetails.name,
        role: 'delivery',
        email: signupTempDetails.email,
        password: signupPassword,
        phone: signupTempDetails.phone,
        address: signupTempDetails.address,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        vehicleType: signupTempDetails.vehicleType,
        vehicleNumber: signupTempDetails.vehicleNumber,
        licenseNumber: signupTempDetails.licenseNumber,
        vehicleRc: signupTempDetails.vehicleRc,
        profilePhoto: signupTempDetails.profilePhoto,
      };
      saveDB({ users: [...db.users, newAgent] });
      alert('Account created (Local Mode)! Pending Admin approval.');
      setDeliveryStep(1);
      setShowSignUp(false);
    }
    setApiLoading(false);
    setSignupOtpCode('');
    setApiError('');
    setSignupTempDetails(null);
  };

  const handleLogInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    const pass = loginPassword;
    const role = loginRole;

    // Super Admin is now authenticated via the backend.

    // Tenant suspension check
    const activeCompany = db.companies.find(c => c.id === db.activeCompanyId);
    if (activeCompany && activeCompany.status === 'Suspended') {
      alert('This company portal has been suspended. Please contact platform support.');
      return;
    }

    // Attempt backend login
    setApiLoading(true);
    setApiError('');
    const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      // 1. Authenticate to get token
      let requestRole = null;
      
      if (role === 'admin') requestRole = 'ADMIN';
      if (role === 'cashier') requestRole = 'CASHIER';
      if (role === 'delivery') requestRole = 'DELIVERY_BOY';
      if (role === 'customer') requestRole = 'CUSTOMER';
      if (role === 'superadmin') requestRole = 'SUPER_ADMIN';

      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password: pass,
          role: requestRole
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || data.message || 'Login failed');
      }
      
      const token = data.access_token;
      setToken(token); // Stores in DatabaseContext and localStorage
      
      // 2. Fetch user profile
      const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!meRes.ok) {
        throw new Error('Failed to fetch user profile details');
      }
      
      const user = await meRes.json();

      // Enforce selected role matching
      const normalizedRole = user.role?.toLowerCase();
      let expectedRole = role; // admin, cashier, delivery, customer, superadmin
      if (expectedRole === 'delivery') expectedRole = 'delivery_boy';
      
      const roleMatches = (normalizedRole === expectedRole || 
                           (expectedRole === 'delivery_boy' && normalizedRole === 'delivery') ||
                           (expectedRole === 'admin' && normalizedRole === 'admin') ||
                           (expectedRole === 'cashier' && normalizedRole === 'cashier') ||
                           (expectedRole === 'customer' && normalizedRole === 'customer') ||
                           (expectedRole === 'superadmin' && normalizedRole === 'super_admin'));
                           
      if (!roleMatches) {
        alert(`Access Denied: Your account role (${user.role}) does not match the selected portal.`);
        setToken(null);
        setApiLoading(false);
        return;
      }

      if (user.tenant_id && user.role !== 'SUPER_ADMIN' && user.role !== 'super_admin') {
        changeActiveCompany(user.tenant_id);
      }

      // Block delivery boys who are not yet approved
      if ((user.role === 'DELIVERY_BOY' || user.role === 'delivery') && (user.status === 'PENDING_APPROVAL' || user.status === 'Pending')) {
        alert('⏳ Your application is still pending approval by the Company Admin.\n\nYou will receive an email once your account has been approved. Please try again later.');
        setToken(null);
        return;
      }

      // Block any suspended user
      if (user.status === 'SUSPENDED' || user.status === 'Suspended') {
        alert('🚫 Your account has been suspended. Please contact the Company Admin.');
        setToken(null);
        return;
      }

      setShowLogIn(false);

      if (user.role === 'ADMIN' || user.role === 'admin') {
        saveDB({ activeRole: 'Admin', currentDeliveryBoy: null });
        localStorage.setItem('ll_activerole', 'Admin');
        localStorage.removeItem('ll_active_delivery_boy');
        localStorage.setItem('ll_active_workspace', 'admin');
        navigate('/admin');
      } else if (user.role === 'CASHIER' || user.role === 'cashier') {
        saveDB({ activeRole: 'Cashier', currentDeliveryBoy: null });
        localStorage.setItem('ll_activerole', 'Cashier');
        localStorage.removeItem('ll_active_delivery_boy');
        localStorage.setItem('ll_active_workspace', 'admin');
        navigate('/admin');
      } else if (user.role === 'DELIVERY_BOY' || user.role === 'delivery') {
        saveDB({ activeRole: 'Delivery Boy', currentDeliveryBoy: user.name });
        localStorage.setItem('ll_activerole', 'Delivery Boy');
        localStorage.setItem('ll_active_delivery_boy', user.name);
        localStorage.setItem('ll_active_workspace', 'delivery');
        navigate('/delivery');
      } else if (user.role === 'CUSTOMER' || user.role === 'customer') {
        localStorage.setItem(`ll_${db.activeCompanyId}_active_customer_id`, user.id);
        localStorage.setItem('ll_active_customer_id', user.id);
        localStorage.setItem('ll_active_workspace', 'customer');
        navigate('/customer');
      } else if (user.role === 'SUPER_ADMIN' || user.role === 'super_admin') {
        localStorage.setItem('ll_super_admin_session', 'active');
        localStorage.setItem('ll_active_workspace', 'super-admin');
        navigate('/super-admin');
      }
    } catch (err: any) {
      alert(err.message || 'Invalid Email or Password.');
      setToken(null);
    } finally {
      setApiLoading(false);
    }
  };

  const handleStaffSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Tenant suspension check
    const activeCompany = db.companies.find(c => c.id === db.activeCompanyId);
    if (activeCompany && activeCompany.status === 'Suspended') {
      alert('This company portal has been suspended. Please contact platform support.');
      return;
    }
    if (signInRole === 'Customer') {
      const email = signInEmail.trim().toLowerCase();
      const pass = signInPass;
      const cust = db.customers.find((c) => c.email === email && c.password === pass);
      if (!cust) {
        alert('Invalid Customer Email or Password.');
        return;
      }
      setShowSignIn(false);
      localStorage.setItem(`ll_${db.activeCompanyId}_active_customer_id`, cust.id);
      localStorage.setItem('ll_active_customer_id', cust.id);
      localStorage.setItem('ll_active_workspace', 'customer');
      navigate('/customer');
      return;
    }

    // Staff Pin sign-in
    if (signInPin.trim() !== '') {
      setShowSignIn(false);
      if (signInRole === 'Delivery Boy') {
        saveDB({ activeRole: 'Delivery Boy', currentDeliveryBoy: 'John Doe' });
        localStorage.setItem('ll_activerole', 'Delivery Boy');
        localStorage.setItem('ll_active_delivery_boy', 'John Doe');
        localStorage.setItem('ll_active_workspace', 'delivery');
        navigate('/delivery');
      } else if (signInRole === 'Cashier') {
        saveDB({ activeRole: 'Cashier', currentDeliveryBoy: null });
        localStorage.setItem('ll_activerole', 'Cashier');
        localStorage.removeItem('ll_active_delivery_boy');
        localStorage.setItem('ll_active_workspace', 'admin');
        navigate('/admin');
      } else {
        saveDB({ activeRole: 'Admin', currentDeliveryBoy: null });
        localStorage.setItem('ll_activerole', 'Admin');
        localStorage.removeItem('ll_active_delivery_boy');
        localStorage.setItem('ll_active_workspace', 'admin');
        navigate('/admin');
      }
    }
  };

  const handleTrackOrder = () => {
    setTrackError('');
    setTrackResult(null);

    const matchId = trackInput.trim().toUpperCase().replace('#', '');
    if (!matchId) return;

    const order = db.orders.find((o) => o.id === matchId || o.id === 'OR-' + matchId);
    if (!order) {
      setTrackError(`No order found matching ID: #${matchId}`);
      return;
    }

    // Map internal "Received" status to "Picked Up" for customer visualization
    const displayStatus = order.status === 'Received' ? 'Picked Up' : order.status;
    setTrackResult({ ...order, displayStatus });
  };


  const handleLandingCardClick = (targetPortal: string, _subsection?: string) => {
    const activeCustId = localStorage.getItem(`ll_${db.activeCompanyId}_active_customer_id`) || localStorage.getItem('ll_active_customer_id');
    const isGuest = !localStorage.getItem('ll_activerole') && !activeCustId;
    if (isGuest) {
      setShowLogIn(true);
      setLoginRole(targetPortal === 'customer' ? 'customer' : targetPortal === 'delivery' ? 'delivery' : 'admin');
      alert('Please log in to access this workspace.');
    } else {
      if (targetPortal === 'customer') {
        navigate('/customer');
      } else if (targetPortal === 'delivery') {
        navigate('/delivery');
      } else {
        navigate('/admin');
      }
    }
  };

  return (
    <div className="landing-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* Landing Header */}
      <header className="main-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 8%', 
        background: 'rgba(255, 255, 255, 0.85)', 
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 999,
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/qubexe.logo.png" alt="Qubexe Logo" style={{ height: '50px', transform: 'scale(2.8)', transformOrigin: 'left center', objectFit: 'contain' }} />
        </div>

        {/* Center links for quick navigation */}
        <div className="nav-links" style={{ display: 'flex', gap: '28px' }}>
          {[
            { label: 'Home', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
            { label: 'Features', target: 'modules' },
            { label: 'Services', target: 'services-list' },
            { label: 'Live Tracking', target: 'tracking' },
            { label: 'Contact', action: () => document.querySelector('footer')?.scrollIntoView({ behavior: 'smooth' }) }
          ].map(lnk => (
            <a 
              key={lnk.label}
              href={lnk.target ? `#${lnk.target}` : '#'} 
              onClick={(e) => {
                e.preventDefault();
                if (lnk.action) {
                  lnk.action();
                } else if (lnk.target) {
                  document.getElementById(lnk.target)?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              style={{ color: '#475569', fontWeight: '600', fontSize: '0.92rem', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#2563eb')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#475569')}
            >
              {lnk.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="secondary-btn" 
            onClick={() => {
              setLoginRole('admin');
              setShowLogIn(true);
            }} 
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
          >
            👤 Login
          </button>

        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section hero-split" style={{ 
        display: 'flex', 
        gap: '60px', 
        padding: '100px 8%', 
        alignItems: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgba(239, 246, 255, 0.7) 0%, rgba(255, 255, 255, 1) 90%)'
      }}>
        <div className="hero-left" style={{ flex: 1.2 }}>
          <span style={{ 
            display: 'inline-block', 
            background: '#dbeafe', 
            color: '#1e40af', 
            fontSize: '0.8rem', 
            fontWeight: '800', 
            padding: '6px 16px', 
            borderRadius: '20px', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: '20px' 
          }}>
            ⚡ Pure Care, Same-day Delivery
          </span>
          <h1 style={{ fontSize: '3.4rem', fontWeight: '900', lineHeight: 1.1, marginBottom: '20px', color: '#0f172a', letterSpacing: '-1.5px' }}>
            The operating system for <span style={{ background: 'linear-gradient(to right, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>modern garment care</span>.
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.6, marginBottom: '36px', fontWeight: '500' }}>
            Book premium dry cleaning, wash & fold, or steam pressing directly online. Enjoy automated tracking, custom preferences, and doorstep pickup.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="cta-row">
              <button 
                className="primary-btn" 
                onClick={() => setShowSignUp(true)} 
                style={{ 
                  fontSize: '1.1rem', 
                  padding: '16px 36px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg,#2563eb,#7c3aed)', 
                  boxShadow: '0 8px 25px rgba(37,99,235,0.3)', 
                  fontWeight: '800', 
                  border: 'none', 
                  color: 'white', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(37,99,235,0.45)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(37,99,235,0.3)';
                }}
              >
                🛒 &nbsp;Book a Laundry Pickup
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
              {['✓ Eco-Friendly Wash', '✓ Same-Day Pickup', '✓ Real-time Tracking'].map(tag => (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '700', color: '#64748b' }}>
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="hero-image-container" style={{ flex: 1, position: 'relative', height: '400px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '6px solid white' }}>
          {heroSlides.map((slide, idx) => (
            <img
              key={slide}
              src={`/${slide}`}
              alt={`Laundra Dashboard Slide ${idx + 1}`}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: idx === slideIndex ? 1 : 0,
                transition: 'opacity 0.8s ease-in-out',
              }}
            />
          ))}
          {/* Dashboard overlay tag */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700' }}>
            🟢 Live Operations Dashboard
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="modules-section" id="modules" style={{ padding: '80px 8%' }}>
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Complete Operations Suite</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Run your entire retail counter, customer bookings, staff shifts, and route logistics with specialized modules designed for precision.</p>
        </div>
        
        <div className="modules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {[
            { id: 'pricing', icon: '🏷️', bg: '#eff6ff', color: '#2563eb', title: 'Smart Pricing & POS', desc: 'Category, customer, bulk and hotel pricing with seasonal offers — configured once, applied everywhere.' },
            { id: 'customers', icon: '👥', bg: '#fef2f2', color: '#ef4444', title: 'Customer CRM', desc: 'Wallet, credit, history, loyalty points and personal notes — a complete profile behind every order.' },
            { icon: '📢', bg: '#f0fdf4', color: '#22c55e', title: 'Promotions & Campaigns', desc: 'Festival offers, promo codes, SMS/WhatsApp campaigns and birthday wishes to keep customers coming back.' },
            { id: 'reports', icon: '📊', bg: '#faf5ff', color: '#a855f7', title: 'Reports & Analytics', desc: 'Sales, collections, expenses, profit, GST and branch reports with daily closing summaries.' },
            { id: 'expenses', icon: '💼', bg: '#fffbeb', color: '#eab308', title: 'Expense & Day Book', desc: 'Track daily expenses by category and review a clean day book for every branch you operate.' },
            { icon: '🛡️', bg: '#ecfdf5', color: '#059669', title: 'Roles & Audit Logs', desc: 'Admin, cashier, delivery boy, manager — permission-based access with full audit trails.' }
          ].map((item, sIdx) => (
            <div 
              key={sIdx} 
              className="module-card" 
              onClick={() => handleLandingCardClick('admin', item.id)} 
              style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px -3px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = item.color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.03)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div className="module-icon-box" style={{ width: '52px', height: '52px', borderRadius: '14px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: '24px' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>{item.title}</h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Service Categories Section */}
      <section className="services-section" id="services-list" style={{ padding: '80px 8%', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="services-head" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Every service category, priced and tracked.</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Configure categories, bulk contracts and hotel pricing once. Rules apply automatically at the POS, on the customer portal and across every delivery.</p>
        </div>
        
        <div className="service-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {['Wash & Fold', 'Dry Cleaning', 'Steam Press', 'Premium Services', 'Express Services', 'Hotel Laundry', 'Commercial Laundry'].map((cat, idx) => {
            const thumbs = [
              'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&q=80&w=300',
              'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=300',
              'https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&q=80&w=300',
              'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=300',
              'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&q=80&w=300',
              'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&q=80&w=300',
              'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=300'
            ];
            return (
              <div 
                key={cat} 
                className="service-category-card" 
                onClick={() => handleLandingCardClick('admin')} 
                style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = '#2563eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <img src={thumbs[idx]} alt={cat} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                <div style={{ padding: '20px' }}>
                  <h4 style={{ fontWeight: '800', fontSize: '1.05rem', margin: '0 0 8px 0', color: '#0f172a' }}>{cat}</h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Priced, packed and processed safely under laundry standards.</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Order Tracking section */}
      <section id="tracking" style={{ padding: '80px 8%', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '60px', alignItems: 'center', maxWidth: '1100px', margin: '0 auto' }}>
          <div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', lineHeight: 1.2 }}>Live Order Tracking for Every Customer</h2>
            <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.7, marginBottom: '28px' }}>Customers receive SMS updates and can track their garment's journey from pickup → washing → pressing → delivery on a real-time progress map.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
                <span style={{ width: '28px', height: '28px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem' }}>✓</span>
                Real-time GPS courier location
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
                <span style={{ width: '28px', height: '28px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem' }}>✓</span>
                Auto SMS + WhatsApp status alerts
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
                <span style={{ width: '28px', height: '28px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem' }}>✓</span>
                6-stage pipeline tracker on customer portal
              </li>
            </ul>
          </div>
          
          <div style={{ background: '#f0f7ff', borderRadius: '24px', padding: '36px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1.5px solid #bfdbfe', boxShadow: '0 10px 25px -5px rgba(59,130,246,0.05)' }}>
            <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#2563eb', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Track Order Status</div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Enter your Order ID below to track your garment's live journey.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                placeholder="e.g. #OR-8842"
                style={{ flex: 1, padding: '14px 18px', border: '2px solid #cbd5e1', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTrackOrder(); }}
              />
              <button onClick={handleTrackOrder} className="primary-btn" style={{ padding: '14px 28px', borderRadius: '12px', fontWeight: '800', fontSize: '0.92rem', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none' }}>
                Track
              </button>
            </div>
            
            {trackError && <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: '600' }}>⚠️ {trackError}</div>}
            
            {trackResult && (
              <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', marginTop: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: '800', color: '#2563eb' }}>#{trackResult.id}</span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Branch: {trackResult.branch}</div>
                  </div>
                  <span className={`status-badge status-${trackResult.displayStatus.toLowerCase().replace(/\s+/g,'-')}`} style={{ fontSize: '0.8rem', height: 'fit-content' }}>
                    {trackResult.displayStatus}
                  </span>
                </div>

                {/* Progress Pipeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '24px 0 32px 0', padding: '0 10px' }}>
                  {/* Progress Line */}
                  <div style={{ position: 'absolute', top: '10px', left: '20px', right: '20px', height: '4px', background: '#e2e8f0', zIndex: 1 }}>
                    <div style={{ 
                      height: '100%', 
                      background: 'linear-gradient(to right, #2563eb, #10b981)', 
                      width: 
                        trackResult.status === 'Pending' ? '0%' :
                        trackResult.status === 'Accepted' ? '20%' :
                        trackResult.status === 'Received' ? '40%' :
                        ['Washing', 'Ironing'].includes(trackResult.status) ? '60%' :
                        trackResult.status === 'Ready' ? '80%' :
                        trackResult.status === 'Out for Delivery' ? '90%' :
                        trackResult.status === 'Delivered' ? '100%' : '0%'
                    }} />
                  </div>
                  {[
                    { label: 'Placed', active: true },
                    { label: 'Received', active: ['Received', 'Washing', 'Ironing', 'Ready', 'Out for Delivery', 'Delivered'].includes(trackResult.status) },
                    { label: 'Processing', active: ['Washing', 'Ironing', 'Ready', 'Out for Delivery', 'Delivered'].includes(trackResult.status) },
                    { label: 'Ready', active: ['Ready', 'Out for Delivery', 'Delivered'].includes(trackResult.status) },
                    { label: 'Delivered', active: trackResult.status === 'Delivered' }
                  ].map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative' }}>
                      <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: step.active ? '#10b981' : '#fff', 
                        border: `2.5px solid ${step.active ? '#10b981' : '#cbd5e1'}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        {step.active ? '✓' : ''}
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: step.active ? '#0f172a' : '#64748b', marginTop: '6px' }}>{step.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong>Customer:</strong> {trackResult.customerName}</div>
                  <div><strong>Items:</strong> {trackResult.weightItems}</div>
                  {trackResult.courier && <div><strong>Assigned Courier:</strong> 👤 {trackResult.courier === 'All' ? 'All Delivery Staff' : trackResult.courier}</div>}
                  {trackResult.phone && <div><strong>Contact:</strong> 📞 {trackResult.phone}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SAAS Closing Statistics Banner */}
      <section className="analytics-banner" style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', padding: '80px 8%', background: '#0f172a', color: 'white' }}>
        <div className="analytics-left" style={{ flex: 1.5 }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '20px', lineHeight: 1.2 }}>Close the day with confidence.</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '32px' }}>Sales, collections, pending orders, expenses, profit and GST — daily closing reports generated automatically, exportable to Excel and PDF, ready for every branch.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="primary-btn" style={{ background: 'white', color: '#0f172a', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: '700' }} onClick={() => handleLandingCardClick('admin', 'reports')}>Book a walkthrough</button>
            <button className="secondary-btn" style={{ border: '1px solid #475569', color: 'white', background: 'transparent', padding: '12px 24px', borderRadius: '8px', fontWeight: '700' }} onClick={() => alert('Brochure download (TODO)')}>Download brochure</button>
          </div>
        </div>
        <div className="analytics-right-grid" style={{ flex: 1.2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px' }}>SALES THIS MONTH</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '8px' }}>QR 128,940</div>
          </div>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px' }}>ORDERS PROCESSED</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '8px' }}>6,214</div>
          </div>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px' }}>LOYALTY MEMBERS</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '8px' }}>3,480</div>
          </div>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px' }}>ON-TIME RATE</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '8px' }}>99.4%</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#f1f5f9', padding: '60px 8%', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px', maxWidth: '1100px', margin: '0 auto' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              {db.companies.find(c => c.id === db.activeCompanyId)?.name || 'Laundra'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>The operating system for modern garment care.</p>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '24px' }}>© 2026 Laundra Technologies. All rights reserved.</p>
          </div>
          <div style={{ display: 'flex', gap: '60px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontWeight: '800', fontSize: '0.88rem', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Platform</h4>
              <a onClick={() => handleLandingCardClick('admin')} style={{ color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Security</a>
              <a onClick={() => alert('Privacy policy loaded')} style={{ color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Privacy</a>
              <a onClick={() => alert('Terms of service loaded')} style={{ color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Terms</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontWeight: '800', fontSize: '0.88rem', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Company</h4>
              <a style={{ color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}>About us</a>
              <a onClick={() => alert('Careers board')} style={{ color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Careers</a>
              <a style={{ color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* --- MODAL: SIGN UP (Customer / Delivery Boy) --- */}
      {showSignUp && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: signupRole === 'delivery' && !signupOtpStep ? '520px' : '420px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #14b8a6)', padding: '24px', color: 'white', position: 'relative' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Create Account</h2>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Join Laundra for modern garment care.</p>
              <button onClick={() => { setShowSignUp(false); setSignupOtpStep(false); setSignupTempDetails(null); }} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Delivery Boy OTP Verification Step */}
            {signupRole === 'delivery' && deliveryStep === 2 ? (
              <form onSubmit={handleDeliveryStep2} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, textAlign: 'center', color: '#1e3a8a', fontWeight: '800' }}>📧 Verify Email OTP</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', margin: 0 }}>An OTP has been sent to <strong>{signupTempDetails?.email}</strong>.</p>
                {apiError && (
                  <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>
                    {apiError}
                  </div>
                )}
                <div className="form-group">
                  <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#64748b' }}>OTP Code</label>
                  <input type="text" value={signupOtpCode} onChange={e => setSignupOtpCode(e.target.value)} className="form-input" required placeholder="Enter OTP from email" disabled={apiLoading} style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '4px', fontWeight: '800' }} />
                </div>
                <button type="submit" disabled={apiLoading} className="primary-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '8px', background: apiLoading ? '#86efac' : '#16a34a', color: 'white', border: 'none', cursor: apiLoading ? 'not-allowed' : 'pointer', fontWeight: '700' }}>
                  {apiLoading ? '⏳ Verifying...' : 'Verify OTP'}
                </button>
                <button type="button" disabled={apiLoading} onClick={() => { setDeliveryStep(1); setSignupTempDetails(null); setApiError(''); }} style={{ width: '100%', padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: apiLoading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>← Back to Form</button>
              </form>
            ) : signupRole === 'delivery' && deliveryStep === 3 ? (
              <form onSubmit={handleDeliveryStep3} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, textAlign: 'center', color: '#1e3a8a', fontWeight: '800' }}>🔐 Create Password</h3>
                {apiError && (
                  <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: '#92400e', fontWeight: '600' }}>
                    {apiError}
                  </div>
                )}
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="form-input" required placeholder="••••••••" />
                </div>
                <button type="submit" disabled={apiLoading} className="primary-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '8px', background: apiLoading ? '#86efac' : '#16a34a', color: 'white', border: 'none', cursor: apiLoading ? 'not-allowed' : 'pointer', fontWeight: '700' }}>
                  {apiLoading ? '⏳ Finishing...' : 'Complete Setup'}
                </button>
              </form>
            ) : (
              <form onSubmit={signupRole === 'customer' ? handleCustomerSignUpSubmit : handleDeliveryStep1} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Role Selector */}
                <div className="form-group">
                  <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Register As</label>
                  <select value={signupRole} onChange={e => setSignupRole(e.target.value as any)} className="form-input" style={{ height: '48px', fontWeight: '600' }}>
                    <option value="customer">🛍️ Customer</option>
                    <option value="delivery">🚚 Delivery Staff</option>
                  </select>
                </div>

                {/* Searchable Company Selector */}
                <div className="form-group">
                  <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Select Laundry Company</label>
                  <input
                    type="text"
                    value={companySearch}
                    onChange={e => setCompanySearch(e.target.value)}
                    className="form-input"
                    placeholder="🔍 Search company..."
                    style={{ marginBottom: '6px', fontSize: '0.82rem' }}
                  />
                  <select
                    value={db.activeCompanyId || ''}
                    onChange={(e) => changeActiveCompany(e.target.value)}
                    className="form-input"
                    required
                    style={{ height: '48px', fontWeight: '600' }}
                  >
                    <option value="" disabled>-- Select Company --</option>
                    {publicCompanies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.address ? `, ${c.address}` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Common Fields */}
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="form-input" required placeholder="e.g. Selena Gomez" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="form-input" required placeholder="selena@example.com" />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Phone</label>
                    <input type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="form-input" required placeholder="+1234567890" />
                  </div>
                  {signupRole === 'customer' && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Password</label>
                      <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="form-input" required placeholder="••••••••" />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input type="text" value={signupAddress} onChange={(e) => setSignupAddress(e.target.value)} className="form-input" required placeholder="102 Ocean View Apt" />
                </div>

                {/* Delivery Boy specific fields */}
                {signupRole === 'delivery' && (
                  <>
                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: '800', color: '#1e3a8a' }}>🚚 Vehicle & Documents</h4>
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Vehicle Type</label>
                        <select value={signupVehicleType} onChange={e => setSignupVehicleType(e.target.value)} className="form-input" style={{ height: '42px' }}>
                          <option value="Bike">Bike</option>
                          <option value="Scooter">Scooter</option>
                          <option value="Car">Car</option>
                          <option value="Van">Van</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Vehicle Number</label>
                        <input type="text" value={signupVehicleNumber} onChange={e => setSignupVehicleNumber(e.target.value)} className="form-input" required placeholder="KA-05-CD-9999" />
                      </div>
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>License Number</label>
                        <input type="text" value={signupLicenseNumber} onChange={e => setSignupLicenseNumber(e.target.value)} className="form-input" required placeholder="DL-12345" />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Vehicle RC</label>
                        <input type="text" value={signupVehicleRc} onChange={e => setSignupVehicleRc(e.target.value)} className="form-input" required placeholder="RC-12345" />
                      </div>
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.72rem' }}>Profile Photo URL</label>
                        <input type="text" value={signupProfilePhoto} onChange={e => setSignupProfilePhoto(e.target.value)} className="form-input" placeholder="https://..." style={{ fontSize: '0.78rem' }} />
                      </div>
                    </div>
                  </>
                )}

                <button type="submit" disabled={apiLoading} className="primary-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px', borderRadius: '8px', background: apiLoading ? '#6b9fd4' : (signupRole === 'delivery' ? '#2563eb' : '#2563eb'), color: 'white', border: 'none', cursor: apiLoading ? 'not-allowed' : 'pointer', fontWeight: '700' }}>
                  {apiLoading ? '⏳ Sending OTP...' : (signupRole === 'delivery' ? 'Next: Send OTP' : '🛍️ Create Account')}
                </button>
                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Already have an account?</span> &nbsp;
                  <a onClick={() => { setShowSignUp(false); setShowLogIn(true); }} style={{ color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>Log In</a>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: PORTAL LOG IN --- */}
      {showLogIn && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px', overflow: 'hidden', padding: 0, background: 'white' }}>
            <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', padding: '24px', color: 'white', position: 'relative' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Secure Login</h2>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Select your portal and enter credentials.</p>
              <button onClick={() => setShowLogIn(false)} className="icon-btn" style={{ position: 'absolute', right: '16px', top: '16px', color: 'white', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleLogInSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Select Portal</label>
                <select 
                  value={loginRole} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setLoginRole(val);
                    if (val === 'superadmin') {
                      setLoginEmail('superadmin@laundra.com');
                    } else if (loginEmail === 'superadmin@laundra.com') {
                      setLoginEmail('');
                    }
                  }} 
                  className="form-input" 
                  required 
                  style={{ height: '48px', fontWeight: '600' }}
                >
                  <option value="admin">Admin Portal</option>
                  <option value="cashier">Cashier Portal</option>
                  <option value="delivery">Delivery Portal</option>
                  <option value="customer">Customer Portal</option>
                  <option value="superadmin">Super Admin Portal</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Email Address</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="form-input" required placeholder="name@domain.com" style={{ height: '48px', fontWeight: 500 }} />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Password</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="form-input" required placeholder="••••••••" style={{ height: '48px', fontWeight: 500 }} />
              </div>
              <button type="submit" className="primary-btn" style={{ height: '52px', fontSize: '1.05rem', marginTop: '8px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>Authenticate</button>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: PIN / STAFF AUTH --- */}
      {showSignIn && (
        <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content colorful-modal" style={{ maxWidth: '800px', padding: 0, borderRadius: '16px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'row', background: 'white' }}>
            <button onClick={() => setShowSignIn(false)} className="icon-btn" style={{ position: 'absolute', right: '20px', top: '20px', zIndex: 10, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            
            {/* Colorful Left Side */}
            <div className="colorful-modal-left" style={{ flex: 1.2, background: 'linear-gradient(135deg, #1d4ed8, #7c3aed, #ec4899)', padding: '50px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', color: 'white' }}>
               <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: '24px', backdropFilter: 'blur(10px)' }}>✨</div>
               <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '0 0 16px 0', color: 'white', lineHeight: 1.1 }}>Welcome<br />Back</h2>
               <p style={{ fontSize: '1rem', opacity: 0.9, margin: 0, lineHeight: 1.6, fontWeight: 500 }}>Sign in to access your Laundra dashboard. Manage orders, customers, and operations all in one seamless workspace.</p>
            </div>

            {/* Right Side Form */}
            <div className="colorful-modal-right" style={{ flex: 1.5, padding: '50px 40px', background: 'white' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: '0 0 24px 0' }}>Authentication</h3>

              <form onSubmit={handleStaffSignInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="signInRole" style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Account Type</label>
                  <select id="signInRole" value={signInRole} onChange={(e) => setSignInRole(e.target.value)} required style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #cbd5e1', height: '48px', padding: '0 14px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                    <option value="Admin">Administrator</option>
                    <option value="Cashier">Cashier Agent</option>
                    <option value="Delivery Boy">Delivery Staff</option>
                    <option value="Customer">Customer</option>
                  </select>
                </div>
                
                {signInRole !== 'Customer' ? (
                  <div id="signInStaffFields" className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="signInPin" style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Security PIN</label>
                    <input type="password" value={signInPin} onChange={(e) => setSignInPin(e.target.value)} id="signInPin" placeholder="••••" style={{ width: '100%', letterSpacing: '12px', textAlign: 'center', fontSize: '1.5rem', height: '54px', fontWeight: '800', borderRadius: '8px', border: '1.5px solid #cbd5e1' }} />
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '8px', textAlign: 'center', fontWeight: '700', display: 'block', background: '#eff6ff', padding: '6px', borderRadius: '6px' }}>Demo Hint: Enter any PIN (e.g. 1234)</span>
                  </div>
                ) : (
                  <div id="signInCustomerFields" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="signInEmail" style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Email Address</label>
                      <input type="email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} id="signInEmail" placeholder="you@example.com" style={{ width: '100%', height: '48px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: '600', padding: '0 14px' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="signInPass" style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Password</label>
                      <input type="password" value={signInPass} onChange={(e) => setSignInPass(e.target.value)} id="signInPass" placeholder="••••••••" style={{ width: '100%', height: '48px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: '600', padding: '0 14px' }} />
                    </div>
                  </div>
                )}
                
                <div className="modal-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginTop: '16px', border: 'none', padding: 0 }}>
                  <button type="button" onClick={() => setShowSignIn(false)} className="secondary-btn" style={{ justifyContent: 'center', height: '48px', padding: 0, fontSize: '1rem', fontWeight: '700' }}>Cancel</button>
                  <button type="submit" className="primary-btn" style={{ justifyContent: 'center', height: '48px', padding: 0, fontSize: '1rem', fontWeight: '800', background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)', color: 'white', border: 'none', cursor: 'pointer' }}>Sign In</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
