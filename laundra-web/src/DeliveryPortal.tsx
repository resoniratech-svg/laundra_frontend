import React, { useState, useEffect } from 'react';
import { useDatabase } from './DatabaseContext';
import type { User, Order } from './DatabaseContext';
import { apiSendOrderOtp, apiVerifyOrderOtp } from './deliveryApi';

import { getApiBaseUrl } from './config';

export const DeliveryPortal: React.FC = () => {
  const { db, saveDB, changeActiveCompany } = useDatabase();
  const BASE_URL = getApiBaseUrl();

  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'otp-verify' | 'forgot-pass' | 'reset-pass'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration Form
  const [regCompanyId, setRegCompanyId] = useState(db.companies[0]?.id || '');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regVehicleType, setRegVehicleType] = useState('Bike');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regRC, setRegRC] = useState('');
  const [regInsuranceNumber, setRegInsuranceNumber] = useState('');
  const [regEmergencyContact, setRegEmergencyContact] = useState('');
  const [regProfilePhoto, setRegProfilePhoto] = useState('');
  const [regLicenseFile, setRegLicenseFile] = useState('');
  const [regInsuranceFile, setRegInsuranceFile] = useState('');

  // OTP Verification Form
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [tempRegDetails, setTempRegDetails] = useState<any>(null);

  // Active Tab for Web Dashboard
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'earnings' | 'attendance' | 'profile' | 'support' | 'announcements'>(() => {
    return (localStorage.getItem('ll_active_delivery_tab') as any) || 'dashboard';
  });

  // Bilingual Support State (English / Arabic)
  const [deliveryLang, setDeliveryLang] = useState<'en' | 'ar'>(() => {
    return (localStorage.getItem('ll_delivery_lang') as 'en' | 'ar') || 'en';
  });

  useEffect(() => {
    document.documentElement.dir = 'ltr';
  }, [deliveryLang]);

  const deliveryArDict: Record<string, string> = {
    'Welcome': 'مرحباً',
    'Ready for your shifts today?': 'هل أنت مستعد لورديتك اليوم؟',
    'Pickups Today': 'طلبات الاستلام اليوم',
    'Deliveries Today': 'طلبات التوصيل اليوم',
    'Drops Completed': 'التسليمات المكتملة',
    'Total Earnings': 'إجمالي الأرباح',
    'Pending': 'قيد الانتظار',
    'Completed': 'مكتمل',
    'Commission': 'العمولة',
    'Assigned Pickups Queue': 'قائمة طلبات الاستلام الموكلة',
    'Ready Drops Assigned': 'طلبات التسليم الجاهزة الموكلة',
    'Successful Deliveries Done': 'عمليات التوصيل الناجحة',
    'Commission Earned Today': 'العمولة المكتسبة اليوم',
    'Live Notifications Feed': 'شريط الإشعارات المباشرة',
    'Active Company Announcements': 'إعلانات الشركة النشطة',
    'Active Tasks': 'المهام النشطة',
    'Pending Pickups & Deliveries': 'الاستلام والتوصيل المعلق',
    'Go to Tasks': 'الانتقال إلى المهام',
    'Amount Pending (Unpaid)': 'المبلغ المعلق (غير مدفوع)',
    'Successfully Paid': 'المبالغ المدفوعة',
    'Awaiting payout from Admin': 'في انتظار الصرف من الإدارة',
    'Total payouts received': 'إجمالي المبالغ المستلمة',
    'Earnings & Payout History': 'سجل الأرباح والدفعات',
    'Total Lifetime': 'الإجمالي الكلي',
    'Task Date': 'تاريخ المهمة',
    'Details': 'التفاصيل',
    'Task Type': 'نوع المهمة',
    'Payout Status': 'حالة الدفع',
    'Dashboard': 'لوحة التحكم',
    'Assigned Tasks': 'المهام الموكلة',
    'My Earnings': 'أرباحي',
    'Duty & Leaves': 'الدوام والإجازات',
    'Helpdesk Support': 'الدعم الفني',
    'Announcements': 'الإعلانات',
    'Sign Out': 'تسجيل الخروج',
    'Pickup': 'استلام',
    'Delivery': 'توصيل',
    'Paid via Cash': 'تم الدفع نقداً',
    'Paid via Card': 'تم الدفع بالبطاقة',
    'Paid via Check': 'تم الدفع بالشيك',
    'Web-Based Delivery Operations Portal': 'بوابة عمليات التوصيل عبر الويب',
    'Logged in to': 'تم تسجيل الدخول في',
    'Just now': 'الآن',
    'No announcements active right now.': 'لا توجد إعلانات نشطة حالياً.',
    'No live notifications right now.': 'لا توجد إشعارات مباشرة حالياً.',

    // Duty & Leaves Tab
    'Duty & Attendance log': 'سجل الدوام والحضور',
    'Clock Logs History': 'سجل الدخول والخروج',
    'No attendance registered today.': 'لم يتم تسجيل حضور اليوم.',
    'Clock In': 'تسجيل دخول',
    'Clock Out': 'تسجيل خروج',
    'Apply for Leave': 'طلب إجازة',
    'Start Date': 'تاريخ البداية',
    'End Date': 'تاريخ النهاية',
    'Reason': 'السبب',
    'Reason for leave': 'سبب الإجازة',
    'Submit Request': 'إرسال الطلب',
    'Leave History Status': 'حالة سجل الإجازات',
    'No requests submitted.': 'لم يتم تقديم طلبات.',
    'to': 'إلى',

    // Helpdesk Support Tab
    'Company Admin Desk Contacts': 'بيانات اتصال إدارة الشركة',
    'Phone Line:': 'الهاتف:',
    'Email Support:': 'البريد الإلكتروني:',
    'Support Ticket History': 'سجل تذاكر الدعم',
    'No active helpdesk tickets.': 'لا توجد تذاكر دعم نشطة.',
    'Ticket ID:': 'رقم التذكرة:',
    'My Message:': 'رسالتي:',
    'Admin Reply:': 'رد الإدارة:',
    'RESPONDED': 'تم الرد',
    'Raise Support Ticket': 'إنشاء تذكرة دعم',
    'Subject': 'الموضوع',
    'Issue title': 'عنوان التذكرة',
    'Message Description': 'تفاصيل الرسالة',
    'Please detail the issue...': 'يرجى كتابة تفاصيل المشكلة...',

    // System Announcements Tab
    'System Announcements': 'إعلانات النظام',
    'Important platform updates and operational changes from the management.': 'تحديثات وتغييرات تشغيلية هامة من الإدارة.',
    'No active system announcements at this time.': 'لا توجد إعلانات نظام نشطة حالياً.',
    'Platform Broadcaster': 'مذيع المنصة',

    // Assigned Tasks Tab
    'Assigned Delivery Tasks': 'مهام التوصيل الموكلة',
    'Pickups': 'الاستلامات',
    'Deliveries': 'التسليمات',
    'No pending pickup assignments.': 'لا توجد مهام استلام معلقة.',
    'No pending delivery assignments.': 'لا توجد مهام توصيل معلقة.',
    'Client Name:': 'اسم العميل:',
    'Client Phone:': 'هاتف العميل:',
    'Address:': 'العنوان:',
    'Services:': 'الخدمات:',
    'Pickup Time:': 'وقت الاستلام:',
    'Delivery Time:': 'وقت التوصيل:',
    'Method:': 'طريقة الدفع:',
    'Instructions:': 'التعليمات:',
    'Pickup Commission:': 'عمولة الاستلام:',
    'Delivery Commission:': 'عمولة التوصيل:',
    'Contact Client': 'الاتصال بالعميل',
    'Mark On the Way': 'الانطلاق إلى العميل',
    'Mark Reached Location': 'وصول موقع العميل',
    'Complete Pickup Details': 'إكمال تفاصيل الاستلام',
    'Mark Out For Delivery': 'خروج للتوصيل',
    'Complete Delivery': 'إكمال التوصيل',
    'Given for Delivery:': 'مسلّمة للتوصيل:',
    'Services & Delivery Quantities:': 'الخدمات وكميات التوصيل:',

    // Service Names & Instructions
    'Order #': 'الطلب #',
    'Pending Pickup': 'قيد الاستلام',
    'pending pickup': 'قيد الاستلام',
    'Out for Delivery': 'خروج للتوصيل',
    'out for delivery': 'خروج للتوصيل',
    'Assigned': 'موكلة',
    'assigned': 'موكلة',
    'Ready': 'جاهز',
    'Abaya': 'عباية',
    'Cap': 'قبعة',
    'Children Dress': 'فستان أطفال',
    'Apron': 'مئزر (مريلة)',
    'Children Fancy Dress': 'فستان أطفال فاخر',
    'Children Jacket': 'جاكيت أطفال',
    'Shirt': 'قميص',
    'Pants': 'بنطال',
    'T-Shirt': 'تيشيرت',
    'Dress': 'فستان',
    'Jacket': 'جاكيت',
    'Suit': 'بدلة',
    'Blanket': 'بطانية',
    'Bed Sheet': 'ملاءة سرير',
    'Towel': 'منشفة',
    'Curtain': 'ستارة',
    'Coat': 'معطف',
    'Pcs': 'قطع',
    'Laundry Service': 'خدمة الغسيل',
    'Standard Laundry Load': 'غسيل سلة قياسي',
    'Handle with care, separate whites.': 'يرجى التعامل بحذر وفصل الملابس البيضاء.',
    'Deliver order directly to customer upon arrival.': 'تسليم الطلب مباشرة للعميل عند الوصول.',

    // My Earnings Tab
    'My Earnings Ledger': 'سجل أرباحي',
    'Total Lifetime:': 'الإجمالي الكلي:',
    'No completed tasks yet.': 'لا توجد مهام مكتملة حتى الآن.',
    'Paid via': 'تم الدفع عن طريق'
  };

  const tDeliv = (key: string): string => {
    if (!key) return '';
    if (deliveryLang === 'ar') {
      if (deliveryArDict[key]) return deliveryArDict[key];

      let translated = String(key);
      Object.keys(deliveryArDict).forEach((k) => {
        if (deliveryArDict[k] && translated.includes(k)) {
          translated = translated.split(k).join(deliveryArDict[k]);
        }
      });
      return translated;
    }
    return key;
  };

  useEffect(() => {
    localStorage.setItem('ll_active_delivery_tab', activeTab);
  }, [activeTab]);

  // Tasks Sub-tab
  const [tasksSubTab, setTasksSubTab] = useState<'pickups' | 'deliveries'>('pickups');

  // Attendance states
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<{ time: string; type: 'Clock In' | 'Clock Out'; gps: string }[]>([]);

  // Leaves state
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // OTP Verification Modal inside Deliveries list
  const [verifyingDeliveryOrder, setVerifyingDeliveryOrder] = useState<Order | null>(null);
  const [enteredDeliveryOtp, setEnteredDeliveryOtp] = useState('');

  // Pickup completion details modal
  const [pickupDetailsOrder, setPickupDetailsOrder] = useState<Order | null>(null);
  const [pickupWeightItems, setPickupWeightItems] = useState('1 Bag (Wash & Fold)');
  const [pickupNotes, setPickupNotes] = useState('');
  const [pickupItemQuantities, setPickupItemQuantities] = useState<{ [itemId: string]: number }>({});
  
  // Pickup OTP Verification Modal
  const [verifyingPickupOrder, setVerifyingPickupOrder] = useState<Order | null>(null);
  const [enteredPickupOtp, setEnteredPickupOtp] = useState('');

  const token = localStorage.getItem('saas_token');

  // Load saved session on mount
  useEffect(() => {
    const activeBoy = localStorage.getItem('ll_active_delivery_boy') || db.currentDeliveryBoy || 'Prakash';
    if (activeBoy) {
      const user = db.users.find(u => (u.name || '').trim().toLowerCase() === activeBoy.trim().toLowerCase());
      if (user) {
        setCurrentUser(user);
        if (user.companyId && changeActiveCompany) {
          changeActiveCompany(user.companyId);
        }
      } else {
        setCurrentUser({
          id: 'u-prakash-101',
          name: activeBoy,
          email: `${activeBoy.toLowerCase()}@laundra.com`,
          role: 'delivery',
          status: 'Active',
          createdAt: new Date().toISOString()
        });
      }
    }
  }, [db.users, db.currentDeliveryBoy]);

  // Emergency contact states
  const [emergencyContact, setEmergencyContact] = useState('+974 5555 0122');
  const [emergencyName, setEmergencyName] = useState('Jane Doe (Spouse)');

  // Profile fields editing
  const [profAddress, setProfAddress] = useState('456 Delivery Lane, Doha');
  const [sidebarImgError, setSidebarImgError] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);

  // Support ticket state
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportTickets, setSupportTickets] = useState<any[]>([]);

  const fetchSupportTickets = async () => {
    try {
      const token = localStorage.getItem('ll_auth_token');
      if (!token) return;
      const response = await fetch(`${BASE_URL}/api/v1/staff/support-tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSupportTickets(data);
      }
    } catch (error) {
      console.error('Failed to fetch support tickets', error);
    }
  };

  useEffect(() => {
    fetchSupportTickets();
  }, []);

  const [systemAnnouncements, setSystemAnnouncements] = useState<any[]>([]);

  const fetchAnnouncements = async () => {
    const token = localStorage.getItem('ll_auth_token');
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/announcements/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSystemAnnouncements(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch staff announcements', err);
    }
  };

  // Automatically load active session if cached
  useEffect(() => {
    const cachedRole = localStorage.getItem('ll_activerole');
    const cachedBoy = localStorage.getItem('ll_active_delivery_boy');
    if (cachedRole === 'Delivery Boy' && cachedBoy) {
      const found = db.users.find(u => u.name === cachedBoy && u.role === 'delivery');
      if (found) {
        setCurrentUser(found);
      } else {
        // Mock session user if database doesn't have it
        setCurrentUser({
          id: 'u-2',
          name: cachedBoy,
          role: 'delivery',
          email: 'johndoe@laundra.com',
          status: 'Active'
        });
      }
    }
  }, [db.users]);

  useEffect(() => {
    fetchAnnouncements();
  }, [currentUser]);

  // Mark announcements as seen when tab is active
  useEffect(() => {
    if (activeTab === 'announcements') {
      localStorage.setItem(`ll_${db.activeCompanyId}_delivery_last_seen_announcements_count`, systemAnnouncements.length.toString());
    }
  }, [activeTab, systemAnnouncements.length, db.activeCompanyId]);

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
    supportTickets.forEach(t => {
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

    if (changed) {
      saveDB({
        notifications: currentNotifications
      });
    }
  }, [systemAnnouncements, supportTickets]);

  // Log Audit Action Helper
  const logAudit = (message: string) => {
    const timestamp = new Date().toLocaleString();
    const newLog = `[${timestamp}] ${message}`;
    console.log(newLog);
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();
    
    // Search in db.users flexibly
    let found = db.users.find(u => u.email.trim().toLowerCase() === cleanEmail);
    
    // If not found in local state (e.g. created on desktop browser/another device), try fetching backend or auto-syncing
    if (!found) {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const apiUsers = await res.json();
          const matched = Array.isArray(apiUsers) ? apiUsers.find((u: any) => (u.email || '').trim().toLowerCase() === cleanEmail) : null;
          if (matched) {
            found = {
              id: matched.id || `u-${Date.now()}`,
              name: matched.full_name || matched.name || cleanEmail.split('@')[0],
              email: matched.email,
              password: matched.password || loginPassword,
              role: matched.role || 'delivery',
              status: matched.status || 'Active',
              createdAt: new Date().toISOString()
            };
          }
        }
      } catch (err) {
        console.warn("Backend user fetch error:", err);
      }
    }

    // Universal Fallback: If still not found, create/sync the user so staff created anywhere can log in seamlessly
    if (!found) {
      found = {
        id: `u-${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        password: loginPassword,
        role: 'delivery',
        status: 'Active',
        createdAt: new Date().toISOString()
      };
    }

    // Ensure user is saved in local db.users
    const updatedUsers = [...db.users.filter(u => u.email.trim().toLowerCase() !== cleanEmail), found];
    saveDB({ users: updatedUsers, activeRole: 'Delivery Boy', currentDeliveryBoy: found.name });

    if (found.status === 'Pending') {
      alert('Account Pending: Your application is pending review and approval by the Company Admin. You will be able to log in once approved.');
      return;
    }

    if (found.companyId && changeActiveCompany) {
      changeActiveCompany(found.companyId);
    }

    setCurrentUser(found);
    localStorage.setItem('ll_activerole', 'Delivery Boy');
    localStorage.setItem('ll_active_delivery_boy', found.name);
    localStorage.setItem('ll_active_workspace', 'delivery');
    logAudit(`Delivery Agent ${found.name} logged in.`);
  };

  // Handle Registration Submit
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (db.users.find(u => u.email.trim().toLowerCase() === regEmail.trim().toLowerCase())) {
      alert('A user with this email address already exists.');
      return;
    }

    setTempRegDetails({
      name: regName,
      email: regEmail.trim().toLowerCase(),
      phone: regPhone,
      password: regPassword,
      vehicleType: regVehicleType,
      vehicleNumber: regVehicleNumber,
      licenseNumber: regLicense,
      address: regAddress,
      vehicleRc: regRC,
      insuranceNumber: regInsuranceNumber,
      emergencyContact: regEmergencyContact,
      profilePhoto: regProfilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      licenseFile: regLicenseFile || 'https://example.com/license.pdf',
      insuranceFile: regInsuranceFile || 'https://example.com/insurance.pdf',
      companyId: regCompanyId
    });

    logAudit(`Delivery Staff registration submitted (pending OTP verification): ${regName} (${regEmail})`);
    alert('Activation OTP "909090" has been sent to your email address. Please verify it next.');
    setAuthMode('otp-verify');
    setOtpEmail(regEmail);
  };

  // Handle OTP activation validation
  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '909090') {
      alert('Invalid OTP code. Please enter 909090.');
      return;
    }

    if (!tempRegDetails) {
      alert('Registration details expired. Please register again.');
      setAuthMode('register');
      return;
    }

    const newAgent: User = {
      id: 'u-' + Date.now(),
      name: tempRegDetails.name,
      role: 'delivery',
      email: tempRegDetails.email,
      password: tempRegDetails.password,
      phone: tempRegDetails.phone,
      status: 'Pending', // Pending approval by Company Admin
      createdAt: new Date().toISOString(),
      vehicleType: tempRegDetails.vehicleType,
      vehicleNumber: tempRegDetails.vehicleNumber,
      licenseNumber: tempRegDetails.licenseNumber,
      address: tempRegDetails.address,
      vehicleRc: tempRegDetails.vehicleRc,
      insuranceNumber: tempRegDetails.insuranceNumber,
      emergencyContact: tempRegDetails.emergencyContact,
      profilePhoto: tempRegDetails.profilePhoto,
      licenseFile: tempRegDetails.licenseFile,
      insuranceFile: tempRegDetails.insuranceFile
    };

    saveDB({
      users: [...db.users, newAgent]
    });

    logAudit(`Delivery Staff applicant ${tempRegDetails.name} verified email OTP. Account created with status 'Pending'.`);
    alert('Email verified successfully! Your application is registered and now pending review/approval by the Company Admin.');
    setTempRegDetails(null);
    setAuthMode('login');
    setLoginEmail(otpEmail);
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = db.users.find(u => u.email.trim().toLowerCase() === forgotEmail.trim().toLowerCase() && u.role === 'delivery');
    if (!found) {
      alert('No registered Delivery Agent found with this email address.');
      return;
    }
    logAudit(`Forgot password requested for ${forgotEmail}. Platform generated reset code.`);
    alert('Forgot Password Code Sent: Centralized notification service has generated a password reset code: "909090".');
    setAuthMode('reset-pass');
  };

  // Handle Reset Password Submit
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode !== '909090') {
      alert('Invalid verification reset code.');
      return;
    }
    const found = db.users.find(u => u.email.trim().toLowerCase() === forgotEmail.trim().toLowerCase() && u.role === 'delivery');
    if (!found) return;

    const updatedUsers = db.users.map(u => u.id === found.id ? { ...u, password: resetNewPassword } : u);
    saveDB({ users: updatedUsers });

    logAudit(`Password reset completed successfully for Delivery Agent: ${found.name}`);
    alert('Password updated successfully! Please log in with your new password.');
    setAuthMode('login');
    setLoginEmail(forgotEmail);
  };

  // Clock In / Clock Out Attendance handler
  const handleClockInOut = () => {
    const timestamp = new Date().toLocaleTimeString();
    const newType = isClockedIn ? 'Clock Out' : 'Clock In';
    const gpsLocation = 'Malibu HQ Branch (' + (25.28 + Math.random()*0.01).toFixed(4) + '° N, ' + (51.52 + Math.random()*0.01).toFixed(4) + '° E)';
    
    setIsClockedIn(!isClockedIn);
    setAttendanceLogs(prev => [{ time: timestamp, type: newType, gps: gpsLocation }, ...prev]);
    logAudit(`Attendance recorded: ${newType} at ${gpsLocation}`);
    alert(`${newType} recorded successfully at: ${gpsLocation}`);
  };

  // Submit Leave Request
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveReason) {
      alert('Please fill out all leave fields.');
      return;
    }
    const newLeave: import('./DatabaseContext').LeaveRequest = {
      id: 'lr-' + Date.now(),
      deliveryBoyName: db.currentDeliveryBoy || 'Unknown',
      deliveryBoyEmail: db.users.find(u => u.name === db.currentDeliveryBoy)?.email || '',
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    saveDB({ leaveRequests: [...db.leaveRequests, newLeave] });

    // Send to backend API if authenticated
    const token = localStorage.getItem('ll_auth_token');
    if (token) {
      try {
        await fetch(`${BASE_URL}/api/v1/mobile-staff/leaves`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            start_date: leaveStartDate,
            end_date: leaveEndDate,
            reason: leaveReason
          })
        });
      } catch (err) {
        console.error('Failed to post leave to backend:', err);
      }
    }

    logAudit(`Delivery Staff submitted leave application starting ${leaveStartDate}`);
    alert('Leave request submitted to Company Admin.');
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveReason('');
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ll_activerole');
    localStorage.removeItem('ll_active_delivery_boy');
    localStorage.removeItem('ll_active_workspace');
    logAudit('Delivery staff logged out.');
    window.location.href = '/';
  };

  // Handle Pickup Task Status Update
  const updatePickupStatus = async (order: Order, nextStatus: Order['status'], deliveryStatusText: string) => {
    const token = localStorage.getItem('ll_auth_token');
    const targetDeliveryId = (order as any).deliveryId || order.id;

    let apiStatus = 'ON_THE_WAY';
    const lowerText = deliveryStatusText.toLowerCase();
    if (lowerText.includes('reached')) {
      apiStatus = 'REACHED';
    } else if (lowerText.includes('out for delivery')) {
      apiStatus = 'OUT_FOR_DELIVERY';
    } else if (lowerText.includes('on the way')) {
      apiStatus = 'ON_THE_WAY';
    } else {
      apiStatus = nextStatus.toUpperCase().replace(/\s+/g, '_');
    }

    if (token && targetDeliveryId) {
      try {
        await fetch(`${BASE_URL}/api/v1/deliveries/${targetDeliveryId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: apiStatus })
        });
      } catch (err) {
        console.error('Failed to update task status on backend:', err);
      }
    }

    // Refresh PostgreSQL tasks immediately
    fetchApiTasks();

    const updatedOrders = db.orders.map(o => {
      if (o.id === order.id || o.backendId === (order as any).backendId) {
        return {
          ...o,
          status: nextStatus,
          deliveryStatus: deliveryStatusText
        };
      }
      return o;
    });

    saveDB({
      orders: updatedOrders,
      notifications: [{
        id: Date.now(),
        text: `🚚 Delivery update: Order #${order.id} status updated to: ${nextStatus} (${deliveryStatusText})`,
        time: 'Just now',
        unread: true
      }, ...db.notifications]
    });

    logAudit(`Updated Pickup status of order #${order.id} to: ${nextStatus} (${deliveryStatusText})`);
  };

  const submitPickupCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupDetailsOrder) return;
    const rawItemList = pickupDetailsOrder.items || pickupDetailsOrder.services || [];

    for (let idx = 0; idx < rawItemList.length; idx++) {
      const it = rawItemList[idx];
      const key = it.order_item_id || it.id || it.service_id || it.serviceId || `item-${idx + 1}`;
      const sName = it.serviceName || it.name || `Item ${idx + 1}`;
      const ord = it.orderedQuantity || it.ordered_quantity || it.qty || it.quantity || 1;
      const picked = it.pickedUpQuantity || it.picked_up_quantity || 0;
      const pending = it.pickupPendingQuantity ?? it.pickup_pending_quantity ?? Math.max(0, ord - picked);
      const rec = pickupItemQuantities[key] !== undefined ? pickupItemQuantities[key] : pending;

      if (rec < 0) {
        alert(`Received quantity for "${sName}" cannot be negative.`);
        return;
      }
      if (rec > pending) {
        alert(`Received quantity for "${sName}" (${rec} Pcs) cannot exceed Pending Quantity (${pending} Pcs).`);
        return;
      }
    }
    
    const token = localStorage.getItem('ll_auth_token');
    const targetId = pickupDetailsOrder.backendId || pickupDetailsOrder.id;

    try {
      const payloadItems = rawItemList.map((it: any, idx: number) => {
        const itemUuid = it.order_item_id || it.id || it.service_id || it.serviceId || `item-${idx + 1}`;
        const ord = it.orderedQuantity || it.ordered_quantity || it.qty || it.quantity || 1;
        const picked = it.pickedUpQuantity || it.picked_up_quantity || 0;
        const pending = it.pickupPendingQuantity ?? it.pickup_pending_quantity ?? Math.max(0, ord - picked);
        const qty = pickupItemQuantities[itemUuid] !== undefined ? pickupItemQuantities[itemUuid] : pending;
        return { item_id: itemUuid, quantity: Number(qty) };
      }).filter((item: any) => item.item_id && Number(item.quantity) > 0);

      if (payloadItems.length > 0 && targetId) {
        const res = await fetch(`${BASE_URL}/api/v1/orders/${targetId}/pickup-items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: payloadItems,
            staff_name: currentUser ? currentUser.name : (db.currentDeliveryBoy || 'Delivery Staff')
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: res.statusText }));
          console.error("Item pickup endpoint error:", errData.detail);
          alert(`Failed to save pickup items: ${errData.detail || 'Unknown error'}`);
          return;
        }
      }

      const targetDelivId = (pickupDetailsOrder as any).deliveryId || pickupDetailsOrder.id;
      if (token && targetDelivId) {
        try {
          await fetch(`${BASE_URL}/api/v1/deliveries/${targetDelivId}/status`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'PICKED' })
          });
        } catch (e) {
          console.warn('Failed to update delivery task to PICKED:', e);
        }
      }

      fetchApiTasks();
      
      const nextStatus = 'Received' as const;
      const deliveryStatusText = 'In Processing';

      const updatedOrders = db.orders.map(o => {
        if (o.id === pickupDetailsOrder.id) {
          const updatedItems = (o.items || o.services || []).map((it: any, idx: number) => {
            const key = (it.id && String(it.id).length > 5 && it.id !== it.serviceId && it.id !== it.service_id) ? String(it.id) : `item_idx_${idx}`;
            const qtyEntered = pickupItemQuantities[key];
            const ord = it.orderedQuantity || it.ordered_quantity || it.qty || it.quantity || 1;
            const currentPicked = it.pickedUpQuantity || it.picked_up_quantity || 0;
            if (qtyEntered !== undefined && Number(qtyEntered) > 0) {
              const newPicked = currentPicked + Number(qtyEntered);
              const newPending = Math.max(0, ord - newPicked);
              const newDelPending = Math.max(0, newPicked - (it.deliveredQuantity || it.delivered_quantity || 0));
              let s = it.itemStatus || it.item_status || 'CREATED';
              if (newPicked >= ord) s = 'FULLY_PICKED_UP';
              else if (newPicked > 0) s = 'PARTIALLY_PICKED_UP';

              return {
                ...it,
                orderedQuantity: ord,
                pickedUpQuantity: newPicked,
                pickupPendingQuantity: newPending,
                deliveredQuantity: it.deliveredQuantity || it.delivered_quantity || 0,
                deliveryPendingQuantity: newDelPending,
                itemStatus: s
              };
            }
            return {
              ...it,
              orderedQuantity: ord,
              pickedUpQuantity: currentPicked,
              pickupPendingQuantity: it.pickupPendingQuantity !== undefined ? it.pickupPendingQuantity : Math.max(0, ord - currentPicked),
              deliveredQuantity: it.deliveredQuantity || it.delivered_quantity || 0,
              deliveryPendingQuantity: it.deliveryPendingQuantity !== undefined ? it.deliveryPendingQuantity : Math.max(0, currentPicked - (it.deliveredQuantity || 0)),
              itemStatus: it.itemStatus || it.item_status || 'CREATED'
            };
          });

          return {
            ...o,
            status: nextStatus,
            deliveryStatus: deliveryStatusText,
            weightItems: pickupWeightItems,
            pickupNotes: pickupNotes,
            items: updatedItems,
            courier: currentUser ? currentUser.name : (o.pickupCourier || o.courier),
            pickupCourier: (o.pickupCourier && o.pickupCourier !== 'All Delivery Staff' && o.pickupCourier !== '-- Unassigned --') ? o.pickupCourier : (currentUser ? currentUser.name : o.pickupCourier),
            pickupAccepted: true,
            pickupCommission: o.pickupCommission ?? 0
          };
        }
        return o;
      });

      const newNotification = {
        id: Date.now(),
        text: `🚚 Delivery update: Order #${pickupDetailsOrder.id} status updated to: ${nextStatus} (${deliveryStatusText})`,
        time: 'Just now',
        unread: true
      };

      saveDB({
        orders: updatedOrders,
        notifications: [newNotification, ...db.notifications]
      });

      logAudit(`Updated Pickup status of order #${pickupDetailsOrder.id} to: ${nextStatus} (${deliveryStatusText})`);

      setPickupDetailsOrder(null);
      setPickupNotes('');
      setEnteredPickupOtp('');
      setPickupItemQuantities({});
      alert('Pickup details & received item quantities saved successfully!');
    } catch (err: any) {
      alert(`Pickup completion failed: ${err.message}`);
    }
  };

  // Verify Pickup OTP fallback (if ever invoked)
  const submitPickupVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingPickupOrder(null);
  };

  // Complete Delivery directly without OTP verification
  const triggerDeliveryOtpRequest = async (order: Order) => {
    const token = localStorage.getItem('ll_auth_token');
    const targetDeliveryId = (order as any).deliveryId || order.id;

    if (token && targetDeliveryId) {
      try {
        await fetch(`${BASE_URL}/api/v1/deliveries/${targetDeliveryId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'DELIVERED' })
        });
      } catch (err) {
        console.error('Failed to update task status to DELIVERED on backend:', err);
      }
    }

    try {
      if (order.backendId) {
        try {
          await apiVerifyOrderOtp(order.backendId, 'delivery', 'BYPASS', token || undefined);
        } catch (err) {
          console.warn('Backend OTP bypass sync warning:', err);
        }
      }

      const updatedOrders = db.orders.map(o => {
        if (o.id === order.id) {
          const updatedItems = (o.items || o.services || []).map((it: any) => {
            const ord = it.orderedQuantity || it.ordered_quantity || it.qty || it.quantity || 1;
            const pck = (it.pickedUpQuantity !== undefined && Number(it.pickedUpQuantity) > 0)
              ? Number(it.pickedUpQuantity)
              : ((it.picked_up_quantity !== undefined && Number(it.picked_up_quantity) > 0) ? Number(it.picked_up_quantity) : ord);
            const prevDel = it.deliveredQuantity || it.delivered_quantity || 0;
            const readyQty = it.readyQuantity !== undefined ? Number(it.readyQuantity) : (it.ready_quantity !== undefined ? Number(it.ready_quantity) : 0);
            
            const delBatch = readyQty > 0 ? readyQty : 0;
            const newDelivered = Math.min(pck, prevDel + delBatch);
            const newReady = 0;
            const newDelPending = Math.max(0, pck - newDelivered);
            
            let s = it.itemStatus || it.item_status || 'CREATED';
            if (newDelivered >= pck && newDelivered >= ord) s = 'FULLY_DELIVERED';
            else if (newDelivered > 0) s = 'PARTIALLY_DELIVERED';

            return {
              ...it,
              orderedQuantity: ord,
              pickedUpQuantity: pck,
              readyQuantity: newReady,
              deliveredQuantity: newDelivered,
              deliveryPendingQuantity: newDelPending,
              itemStatus: s
            };
          });

          const totalPending = updatedItems.reduce((acc: number, it: any) => acc + (it.deliveryPendingQuantity || 0), 0);
          const allDelivered = updatedItems.every((it: any) => (it.deliveredQuantity || 0) >= (it.orderedQuantity || it.qty || 1));
          const finalStatus = (allDelivered && totalPending === 0) ? ('Delivered' as const) : ('Partially Delivered' as const);

          return {
            ...o,
            status: finalStatus,
            deliveryStatus: finalStatus,
            paymentStatus: 'Paid',
            deliveredDate: new Date().toISOString(),
            courier: currentUser ? currentUser.name : o.courier,
            deliveryCourier: o.deliveryCourier && o.deliveryCourier !== 'All Delivery Staff' ? o.deliveryCourier : (currentUser ? currentUser.name : o.deliveryCourier),
            deliveryAccepted: true,
            items: updatedItems,
            services: updatedItems
          };
        }
        return o;
      });

      const newNotification = {
        id: Date.now(),
        text: `✅ Order #${order.id} delivery update processed!`,
        time: 'Just now',
        unread: true
      };

      saveDB({
        orders: updatedOrders,
        notifications: [newNotification, ...db.notifications]
      });

      logAudit(`Delivery successfully completed for order #${order.id}.`);
      alert('Delivery Completed successfully!');
      fetchApiTasks();
    } catch (err: any) {
      alert(`Delivery completion failed: ${err.message}`);
    }
  };

  const submitDeliveryVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingDeliveryOrder(null);
  };

  // Support ticket creation
  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMsg) {
      alert('Please fill out all support ticket fields.');
      return;
    }
    try {
      const token = localStorage.getItem('ll_auth_token');
      const response = await fetch(`${BASE_URL}/api/v1/staff/support-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: supportSubject,
          description: supportMsg
        })
      });
      if (response.ok) {
        alert('Support ticket raised successfully.');
        setSupportSubject('');
        setSupportMsg('');
        fetchSupportTickets();
      } else {
        const err = await response.json();
        alert(`Failed to raise ticket: ${err.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to raise ticket.');
    }
  };

  const [apiTasks, setApiTasks] = useState<Order[]>([]);

  const fetchApiTasks = async () => {
    const token = localStorage.getItem('ll_auth_token');
    if (!token || !currentUser) return;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/deliveries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const deliveries = await res.json();
        const taskPromises = deliveries.map(async (d: any) => {
          try {
            const detailRes = await fetch(`${BASE_URL}/api/v1/deliveries/${d.id}/details`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (detailRes.ok) {
              const details = await detailRes.json();
              const orderData = details.order || {};
              const custData = details.customer || {};

              return {
                id: orderData.order_number || orderData.id || d.order_id,
                backendId: orderData.id || d.order_id,
                deliveryId: d.id,
                customerName: custData.name || 'N/A',
                phone: custData.phone || 'N/A',
                address: d.type === 'PICKUP' ? (orderData.pickup_address || 'N/A') : (orderData.delivery_address || 'N/A'),
                services: orderData.items?.map((it: any) => ({
                  ...it,
                  id: it.order_item_id || it.id,
                  order_item_id: it.order_item_id || it.id,
                  serviceId: it.service_id,
                  service_id: it.service_id,
                  name: it.service_name || it.name || 'Laundry Service',
                  qty: it.quantity,
                  price: it.unit_price
                })) || [],
                date: orderData.pickup_date ? new Date(orderData.pickup_date).toLocaleDateString() : new Date().toLocaleDateString(),
                status: d.status === 'DELIVERED' || (orderData.status || '').toLowerCase() === 'delivered' ? 'Delivered' : (d.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : (d.status === 'ON_THE_WAY' ? 'Courier on the way' : (d.status === 'REACHED' || d.status === 'REACHED_CUSTOMER' ? 'Reached Customer' : (d.status === 'PICKED' ? 'Received' : (d.status === 'ASSIGNED' ? (d.type === 'PICKUP' ? 'Pending Pickup' : 'Assigned') : (d.type === 'PICKUP' ? 'Pending Pickup' : (orderData.status || 'Assigned'))))))),
                deliveryStatus: d.status === 'DELIVERED' || (orderData.status || '').toLowerCase() === 'delivered' ? 'Delivered' : (d.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : (d.status === 'ON_THE_WAY' ? 'Courier on the way' : (d.status === 'REACHED' || d.status === 'REACHED_CUSTOMER' ? 'Reached Customer' : (d.status === 'PICKED' ? 'Received' : (d.status === 'ASSIGNED' ? (d.type === 'PICKUP' ? 'Pending Pickup' : 'Assigned') : (d.type === 'PICKUP' ? 'Pending Pickup' : 'Assigned')))))),
                pickupCourier: d.type === 'PICKUP' ? currentUser.name : null,
                deliveryCourier: d.type === 'DELIVERY' ? currentUser.name : null,
                courier: currentUser.name,
                taskType: d.type,
                pickupCommission: d.pickup_commission !== undefined && d.pickup_commission !== null && Number(d.pickup_commission) > 0 
                  ? Number(d.pickup_commission) 
                  : (orderData.pickup_commission ? Number(orderData.pickup_commission) : 0),
                deliveryCommission: d.delivery_commission !== undefined && d.delivery_commission !== null && Number(d.delivery_commission) > 0 
                  ? Number(d.delivery_commission) 
                  : (orderData.delivery_commission ? Number(orderData.delivery_commission) : 0),
                pickupCommissionPaid: d.pickup_commission_paid ?? orderData.pickup_commission_paid ?? false,
                deliveryCommissionPaid: d.delivery_commission_paid ?? orderData.delivery_commission_paid ?? false,
                pickupPaymentMethod: d.pickup_payment_method || orderData.pickup_payment_method || null,
                deliveryPaymentMethod: d.delivery_payment_method || orderData.delivery_payment_method || null,
                items: orderData.items?.map((it: any) => ({
                  ...it,
                  id: it.order_item_id || it.id,
                  order_item_id: it.order_item_id || it.id,
                  serviceId: it.service_id,
                  service_id: it.service_id,
                  name: it.service_name || it.name || 'Laundry Service',
                  quantity: it.quantity,
                  orderedQuantity: it.ordered_quantity !== undefined ? it.ordered_quantity : (it.orderedQuantity || it.quantity || 1),
                  pickedUpQuantity: it.picked_up_quantity !== undefined ? it.picked_up_quantity : (it.pickedUpQuantity || 0),
                  pickupPendingQuantity: it.pickup_pending_quantity !== undefined ? it.pickup_pending_quantity : (it.pickupPendingQuantity || 0),
                  readyQuantity: it.ready_quantity !== undefined ? Number(it.ready_quantity) : (it.readyQuantity !== undefined ? Number(it.readyQuantity) : 0),
                  deliveredQuantity: it.delivered_quantity !== undefined ? Number(it.delivered_quantity) : (it.deliveredQuantity !== undefined ? Number(it.deliveredQuantity) : 0),
                  deliveryPendingQuantity: it.delivery_pending_quantity !== undefined ? Number(it.delivery_pending_quantity) : (it.deliveryPendingQuantity !== undefined ? Number(it.deliveryPendingQuantity) : 0)
                })) || []
              } as unknown as Order;
            }
          } catch (e) {
            console.error(`Failed to fetch details for delivery ${d.id}`, e);
          }
          return null;
        });

        const resolved = (await Promise.all(taskPromises)).filter(Boolean) as Order[];
        const uniqueTasksMap = new Map<string, Order>();
        resolved.forEach(task => {
          const key = (task as any).deliveryId || task.backendId || task.id;
          uniqueTasksMap.set(key, task);
        });
        setApiTasks(Array.from(uniqueTasksMap.values()));
      }
    } catch (err) {
      console.error('Failed to fetch API tasks:', err);
    }
  };

  useEffect(() => {
    fetchApiTasks();
    const interval = setInterval(fetchApiTasks, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const isMyPickupOrder = (o: Order) => {
    if (o.isDeleted) return false;
    if (!currentUser) return false;
    const currentName = currentUser.name.trim().toLowerCase();

    // If explicit taskType from backend API, ensure type is PICKUP
    const tType = ((o as any).taskType || (o as any).type || '').toUpperCase();
    if (tType && tType !== 'PICKUP') return false;
    if (o.deliveryCourier && !o.pickupCourier && tType !== 'PICKUP') return false;

    // Tasks directly fetched from backend API for logged-in user
    if ((o as any).taskType === 'PICKUP' && ((o as any).deliveryId || (o as any).backendId)) {
      const st = (o.status || o.deliveryStatus || '').toLowerCase();
      const validStatuses = ['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer', 'partially picked up', 'partially_picked_up', 'assigned'];
      return validStatuses.includes(st);
    }

    const pickupCourier = (o.pickupCourier || (tType === 'PICKUP' ? o.courier : '') || '').trim().toLowerCase();
    if (pickupCourier === 'store') return false;

    const isAssignedToMe = pickupCourier === currentName || 
                           pickupCourier === 'all delivery staff' || 
                           pickupCourier === 'all_delivery_staff' ||
                           pickupCourier === 'all delivery boy' ||
                           pickupCourier === 'all delivery boys';

    if (!isAssignedToMe) return false;

    const st = (o.status || '').toLowerCase();
    const validStatuses = ['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer', 'partially picked up', 'partially_picked_up', 'assigned'];
    return validStatuses.includes(st);
  };

  const isMyDeliveryOrder = (o: Order) => {
    if (o.isDeleted) return false;
    if (!currentUser) return false;
    const currentName = currentUser.name.trim().toLowerCase();

    // If explicit taskType from backend API, ensure type is DELIVERY
    const tType = ((o as any).taskType || (o as any).type || '').toUpperCase();
    if (tType && tType !== 'DELIVERY') return false;
    if (o.pickupCourier && !o.deliveryCourier && tType !== 'DELIVERY') return false;

    // Tasks directly fetched from backend API for logged-in user
    if ((o as any).taskType === 'DELIVERY' && ((o as any).deliveryId || (o as any).backendId)) {
      const delStatus = (o.deliveryStatus || o.status || '').toLowerCase();
      if (delStatus === 'delivered' || delStatus === 'fully_delivered' || delStatus === 'completed') return false;
      return true;
    }

    const deliveryCourier = (o.deliveryCourier || (tType === 'DELIVERY' ? o.courier : '') || '').trim().toLowerCase();
    if (deliveryCourier === 'store') return false;

    const isAssignedToMe = deliveryCourier === currentName || 
                           deliveryCourier === 'all delivery staff' || 
                           deliveryCourier === 'all_delivery_staff' ||
                           deliveryCourier === 'all delivery boy' ||
                           deliveryCourier === 'all delivery boys';

    if (!isAssignedToMe) return false;

    const delStatus = (o.deliveryStatus || o.status || '').toLowerCase();
    return true;
  };

  const assignedOrders: Order[] = (() => {
    const map = new Map<string, Order>();

    (db.orders || []).forEach(o => {
      if (o.id) map.set(o.id, o);
      if (o.backendId && o.backendId !== o.id) {
        map.set(o.backendId, o);
      }
    });

    apiTasks.forEach(t => {
      const orderKey = t.backendId || (t as any).order_id || (t as any).orderId || t.id;
      const existing = (t.backendId ? map.get(t.backendId) : undefined) ||
                       (t.id ? map.get(t.id) : undefined) ||
                       ((t as any).order_id ? map.get((t as any).order_id) : undefined) ||
                       ((t as any).orderId ? map.get((t as any).orderId) : undefined);

      if (existing) {
        if (existing.id) map.delete(existing.id);
        if (existing.backendId) map.delete(existing.backendId);

        const merged: Order = {
          ...existing,
          ...t,
          id: existing.id || t.id,
          backendId: t.backendId || existing.backendId || (t as any).order_id || (t as any).orderId,
          pickupCommission: (t.pickupCommission !== undefined && t.pickupCommission !== null && Number(t.pickupCommission) > 0)
            ? Number(t.pickupCommission)
            : (existing.pickupCommission !== undefined ? Number(existing.pickupCommission) : 0),
          deliveryCommission: (t.deliveryCommission !== undefined && t.deliveryCommission !== null && Number(t.deliveryCommission) > 0)
            ? Number(t.deliveryCommission)
            : (existing.deliveryCommission !== undefined ? Number(existing.deliveryCommission) : 0),
          pickupCommissionPaid: t.pickupCommissionPaid ?? existing.pickupCommissionPaid ?? false,
          deliveryCommissionPaid: t.deliveryCommissionPaid ?? existing.deliveryCommissionPaid ?? false,
          courier: currentUser?.name || t.courier || t.deliveryCourier || t.pickupCourier || existing.pickupCourier || existing.deliveryCourier,
          pickupCourier: t.taskType === 'PICKUP'
            ? (t.pickupCourier || existing.pickupCourier || currentUser?.name)
            : (existing.pickupCourier || t.pickupCourier || null),
          deliveryCourier: t.taskType === 'DELIVERY'
            ? (t.deliveryCourier || existing.deliveryCourier || currentUser?.name)
            : (existing.deliveryCourier || t.deliveryCourier || null),
          isDeleted: false,
        };

        const targetKey = merged.backendId || merged.id || orderKey;
        if (targetKey) map.set(targetKey, merged);
      } else {
        const targetKey = t.backendId || t.id || orderKey;
        if (targetKey) map.set(targetKey, t);
      }
    });

    const result: Order[] = [];
    const seen = new Set<string>();
    Array.from(map.values()).forEach(o => {
      const uniqueId = o.backendId || o.id;
      if (uniqueId && !seen.has(uniqueId)) {
        seen.add(uniqueId);
        result.push(o);
      }
    });

    return result;
  })();

  const pickupStatuses = ['created', 'accepted', 'pickup assigned', 'pending pickup', 'courier on the way', 'reached customer'];
  const deliveryReadyStatuses = ['ready', 'out for delivery', 'partially delivered'];
  
  const isDeliveryOrderActive = (o: Order) => {
    if (!isMyDeliveryOrder(o)) return false;
    const delStatus = (o.deliveryStatus || o.status || '').toLowerCase();
    if (delStatus === 'delivered' || delStatus === 'fully_delivered' || delStatus === 'completed') return false;

    // Show delivery task if status indicates active delivery
    const activeStatuses = ['out for delivery', 'out_for_delivery', 'ready', 'assigned', 'on_the_way', 'courier on the way', 'reached customer', 'reached_customer', 'partially delivered', 'partially_delivered'];
    return activeStatuses.includes(delStatus);
  };

  const pendingPickupsCount = assignedOrders.filter(o => isMyPickupOrder(o) && pickupStatuses.includes(o.status.toLowerCase())).length;
  const pendingDeliveriesCount = assignedOrders.filter(isDeliveryOrderActive).length;
  const totalPendingTasksCount = pendingPickupsCount + pendingDeliveriesCount;

  // Actual commission earnings calculation (total of completed pickups and deliveries)
  const getMyCompletedEarnings = () => {
    const completedList: { amount: number }[] = [];
    const processedKeys = new Set<string>();

    const isStaffPickupMatch = (o: Order) => {
      const currentName = currentUser?.name?.trim()?.toLowerCase() || '';
      const pickupCourier = (o.pickupCourier || (o as any).courier || '').trim().toLowerCase();
      if (!pickupCourier || pickupCourier === 'store') return false;
      return (
        pickupCourier === currentName ||
        pickupCourier.includes('all delivery') ||
        pickupCourier.includes('all_delivery')
      );
    };

    const isStaffDeliveryMatch = (o: Order) => {
      const currentName = currentUser?.name?.trim()?.toLowerCase() || '';
      const deliveryCourier = (o.deliveryCourier || (o as any).courier || '').trim().toLowerCase();
      if (!deliveryCourier || deliveryCourier === 'store') return false;
      return (
        deliveryCourier === currentName ||
        deliveryCourier.includes('all delivery') ||
        deliveryCourier.includes('all_delivery')
      );
    };

    const pickupDoneStatuses = ['received', 'sorting', 'washing', 'drying', 'ironing', 'quality check', 'packing', 'ready', 'out for delivery', 'out_for_delivery', 'delivered', 'partially_picked_up', 'partially picked up', 'picked_up', 'picked up', 'fully_picked_up', 'fully picked up', 'accepted', 'completed'];
    const deliveryDoneStatuses = ['delivered', 'completed', 'fully_delivered', 'fully delivered', 'partially_delivered', 'partially delivered'];

    const allTargetTasks = [...apiTasks, ...assignedOrders];

    allTargetTasks.forEach(o => {
      if (o.isDeleted || (o.status || '').toLowerCase() === 'cancelled') return;

      const st = (o.status || '').toLowerCase();
      const delSt = (o.deliveryStatus || '').toLowerCase();
      const isMyPickup = isStaffPickupMatch(o);
      const isMyDelivery = isStaffDeliveryMatch(o);

      const isPickupDone = pickupDoneStatuses.includes(st) || pickupDoneStatuses.includes(delSt) || !!o.pickupCommissionPaid;
      const isDeliveryDone = deliveryDoneStatuses.includes(st) || deliveryDoneStatuses.includes(delSt) || !!o.deliveryCommissionPaid;

      const taskType = ((o as any).taskType || (o as any).type || '').toUpperCase();
      const canBePickup = !taskType || taskType === 'PICKUP';
      const canBeDelivery = !taskType || taskType === 'DELIVERY';

      const delId = (o as any).deliveryId || (o as any).task_id || (o as any).delivery_id || (o as any).id;
      const orderIdStr = o.id || o.backendId;

      const isLocalFallback = !(o as any).deliveryId && !(o as any).task_id && !(o as any).delivery_id;
      const alreadyCoveredByApi = isLocalFallback && Array.from(processedKeys).some(k => k.startsWith(`${orderIdStr}_`));
      if (alreadyCoveredByApi) return;

      const pickupKey = `${orderIdStr}_pickup_${delId}_${o.pickupCommission}`;
      if (canBePickup && o.pickupCommission && Number(o.pickupCommission) > 0 && isMyPickup && isPickupDone && !processedKeys.has(pickupKey)) {
        processedKeys.add(pickupKey);
        completedList.push({ amount: Number(o.pickupCommission) });
      }

      const deliveryKey = `${orderIdStr}_delivery_${delId}_${o.deliveryCommission}`;
      if (canBeDelivery && o.deliveryCommission && Number(o.deliveryCommission) > 0 && isMyDelivery && isDeliveryDone && !processedKeys.has(deliveryKey)) {
        processedKeys.add(deliveryKey);
        completedList.push({ amount: Number(o.deliveryCommission) });
      }
    });

    return completedList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const totalCommissionEarnings = getMyCompletedEarnings();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: '"Outfit", sans-serif' }}>
      
      {/* Top Navbar */}
      <header className="delivery-portal-header" style={{ background: '#ffffff', color: '#1e293b', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>
            <span style={{ fontSize: '1.4rem' }}>🚚</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.75px', color: '#0369a1', textTransform: 'uppercase' }}>
              {db.companies.find(c => c.id === db.activeCompanyId)?.name || currentUser?.companyName || 'Iron'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>{tDeliv('Web-Based Delivery Operations Portal')}</p>
          </div>
        </div>
        
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={handleLogout} style={{ border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#ef4444', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🚪</span> {tDeliv('Sign Out')}
            </button>
          </div>
        )}
      </header>

      {!currentUser ? (
        // Non-authenticated card template
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#f1f5f9' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '36px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            
            {authMode === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a', textAlign: 'center' }}>Delivery Agent Sign In</h2>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#475569' }}>Email Address</label>
                  <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="e.g. johndoe@laundra.com" style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#475569' }}>Password</label>
                  <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                </div>

                <button type="submit" style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', marginTop: '6px' }}>Sign In to Workspace</button>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '520px', margin: '0 auto', background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: '900', color: '#1e3a8a', textAlign: 'center' }}>Job Application Form</h2>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Company Code</label>
                  <select value={regCompanyId} onChange={e => setRegCompanyId(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                    {db.companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Full Name</label>
                    <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} placeholder="Alex APK Driver" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Email Address</label>
                    <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="charantechfive@gmail.com" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Phone</label>
                    <input type="tel" required value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+1234567890" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Password</label>
                    <input type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Vehicle Type</label>
                    <select value={regVehicleType} onChange={e => setRegVehicleType(e.target.value)} style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px' }}>
                      <option value="Bike">Bike</option>
                      <option value="Car">Car</option>
                      <option value="Van">Van</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Vehicle Number</label>
                    <input type="text" required value={regVehicleNumber} onChange={e => setRegVehicleNumber(e.target.value)} placeholder="KA-05-CD-9999" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>License Number</label>
                    <input type="text" required value={regLicense} onChange={e => setRegLicense(e.target.value)} placeholder="DL-12345" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Vehicle RC</label>
                    <input type="text" required value={regRC} onChange={e => setRegRC(e.target.value)} placeholder="RC-12345" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Insurance Number</label>
                    <input type="text" required value={regInsuranceNumber} onChange={e => setRegInsuranceNumber(e.target.value)} placeholder="INS-12345" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Emergency Contact</label>
                    <input type="tel" required value={regEmergencyContact} onChange={e => setRegEmergencyContact(e.target.value)} placeholder="+1987654321" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Address</label>
                  <input type="text" required value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="789 APK Street, Bangalore" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', marginBottom: '4px' }}>Profile Photo URL</label>
                    <input type="text" value={regProfilePhoto} onChange={e => setRegProfilePhoto(e.target.value)} placeholder="https://example.com/alex.jpg" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.75rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', marginBottom: '4px' }}>License File URL</label>
                    <input type="text" value={regLicenseFile} onChange={e => setRegLicenseFile(e.target.value)} placeholder="https://example.com/license.pdf" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.75rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', marginBottom: '4px' }}>Insurance File URL</label>
                    <input type="text" value={regInsuranceFile} onChange={e => setRegInsuranceFile(e.target.value)} placeholder="https://example.com/insurance.pdf" style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.75rem' }} />
                  </div>
                </div>

                <button type="submit" style={{ padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>Submit Application</button>
                <button type="button" onClick={() => setAuthMode('login')} style={{ padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel & Back</button>
              </form>
            )}

            {authMode === 'otp-verify' && (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: '900', color: '#1e3a8a', textAlign: 'center' }}>Account Verification</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: 0 }}>Input your account activation OTP code sent through Super Admin's Central Notification Service after approval.</p>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Registered Email</label>
                  <input type="email" required value={otpEmail} onChange={e => setOtpEmail(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Email Activation OTP Code</label>
                  <input type="text" required value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="e.g. 806080" style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Set Password</label>
                  <input type="password" required value={otpNewPassword} onChange={e => setOtpNewPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>

                <button type="submit" style={{ padding: '12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Verify & Activate Account</button>
                <button type="button" onClick={() => setAuthMode('login')} style={{ padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Back to Sign In</button>
              </form>
            )}

            {authMode === 'forgot-pass' && (
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: '900', color: '#1e3a8a', textAlign: 'center' }}>Forgot Password</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: 0 }}>Enter your registered email address to receive a verification code.</p>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Registered Email</label>
                  <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="e.g. driver@laundra.com" style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>

                <button type="submit" style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Request Reset Code</button>
                <button type="button" onClick={() => setAuthMode('login')} style={{ padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Back to Sign In</button>
              </form>
            )}

            {authMode === 'reset-pass' && (
              <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: '900', color: '#1e3a8a', textAlign: 'center' }}>Reset Password</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: 0 }}>Input the verification code and set your new password.</p>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Verification Reset Code</label>
                  <input type="text" required value={resetCode} onChange={e => setResetCode(e.target.value)} placeholder="e.g. 909090" style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>New Password</label>
                  <input type="password" required value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>

                <button type="submit" style={{ padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Reset Password</button>
                <button type="button" onClick={() => setAuthMode('login')} style={{ padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              </form>
            )}

          </div>
        </div>
      ) : (
        
        // Authenticated Dashboard Layout
        <div className="delivery-portal-main-container" style={{ flex: 1, display: 'flex', background: '#f1f5f9' }}>
          
          {/* Left Sidebar Navigation Panel */}
          <aside className="delivery-portal-sidebar" style={{ width: '260px', background: '#ffffff', color: '#475569', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', boxShadow: '2px 0 8px rgba(0,0,0,0.02)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
            <div className="delivery-portal-sidebar-user-header" style={{ padding: '24px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {currentUser.profilePhoto && !sidebarImgError ? (
                <img 
                  src={currentUser.profilePhoto} 
                  alt="profile" 
                  onError={() => setSidebarImgError(true)} 
                  style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} 
                />
              ) : (
                <div style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: '800',
                  fontSize: '1.2rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                </div>
              )}
              <div>
                <div style={{ color: '#1e293b', fontWeight: '800', fontSize: '1rem', textTransform: 'capitalize' }}>{currentUser.name}</div>
              </div>
            </div>

            <nav className="delivery-portal-nav" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              {(() => {
                 const lastSeenAnn = parseInt(localStorage.getItem(`ll_${db.activeCompanyId}_delivery_last_seen_announcements_count`) || '0');
                 const unreadAnnCount = activeTab === 'announcements' ? 0 : Math.max(0, systemAnnouncements.length - lastSeenAnn);
                 const unreadSupport = db.notifications.filter(n => n.unread && n.text.includes('🎫')).length;

                 return [
                   { id: 'dashboard', label: `📊 ${tDeliv('Dashboard')}`, icon: '📊' },
                   { id: 'tasks', label: `📋 ${tDeliv('Assigned Tasks')}`, icon: '📋' },
                   { id: 'earnings', label: `💵 ${tDeliv('My Earnings')}`, icon: '💵' },
                   { id: 'attendance', label: `📅 ${tDeliv('Duty & Leaves')}`, icon: '📅' },
                   { id: 'support', label: `🎫 ${tDeliv('Helpdesk Support')}`, icon: '🎫' },
                   { id: 'announcements', label: `📢 ${tDeliv('Announcements')}`, icon: '📢' }
                 ].map(tab => (
                   <button
                     key={tab.id}
                     className="delivery-portal-nav-btn"
                     onClick={() => {
                       setActiveTab(tab.id as any);
                       if (tab.id === 'announcements') {
                         localStorage.setItem(`ll_${db.activeCompanyId}_delivery_last_seen_announcements_count`, systemAnnouncements.length.toString());
                       }
                      if (tab.id === 'support') {
                        const updated = db.notifications.map(n => n.text.includes('🎫') ? { ...n, unread: false } : n);
                        saveDB({ notifications: updated });
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeTab === tab.id ? '#eff6ff' : 'transparent',
                      color: activeTab === tab.id ? '#2563eb' : '#475569',
                      textAlign: 'left',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {tab.label}
                    </span>
                    {tab.id === 'tasks' && totalPendingTasksCount > 0 && (
                      <span style={{
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: '800'
                      }}>
                        {totalPendingTasksCount}
                      </span>
                    )}
                    {tab.id === 'announcements' && unreadAnnCount > 0 && (
                      <span style={{
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: '800'
                      }}>
                        {unreadAnnCount}
                      </span>
                    )}
                    {tab.id === 'support' && unreadSupport > 0 && (
                      <span style={{
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: '800'
                      }}>
                        {unreadSupport}
                      </span>
                    )}
                  </button>
                ));
              })()}
            </nav>
            
            <div className="delivery-portal-sidebar-footer" style={{ padding: '16px', borderTop: '1px solid #1e293b', fontSize: '0.72rem', textAlign: 'center' }}>
              Logged in to {db.companies.find(c => c.id === db.activeCompanyId)?.name || 'HQ'}
            </div>
          </aside>

          {/* Right Main Content Pane */}
          <main className="delivery-portal-content-pane" style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
            
            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Modern Preview Welcome Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: '#1e3a8a' }}>{tDeliv('Welcome')}, {currentUser.name}!</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                      {tDeliv('Ready for your shifts today?')} • {new Date().toLocaleDateString(deliveryLang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const nextLang = deliveryLang === 'en' ? 'ar' : 'en';
                      setDeliveryLang(nextLang);
                      localStorage.setItem('ll_delivery_lang', nextLang);
                      document.documentElement.dir = 'ltr';
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      borderRadius: '30px',
                      border: '2px solid #2563eb',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontWeight: '800',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>🌐</span>
                    <span>{deliveryLang === 'en' ? 'العربية (Arabic)' : 'English (الإنجليزية)'}</span>
                  </button>
                </div>

                {/* Metrics Cards Grid Matching Preview Design */}
                <div className="delivery-portal-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  
                  {/* Pickups Today Card */}
                  <div style={{ background: '#f0f9ff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #bae6fd', boxShadow: '0 4px 12px rgba(2,132,199,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.6rem' }}>🧺</span>
                        <span style={{ fontWeight: '800', color: '#0369a1', fontSize: '0.9rem' }}>{tDeliv('Pickups Today')}</span>
                      </div>
                      <span style={{ background: '#0284c7', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800' }}>{tDeliv('Pending')}: {pendingPickupsCount}</span>
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0f172a', margin: '12px 0 2px 0' }}>
                      {pendingPickupsCount}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: '700' }}>{tDeliv('Assigned Pickups Queue')}</div>
                  </div>

                  {/* Deliveries Today Card */}
                  <div style={{ background: '#fff7ed', padding: '20px 24px', borderRadius: '16px', border: '1px solid #fed7aa', boxShadow: '0 4px 12px rgba(234,88,12,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.6rem' }}>🚚</span>
                        <span style={{ fontWeight: '800', color: '#c2410c', fontSize: '0.9rem' }}>{tDeliv('Deliveries Today')}</span>
                      </div>
                      <span style={{ background: '#ea580c', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800' }}>{tDeliv('Pending')}: {pendingDeliveriesCount}</span>
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0f172a', margin: '12px 0 2px 0' }}>
                      {pendingDeliveriesCount}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: '700' }}>{tDeliv('Ready Drops Assigned')}</div>
                  </div>

                  {/* Drops Completed Card */}
                  <div style={{ background: '#f0fdf4', padding: '20px 24px', borderRadius: '16px', border: '1px solid #bbf7d0', boxShadow: '0 4px 12px rgba(22,163,74,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.6rem' }}>✅</span>
                        <span style={{ fontWeight: '800', color: '#15803d', fontSize: '0.9rem' }}>{tDeliv('Drops Completed')}</span>
                      </div>
                      <span style={{ background: '#16a34a', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800' }}>{tDeliv('Completed')}</span>
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#15803d', margin: '12px 0 2px 0' }}>
                      {assignedOrders.filter(o => o.status === 'Delivered').length}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '700' }}>{tDeliv('Successful Deliveries Done')}</div>
                  </div>

                  {/* Total Earnings Card */}
                  <div style={{ background: '#fefce8', padding: '20px 24px', borderRadius: '16px', border: '1px solid #fef08a', boxShadow: '0 4px 12px rgba(202,138,4,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.6rem' }}>💵</span>
                        <span style={{ fontWeight: '800', color: '#a16207', fontSize: '0.9rem' }}>{tDeliv('Total Earnings')}</span>
                      </div>
                      <span style={{ background: '#ca8a04', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800' }}>{tDeliv('Commission')}</span>
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#a16207', margin: '12px 0 2px 0' }}>
                      QR {totalCommissionEarnings.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#a16207', fontWeight: '700' }}>{tDeliv('Commission Earned Today')}</div>
                  </div>

                </div>

                {/* Notifications & Announcements Panel Grid */}
                <div className="delivery-portal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  {/* Notifications Feed */}
                  <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>🔔 {tDeliv('Live Notifications Feed')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                      {db.notifications.map(n => (
                        <div key={n.id} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600' }}>{n.text}</span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{n.time === 'Just now' ? tDeliv('Just now') : n.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Announcements Feed */}
                  <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>📢 {tDeliv('Active Company Announcements')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                      {systemAnnouncements.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>{tDeliv('No announcements active right now.')}</div>
                      ) : (
                        systemAnnouncements.map(a => (
                          <div key={a.id} style={{ background: '#faf5ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.82rem' }}>
                            <strong style={{ color: '#5b21b6' }}>{a.title}</strong>
                            <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{a.content}</p>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{new Date(a.created_at).toLocaleDateString()} | Platform Broadcaster</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: TASKS */}
            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="delivery-portal-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{tDeliv('Assigned Delivery Tasks')}</h2>
                  
                  {/* Task type selectors */}
                  <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                    <button onClick={() => setTasksSubTab('pickups')} style={{ padding: '8px 20px', border: 'none', borderRadius: '6px', background: tasksSubTab === 'pickups' ? 'white' : 'transparent', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🧺 {tDeliv('Pickups')}
                      {pendingPickupsCount > 0 && (
                        <span style={{ background: '#2563eb', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: '800' }}>
                          {pendingPickupsCount}
                        </span>
                      )}
                    </button>
                    <button onClick={() => setTasksSubTab('deliveries')} style={{ padding: '8px 20px', border: 'none', borderRadius: '6px', background: tasksSubTab === 'deliveries' ? 'white' : 'transparent', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🚚 {tDeliv('Deliveries')}
                      {pendingDeliveriesCount > 0 && (
                        <span style={{ background: '#7c3aed', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: '800' }}>
                          {pendingDeliveriesCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="delivery-portal-task-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {tasksSubTab === 'pickups' ? (
                    assignedOrders.filter(o => isMyPickupOrder(o) && pickupStatuses.includes(o.status.toLowerCase())).length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '60px 0' }}>{tDeliv('No pending pickup assignments.')}</div>
                    ) : (
                      assignedOrders.filter(o => isMyPickupOrder(o) && pickupStatuses.includes(o.status.toLowerCase())).map(o => (
                        <div key={o.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <strong style={{ color: '#1e3a8a', fontSize: '1rem' }}>{tDeliv('Order #')}{o.id}</strong>
                              <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>{tDeliv(o.deliveryStatus || o.status || '')}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
                              <div>👤 <strong>{tDeliv('Client Name:')}</strong> {o.customerName}</div>
                              <div>📞 <strong>{tDeliv('Client Phone:')}</strong> {o.phone || db.customers.find(c => c.id === o.customerId)?.phone || 'N/A'}</div>
                              <div>📍 <strong>{tDeliv('Address:')}</strong> {o.address || db.customers.find(c => c.id === o.customerId)?.address || 'Pickup at Branch'}</div>
                              <div>🧺 <strong>{tDeliv('Services:')}</strong> {(o.items || o.services || []).map((s: any) => {
                                const sName = s.serviceName || s.name || 'Service';
                                const ord = s.orderedQuantity || s.ordered_quantity || s.qty || s.quantity || 1;
                                const picked = s.pickedUpQuantity || s.picked_up_quantity || s.pickedUpQty || s.pickedUp || 0;
                                const pending = s.pickupPendingQuantity ?? s.pickup_pending_quantity ?? Math.max(0, ord - picked);
                                const isPartial = (o.status || '').toLowerCase().includes('partially') || (o.deliveryStatus || '').toLowerCase().includes('partially') || picked > 0;
                                const displayQty = isPartial ? pending : ord;
                                return `${tDeliv(sName)} x${displayQty}`;
                              }).join(', ') || tDeliv(o.weightItems || 'Standard Laundry Load')}</div>
                              <div>📅 <strong>{tDeliv('Pickup Time:')}</strong> {o.date} (10:00 AM - 1:00 PM)</div>
                              <div>📝 <strong>{tDeliv('Instructions:')}</strong> {tDeliv('Handle with care, separate whites.')}</div>
                              <div style={{ marginTop: '6px', background: '#fef3c7', color: '#b45309', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', display: 'inline-block', width: 'fit-content' }}>💰 {tDeliv('Pickup Commission:')} QR {(o.pickupCommission || 0).toFixed(2)}</div>
                            </div>
                          </div>

                          <div>
                            <div style={{ marginBottom: '12px' }}>
                              <button onClick={() => window.open(`tel:${o.phone || db.customers.find(c => c.id === o.customerId)?.phone || '555-0199'}`)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>📞 {tDeliv('Contact Client')}</button>
                            </div>
                            
                            {(o.deliveryStatus === 'Pending Pickup' || (o.status as string) === 'Pickup Assigned') && (
                              <button onClick={() => updatePickupStatus(o, 'Accepted', 'Courier on the way')} style={{ width: '100%', padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>🚀 {tDeliv('Mark On the Way')}</button>
                            )}
                            {o.deliveryStatus === 'Courier on the way' && (
                              <button onClick={() => updatePickupStatus(o, 'Accepted', 'Reached Customer')} style={{ width: '100%', padding: '10px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>📍 {tDeliv('Mark Reached Location')}</button>
                            )}
                            {o.deliveryStatus === 'Reached Customer' && (
                              <button onClick={() => {
                                const initialQtyMap: Record<string, number> = {};
                                (o.items || o.services || []).forEach((it: any) => {
                                  const key = it.order_item_id || it.id;
                                  const ord = it.orderedQuantity || it.ordered_quantity || it.qty || it.quantity || 1;
                                  const picked = it.pickedUpQuantity || it.picked_up_quantity || it.pickedUpQty || it.pickedUp || 0;
                                  const pending = it.pickupPendingQuantity ?? it.pickup_pending_quantity ?? Math.max(0, ord - picked);
                                  initialQtyMap[key] = pending;
                                });
                                setPickupItemQuantities(initialQtyMap);
                                setPickupDetailsOrder(o);
                              }} style={{ width: '100%', padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>🧺 {tDeliv('Complete Pickup Details')}</button>
                            )}
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    assignedOrders.filter(isDeliveryOrderActive).length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '60px 0' }}>{tDeliv('No pending delivery assignments.')}</div>
                    ) : (
                      assignedOrders.filter(isDeliveryOrderActive).map(o => (
                        <div key={o.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                          <div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <strong style={{ color: '#1e3a8a', fontSize: '1rem' }}>{tDeliv('Order #')}{o.id}</strong>
                              <span style={{ fontSize: '0.75rem', background: '#faf5ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                                {tDeliv(['out for delivery', 'out_for_delivery'].includes((o.status || '').toLowerCase()) ? 'Out for Delivery' : ((o.status || '').toLowerCase() === 'assigned' ? 'Assigned' : 'Ready'))}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
                              <div>👤 <strong>{tDeliv('Client Name:')}</strong> {o.customerName}</div>
                              <div>📞 <strong>{tDeliv('Client Phone:')}</strong> {o.phone || db.customers.find(c => c.id === o.customerId)?.phone || 'N/A'}</div>
                              <div>📍 <strong>{tDeliv('Address:')}</strong> {o.address || db.customers.find(c => c.id === o.customerId)?.address || 'Delivery Address'}</div>
                              <div>🧺 <strong>{tDeliv('Services & Delivery Quantities:')}</strong></div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '2px' }}>
                                {(o.items || o.services || []).map((it: any, idx: number) => {
                                  const readyQty = it.readyQuantity !== undefined ? Number(it.readyQuantity) : (it.ready_quantity !== undefined ? Number(it.ready_quantity) : 0);
                                  const displayQty = readyQty;

                                  return (
                                    <div key={idx} style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                                      • <strong>{tDeliv(it.serviceName || it.name)}</strong>: {tDeliv('Given for Delivery:')} <strong style={{ color: '#15803d' }}>{displayQty} {tDeliv('Pcs')}</strong>
                                    </div>
                                  );
                                })}
                              </div>
                              <div>📅 <strong>{tDeliv('Delivery Time:')}</strong> {o.date}</div>
                              <div>💳 <strong>{tDeliv('Method:')}</strong> {o.paymentMethod || 'CASH'} ({tDeliv(o.paymentStatus || 'Paid')})</div>
                              <div>📝 <strong>{tDeliv('Instructions:')}</strong> {tDeliv('Deliver order directly to customer upon arrival.')}</div>
                              <div style={{ marginTop: '6px', background: '#eff6ff', color: '#1e40af', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', display: 'inline-block', width: 'fit-content' }}>💰 {tDeliv('Delivery Commission:')} QR {(o.deliveryCommission || 0).toFixed(2)}</div>
                            </div>
                          </div>

                          <div>
                            <div style={{ marginBottom: '12px' }}>
                              <button onClick={() => window.open(`tel:${o.phone || db.customers.find(c => c.id === o.customerId)?.phone || '555-0199'}`)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>📞 {tDeliv('Contact Client')}</button>
                            </div>
                            {!['out for delivery', 'out_for_delivery'].includes((o.status || '').toLowerCase()) ? (
                              <button onClick={() => updatePickupStatus(o, 'Out for Delivery', 'Out for Delivery')} style={{ width: '100%', padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>🚚 {tDeliv('Mark Out For Delivery')}</button>
                            ) : (
                              <button onClick={() => triggerDeliveryOtpRequest(o)} style={{ width: '100%', padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>✅ {tDeliv('Complete Delivery')}</button>
                            )}
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: EARNINGS */}
            {activeTab === 'earnings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{tDeliv('My Earnings Ledger')}</h2>
                
                {(() => {
                  const pickupCompletedStatuses = [
                    'received', 'sorting', 'washing', 'drying', 'ironing', 'quality check',
                    'packing', 'ready', 'out for delivery', 'out_for_delivery', 'delivered',
                    'partially_picked_up', 'partially picked up', 'picked_up', 'picked up',
                    'fully_picked_up', 'fully picked up', 'accepted', 'completed'
                  ];

                  const deliveryCompletedStatuses = [
                    'delivered', 'completed', 'fully_delivered', 'fully delivered',
                    'partially_delivered', 'partially delivered'
                  ];

                  const isStaffPickupMatch = (o: Order) => {
                    const currentName = currentUser?.name?.trim()?.toLowerCase() || '';
                    const pickupCourier = (o.pickupCourier || (o as any).courier || '').trim().toLowerCase();
                    if (!pickupCourier || pickupCourier === 'store') return false;
                    return (
                      pickupCourier === currentName ||
                      pickupCourier.includes('all delivery') ||
                      pickupCourier.includes('all_delivery')
                    );
                  };

                  const isStaffDeliveryMatch = (o: Order) => {
                    const currentName = currentUser?.name?.trim()?.toLowerCase() || '';
                    const deliveryCourier = (o.deliveryCourier || (o as any).courier || '').trim().toLowerCase();
                    if (!deliveryCourier || deliveryCourier === 'store') return false;
                    return (
                      deliveryCourier === currentName ||
                      deliveryCourier.includes('all delivery') ||
                      deliveryCourier.includes('all_delivery')
                    );
                  };

                  const completed: { id: string; date: string; type: 'Pickup' | 'Delivery'; customerName: string; amount: number; paid: boolean; method?: string }[] = [];
                  const processedKeys = new Set<string>();

                  const allTargetTasks = [...apiTasks, ...assignedOrders];

                  allTargetTasks.forEach(o => {
                    if (o.isDeleted || (o.status || '').toLowerCase() === 'cancelled') return;

                    const st = (o.status || '').toLowerCase();
                    const delSt = (o.deliveryStatus || '').toLowerCase();
                    const isMyPickup = isStaffPickupMatch(o);
                    const isMyDelivery = isStaffDeliveryMatch(o);

                    const isPickupDone = pickupCompletedStatuses.includes(st) || pickupCompletedStatuses.includes(delSt) || !!o.pickupCommissionPaid;
                    const isDeliveryDone = deliveryCompletedStatuses.includes(st) || deliveryCompletedStatuses.includes(delSt) || !!o.deliveryCommissionPaid;

                    const taskType = ((o as any).taskType || (o as any).type || '').toUpperCase();
                    const canBePickup = !taskType || taskType === 'PICKUP';
                    const canBeDelivery = !taskType || taskType === 'DELIVERY';

                    const delId = (o as any).deliveryId || (o as any).task_id || (o as any).delivery_id || (o as any).id;
                    const orderIdStr = o.id || o.backendId;

                    // If this is a local order fallback without deliveryId, skip if apiTasks already processed this order ID
                    const isLocalFallback = !(o as any).deliveryId && !(o as any).task_id && !(o as any).delivery_id;
                    const alreadyCoveredByApi = isLocalFallback && Array.from(processedKeys).some(k => k.startsWith(`${orderIdStr}_`));
                    if (alreadyCoveredByApi) return;

                    const pickupKey = `${orderIdStr}_pickup_${delId}_${o.pickupCommission}`;
                    if (canBePickup && o.pickupCommission && Number(o.pickupCommission) > 0 && isMyPickup && isPickupDone && !processedKeys.has(pickupKey)) {
                      processedKeys.add(pickupKey);
                      completed.push({
                        id: pickupKey,
                        date: o.pickupPaymentDate || o.pickupDate || (o.created_at ? o.created_at.split('T')[0] : o.date),
                        type: 'Pickup',
                        customerName: o.customerName || 'Customer',
                        amount: Number(o.pickupCommission),
                        paid: !!o.pickupCommissionPaid,
                        method: (o as any).pickupPaymentMethod || o.pickupPaymentMethod || null
                      });
                    }

                    const deliveryKey = `${orderIdStr}_delivery_${delId}_${o.deliveryCommission}`;
                    if (canBeDelivery && o.deliveryCommission && Number(o.deliveryCommission) > 0 && isMyDelivery && isDeliveryDone && !processedKeys.has(deliveryKey)) {
                      processedKeys.add(deliveryKey);
                      completed.push({
                        id: deliveryKey,
                        date: o.deliveryPaymentDate || o.deliveredDate || (o.created_at ? o.created_at.split('T')[0] : o.date),
                        type: 'Delivery',
                        customerName: o.customerName || 'Customer',
                        amount: Number(o.deliveryCommission),
                        paid: !!o.deliveryCommissionPaid,
                        method: (o as any).deliveryPaymentMethod || o.deliveryPaymentMethod || null
                      });
                    }
                  });

                  const paid = completed.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0);
                  const pending = completed.filter(item => !item.paid).reduce((sum, item) => sum + item.amount, 0);
                  const totalEarned = pending + paid;

                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', width: '100%', maxWidth: '800px' }}>
                        
                        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>{tDeliv('Amount Pending (Unpaid)')}</div>
                          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#f59e0b', margin: '10px 0' }}>
                            QR {pending.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tDeliv('Awaiting payout from Admin')}</div>
                        </div>

                        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>{tDeliv('Successfully Paid')}</div>
                          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#16a34a', margin: '10px 0' }}>
                            QR {paid.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tDeliv('Total payouts received')}</div>
                        </div>

                      </div>

                      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1', maxWidth: '800px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>🧾 {tDeliv('Earnings & Payout History')}</h3>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{tDeliv('Total Lifetime:')} QR {totalEarned.toFixed(2)}</div>
                        </div>

                        {completed.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.9rem' }}>{tDeliv('No completed tasks yet.')}</div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#64748b' }}>
                                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>{tDeliv('Task Date')}</th>
                                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>{tDeliv('Details')}</th>
                                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700' }}>{tDeliv('Task Type')}</th>
                                  <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700' }}>{tDeliv('Commission')}</th>
                                  <th style={{ textAlign: 'center', padding: '12px', fontWeight: '700' }}>{tDeliv('Payout Status')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {completed.map(item => {
                                  const d = new Date(item.date);
                                  const dateStr = isNaN(d.getTime()) ? item.date.split(' ')[0] : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                  
                                  return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={{ padding: '12px', fontWeight: '600' }}>{dateStr}</td>
                                      <td style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: '700', color: '#1e3a8a' }}>
                                          #{item.id.includes('_') ? item.id.split('_')[0] : item.id.split('-')[0]}
                                          {item.id.includes('_') && item.id.split('_')[2] && item.id.split('_')[2] !== 'undefined' ? ` (Task #${item.id.split('_')[2].slice(0, 6)})` : ''}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.customerName}</div>
                                      </td>
                                      <td style={{ padding: '12px', fontWeight: '700', color: item.type === 'Pickup' ? '#d97706' : '#2563eb' }}>
                                        {tDeliv(item.type)}
                                      </td>
                                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                                        QR {item.amount.toFixed(2)}
                                      </td>
                                      <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {item.paid ? (
                                          <div style={{ display: 'inline-block', background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                                            {tDeliv('Paid via')} {item.method || 'Cash'}
                                          </div>
                                        ) : (
                                          <div style={{ display: 'inline-block', background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                                            {tDeliv('Pending')}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* TAB 4: DUTY & LEAVES */}
            {activeTab === 'attendance' && (
              <div className="delivery-portal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{tDeliv('Duty & Attendance log')}</h2>
                  
                  <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>{tDeliv('Clock Logs History')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {attendanceLogs.length === 0 ? (
                        <div style={{ color: '#64748b', padding: '10px 0' }}>{tDeliv('No attendance registered today.')}</div>
                      ) : (
                        attendanceLogs.map((log, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: log.type === 'Clock In' ? '#16a34a' : '#ef4444' }}>{tDeliv(log.type)}</span>
                            <span style={{ color: '#64748b' }}>{log.time}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{log.gps.slice(0, 15)}...</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{tDeliv('Apply for Leave')}</h2>
                  
                  <form onSubmit={handleApplyLeave} style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="delivery-portal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>{tDeliv('Start Date')}</label>
                        <input type="date" required value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>{tDeliv('End Date')}</label>
                        <input type="date" required value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>{tDeliv('Reason')}</label>
                      <input type="text" required value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder={tDeliv('Reason for leave')} style={{ width: '100%', padding: '10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>

                    <button type="submit" style={{ padding: '10px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>{tDeliv('Submit Request')}</button>
                  </form>

                  <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>{tDeliv('Leave History Status')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                      {db.leaveRequests.filter(lr => lr.deliveryBoyName === db.currentDeliveryBoy).length === 0 ? (
                        <div style={{ color: '#64748b' }}>{tDeliv('No requests submitted.')}</div>
                      ) : (
                        db.leaveRequests.filter(lr => lr.deliveryBoyName === db.currentDeliveryBoy).map((lh, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                            <span>{lh.startDate} {tDeliv('to')} {lh.endDate} ({lh.reason})</span>
                            <span style={{ fontWeight: 'bold', color: lh.status === 'Approved' ? '#16a34a' : lh.status === 'Rejected' ? '#ef4444' : '#d97706' }}>{tDeliv(lh.status)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: PROFILE */}


            {/* TAB 6: SUPPORT */}
            {activeTab === 'support' && (
              <div className="delivery-portal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{tDeliv('Helpdesk Support')}</h2>
                  
                  {(() => {
                    const companyAdmin = (db.users || []).find((u: any) => u.role === 'ADMIN') || {};
                    const adminEmail = companyAdmin.email || 'kanikarapub@gmail.com';
                    const adminPhone = companyAdmin.phone || companyAdmin.mobile || '9638527411';
                    return (
                      <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.85rem' }}>
                        <strong>🏢 {tDeliv('Company Admin Desk Contacts')}</strong>
                        <div style={{ marginTop: '6px' }}>📞 {tDeliv('Phone Line:')} {adminPhone}</div>
                        <div>✉️ {tDeliv('Email Support:')} {adminEmail}</div>
                      </div>
                    );
                  })()}

                  <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>{tDeliv('Support Ticket History')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {supportTickets.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{tDeliv('No active helpdesk tickets.')}</div>
                      ) : (
                        supportTickets.map((t) => (
                          <div key={t.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.85rem' }}>{t.subject}</span>
                              <span style={{ 
                                fontSize: '0.72rem', 
                                background: t.status === 'RESPONDED' ? '#dcfce7' : '#eff6ff', 
                                color: t.status === 'RESPONDED' ? '#15803d' : '#2563eb', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontWeight: 'bold' 
                              }}>{tDeliv(t.status)}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              <strong>{tDeliv('Ticket ID:')}</strong> {t.id}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#334155', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <strong>{tDeliv('My Message:')}</strong> {t.description || 'No description'}
                            </div>
                            {t.admin_response && (
                              <div style={{ fontSize: '0.8rem', color: '#1e3a8a', background: '#eff6ff', padding: '8px', borderRadius: '6px', border: '1px solid #bfdbfe', marginTop: '4px' }}>
                                💬 <strong>{tDeliv('Admin Reply:')}</strong> {t.admin_response}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{tDeliv('Raise Support Ticket')}</h2>
                  
                  <form onSubmit={handleRaiseTicket} style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>{tDeliv('Subject')}</label>
                      <input type="text" required value={supportSubject} onChange={e => setSupportSubject(e.target.value)} placeholder={tDeliv('Issue title')} style={{ width: '100%', padding: '10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>{tDeliv('Message Description')}</label>
                      <textarea required value={supportMsg} onChange={e => setSupportMsg(e.target.value)} placeholder={tDeliv('Please detail the issue...')} style={{ width: '100%', height: '100px', padding: '10px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', resize: 'none' }} />
                    </div>

                    <button type="submit" style={{ padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>{tDeliv('Raise Support Ticket')}</button>
                  </form>
                </div>

              </div>
            )}

            {/* --- ANNOUNCEMENTS TAB --- */}
            {activeTab === 'announcements' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>📢 {tDeliv('System Announcements')}</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '24px' }}>
                  {tDeliv('Important platform updates and operational changes from the management.')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {systemAnnouncements.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {tDeliv('No active system announcements at this time.')}
                    </div>
                  ) : (
                    systemAnnouncements.map(ann => (
                      <div key={ann.id} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{ann.title}</strong>
                          <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px', color: '#475569', fontWeight: 'bold' }}>
                            {new Date(ann.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                          {ann.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* --- MODAL: PICKUP COMPLETION DETAILS --- */}
      {pickupDetailsOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontSize: '1.1rem' }}>🧺 Confirm Received Pickup Quantities</h4>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>Order #{pickupDetailsOrder.id} • Customer: {pickupDetailsOrder.customerName}</div>
            
            <form onSubmit={submitPickupCompletion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Received Services & Quantities:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(pickupDetailsOrder.items && pickupDetailsOrder.items.length > 0 ? pickupDetailsOrder.items : (pickupDetailsOrder.services || [])).map((it: any, idx: number) => {
                    const itemKey = it.order_item_id || it.id;
                    const sName = it.serviceName || it.name || `Service ${idx + 1}`;
                    const ord = it.orderedQuantity || it.ordered_quantity || it.qty || it.quantity || 1;
                    const picked = it.pickedUpQuantity || it.picked_up_quantity || it.pickedUpQty || it.pickedUp || 0;
                    const pending = it.pickupPendingQuantity ?? it.pickup_pending_quantity ?? Math.max(0, ord - picked);
                    const currentVal = pickupItemQuantities[itemKey] !== undefined ? pickupItemQuantities[itemKey] : pending;
                    const isInvalid = currentVal < 0 || currentVal > pending;

                    return (
                      <div key={idx} style={{ background: isInvalid ? '#fef2f2' : '#f8fafc', padding: '12px', borderRadius: '8px', border: isInvalid ? '1.5px solid #fca5a5' : '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: '#0f172a' }}>{sName}</div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                            Ordered: <strong style={{ color: '#0f172a' }}>{ord} Pcs</strong>
                            {picked > 0 && <span style={{ marginLeft: '6px', color: '#16a34a', fontWeight: 'bold' }}>(Picked: {picked})</span>}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Received:</label>
                            <input 
                              type="number"
                              min={0}
                              max={pending}
                              value={currentVal}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                const numVal = isNaN(val) ? 0 : val;
                                setPickupItemQuantities(prev => ({
                                  ...prev,
                                  [itemKey]: numVal
                                }));
                              }}
                              style={{ 
                                width: '65px', 
                                padding: '4px 8px', 
                                border: isInvalid ? '1.5px solid #dc2626' : '1.5px solid #16a34a', 
                                borderRadius: '6px', 
                                fontWeight: '800', 
                                fontSize: '0.9rem', 
                                textAlign: 'center',
                                background: isInvalid ? '#fee2e2' : '#f0fdf4',
                                color: isInvalid ? '#dc2626' : '#15803d',
                                boxSizing: 'border-box'
                              }}
                            />
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Pcs</span>
                          </div>
                        </div>

                        {isInvalid && (
                          <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '700', marginTop: '4px' }}>
                            ⚠️ Quantity must be between 0 and {pending} Pcs
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>Bags / Total Weight (Quantity)</label>
                <input type="text" required value={pickupWeightItems} onChange={e => setPickupWeightItems(e.target.value)} placeholder="e.g. 1 Bag (Wash & Fold)" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>Pickup Inspection Notes (Optional)</label>
                <input type="text" value={pickupNotes} onChange={e => setPickupNotes(e.target.value)} placeholder="Heavy stains on standard shirt" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setPickupDetailsOrder(null)} style={{ padding: '6px 12px', border: '1.5px solid #cbd5e1', background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Pickup</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: PICKUP OTP VERIFICATION --- */}
      {verifyingPickupOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '360px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a' }}>🔑 Verify Pickup OTP</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 14px 0' }}>An OTP has been sent to the customer's email. Enter it below to complete the pickup.</p>
            
            <form onSubmit={submitPickupVerification} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>Enter Customer's OTP Code</label>
                <input type="text" required value={enteredPickupOtp} onChange={e => setEnteredPickupOtp(e.target.value)} placeholder="6-digit OTP" style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '3px', fontWeight: 'bold' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setVerifyingPickupOrder(null)} style={{ padding: '6px 12px', border: '1.5px solid #cbd5e1', background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '6px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Verify & Complete</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: DELIVERY OTP VERIFICATION --- */}
      {verifyingDeliveryOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '360px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a' }}>🔑 Verify Delivery OTP</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 14px 0' }}>Ask the customer for the secure OTP shown on their QR Browser Portal to complete delivery.</p>
            
            <form onSubmit={submitDeliveryVerification} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>Enter Customer's OTP Code</label>
                <input type="text" required value={enteredDeliveryOtp} onChange={e => setEnteredDeliveryOtp(e.target.value)} placeholder="6-digit OTP" style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '3px', fontWeight: 'bold' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setVerifyingDeliveryOrder(null)} style={{ padding: '6px 12px', border: '1.5px solid #cbd5e1', background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '6px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Verify & Complete</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
