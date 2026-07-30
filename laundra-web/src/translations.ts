export type Language = 'en' | 'ar';

const NAME_MAP: Record<string, string> = {
  'bhanuprakash': 'بانوبراكاش',
  'bhanu': 'بانو',
  'prakash': 'براكاش',
  'charan': 'شاران',
  'sravan': 'شرافان',
  'harish': 'هاريش',
  'srinadh': 'سريناث',
  'srilekha': 'سريليخا',
  'raj': 'راج',
  'assda': 'أسدا',
  'dfxfd': 'دفكسفد',
  'mnbvc': 'منبوك',
  'fdghjk': 'فدجهك',
  'kjhgfd': 'كجهغفد',
  'etsdr': 'إتسدر',
  'erty': 'إرتي',
  'asdfg': 'أسدفج',
  'john': 'جون',
  'doe': 'دو',
  'john doe': 'جون دو',
  'admin': 'المدير',
  'cashier': 'الكاشير',
  'delivery staff': 'فريق التوصيل',
  'manager': 'المدير',
  'walk-in / guest': 'عميل زائر',
  'walk-in': 'عميل زائر',
  'guest': 'زائر'
};

export const translateNameToArabic = (name: string): string => {
  if (!name) return '';
  const lower = name.trim().toLowerCase();
  
  if (NAME_MAP[lower]) {
    return NAME_MAP[lower];
  }

  const words = name.trim().split(/\s+/);
  if (words.length > 1) {
    return words.map(w => translateNameToArabic(w)).join(' ');
  }

  let str = lower;
  const replacements: [RegExp, string][] = [
    [/sh/g, 'ش'], [/ch/g, 'ش'], [/th/g, 'ث'], [/dh/g, 'ذ'],
    [/kh/g, 'خ'], [/gh/g, 'غ'], [/ph/g, 'ف'], [/bh/g, 'ب'],
    [/ee/g, 'ي'], [/oo/g, 'و'], [/b/g, 'ب'], [/p/g, 'ب'],
    [/t/g, 'ت'], [/j/g, 'ج'], [/h/g, 'هـ'], [/d/g, 'د'],
    [/r/g, 'ر'], [/z/g, 'ز'], [/s/g, 'س'], [/f/g, 'ف'],
    [/v/g, 'ف'], [/q/g, 'ق'], [/k/g, 'ك'], [/l/g, 'ل'],
    [/m/g, 'م'], [/n/g, 'ن'], [/w/g, 'و'], [/y/g, 'ي'],
    [/a/g, 'ا'], [/i/g, 'ي'], [/u/g, 'و'], [/e/g, 'ي'], [/o/g, 'و']
  ];

  for (const [pattern, replacement] of replacements) {
    str = str.replace(pattern, replacement);
  }

  return str || name;
};

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Top Bar & Navigation
    'nav.home': 'Home',
    'nav.features': 'Features',
    'nav.services': 'Services',
    'nav.liveTracking': 'Live Tracking',
    'nav.contact': 'Contact',
    'nav.login': 'Login',
    'nav.signOut': 'Sign Out',
    'nav.backToMenu': 'Back to Menu',
    'nav.operationalDesk': 'Operational Desk',
    'nav.managerDesk': 'Manager Desk',
    'nav.customerHub': 'Customer Hub',
    'nav.deliveryHub': 'Delivery Hub',
    'nav.notifications': 'Notifications',
    'nav.clearAll': 'Clear All',
    'nav.noNotifications': 'No new notifications',

    // Landing Page
    'landing.badge': 'PURE CARE, SAME-DAY DELIVERY',
    'landing.heroTitle': 'The operating system for modern garment care.',
    'landing.heroSubtitle': 'Book premium dry cleaning, wash & fold, or steam pressing directly online. Enjoy automated tracking, custom preferences, and doorstep pickup.',
    'landing.bookPickup': 'Book a Laundry Pickup',
    'landing.ecoWash': 'Eco-Friendly Wash',
    'landing.sameDay': 'Same-Day Pickup',
    'landing.realTimeTracking': 'Real-time Tracking',
    'landing.suiteTitle': 'Complete Operational Suite',
    'landing.suiteSubtitle': 'Everything you need to run your laundry operations smoothly.',

    // Sidebar & Menu Items
    'menu.dashboard': 'Dashboard',
    'menu.pos': 'POS / New Order',
    'menu.orders': 'Order Management',
    'menu.orderHistory': 'Order History',
    'menu.customers': 'Customer Management',
    'menu.cashiers': 'Cashier Management',
    'menu.deliveryStaff': 'Delivery Staff',
    'menu.deliveryPayments': 'Delivery Payments',
    'menu.services': 'Service Management',
    'menu.coupons': 'Coupons Manager',
    'menu.packages': 'Packages Manager',
    'menu.walletLoyalty': 'Wallet & Loyalty',
    'menu.expenses': 'Expenses Book',
    'menu.reports': 'Business Reports',
    'menu.announcements': 'Announcements',
    'menu.reviews': 'Customer Reviews',
    'menu.customerSupport': 'Customer/Delivery Support',
    'menu.auditLogs': 'Audit Activity Logs',
    'menu.support': 'Help & Support',

    // Full Screen / Sidebar Toggles
    'toggle.showSidebar': 'Show Sidebar Menu',
    'toggle.hideSidebar': 'Hide Sidebar Menu',
    'toggle.fullScreen': 'Full Screen Mode',

    // Common Buttons & Actions
    'action.createCustomer': 'Create Customer',
    'action.createManualOrder': 'Create Manual Order',
    'action.addPackage': 'Add Package',
    'action.renewPackage': 'Renew Package',
    'action.purchasePackage': 'Purchase Package',
    'action.deductUsage': 'Deduct Usage',
    'action.wallet': 'Wallet',
    'action.loyalty': 'Loyalty',
    'action.waPass': 'WA Pass',
    'action.view': 'View',
    'action.delete': 'Delete',
    'action.apply': 'Apply',
    'action.checkout': 'Checkout',
    'action.search': 'Search name, ID, or phone...',

    // POS & Cart
    'pos.cartDetails': 'Checkout Cart Details',
    'pos.cartEmpty': 'Cart is empty',
    'pos.selectCustomer': 'Select Customer',
    'pos.newCustomer': 'New Customer',
    'pos.enterCoupon': 'Enter Coupon Code',
    'pos.cartSubtotal': 'Cart Subtotal:',
    'pos.manualDiscount': 'Manual Discount (QR):',
    'pos.totalAmount': 'POS Total Amount:',
    'pos.paymentMethod': 'Payment Method',
    'pos.cashPayment': 'Cash payment',
    'pos.cardPayment': 'Card payment',
    'pos.walletPayment': 'Wallet payment',
    'pos.payLater': 'Pay Later',

    // Table Headers
    'th.customerId': 'Customer ID',
    'th.customerName': 'Customer Name',
    'th.customerType': 'Customer Type',
    'th.contact': 'Contact',
    'th.qrStatus': 'QR / Wallet Status',
    'th.walletBalance': 'Wallet Balance',
    'th.actions': 'Actions',
    'th.orderId': 'Order ID',
    'th.customer': 'Customer',
    'th.orderDate': 'Order Date',
    'th.deliveryDate': 'Delivery Date',
    'th.totalAmount': 'Total Amount',
    'th.status': 'Status',
    'th.paymentStatus': 'Payment Status',
    'th.courier': 'Assigned Courier',
    'th.modifyStatus': 'Modify Status',

    // Customer Types & Package Status
    'status.activePackage': 'Active Package',
    'status.regularCustomer': 'Regular Customer',
    'status.created': 'Created',
    'status.accepted': 'Accepted',
    'status.received': 'Received',
    'status.ready': 'Ready',
    'status.outForDelivery': 'Out For Delivery',
    'status.delivered': 'Delivered',
    'status.paid': 'Paid',
    'status.unpaid': 'Unpaid'
  },
  ar: {
    // Top Bar & Navigation
    'nav.home': 'الرئيسية',
    'nav.features': 'المميزات',
    'nav.services': 'الخدمات',
    'nav.liveTracking': 'التتبع المباشر',
    'nav.contact': 'اتصل بنا',
    'nav.login': 'تسجيل الدخول',
    'nav.signOut': 'تسجيل الخروج',
    'nav.backToMenu': 'العودة للقائمة',
    'nav.operationalDesk': 'مكتب العمليات',
    'nav.managerDesk': 'مكتب المدير',
    'nav.customerHub': 'مركز العملاء',
    'nav.deliveryHub': 'مركز التوصيل',
    'nav.notifications': 'الإشعارات',
    'nav.clearAll': 'مسح الكل',
    'nav.noNotifications': 'لا توجد إشعارات جديدة',

    // Landing Page
    'landing.badge': 'عناية فائقة، توصيل في نفس اليوم',
    'landing.heroTitle': 'نظام التشغيل المتكامل للعناية بالملابس الحديثة.',
    'landing.heroSubtitle': 'احجز خدمات الغسيل، التنظيف الجاف، أو الكي بالبخار مباشرة عبر الإنترنت. استمتع بالتتبع الآلي والتوصيل حتى باب المنزل.',
    'landing.bookPickup': 'حجز استلام الملابس',
    'landing.ecoWash': 'غسيل صديق للبيئة',
    'landing.sameDay': 'استلام في نفس اليوم',
    'landing.realTimeTracking': 'تتبع مباشر للطلبات',
    'landing.suiteTitle': 'منظومة العمليات الكاملة',
    'landing.suiteSubtitle': 'كل ما تحتاجه لإدارة عمليات المغسلة بكل سلاسة.',

    // Sidebar & Menu Items
    'menu.dashboard': 'لوحة التحكم',
    'menu.pos': 'نقطة البيع / طلب جديد',
    'menu.orders': 'إدارة الطلبات',
    'menu.orderHistory': 'سجل الطلبات',
    'menu.customers': 'إدارة العملاء',
    'menu.cashiers': 'إدارة الكاشير',
    'menu.deliveryStaff': 'فريق التوصيل',
    'menu.deliveryPayments': 'مدفوعات التوصيل',
    'menu.services': 'إدارة الخدمات',
    'menu.coupons': 'إدارة الكوبونات',
    'menu.packages': 'إدارة الباقات',
    'menu.walletLoyalty': 'المحفظة والولاء',
    'menu.expenses': 'دفتر المصروفات',
    'menu.reports': 'التقارير المالية',
    'menu.announcements': 'الإعلانات',
    'menu.reviews': 'تقييمات العملاء',
    'menu.customerSupport': 'الدعم الفني والعملاء',
    'menu.auditLogs': 'سجل التدقيق',
    'menu.support': 'المساعدة والدعم',

    // Full Screen / Sidebar Toggles
    'toggle.showSidebar': 'عرض القائمة الجانبية',
    'toggle.hideSidebar': 'إخفاء القائمة الجانبية',
    'toggle.fullScreen': 'وضع الشاشة الكاملة',

    // Common Buttons & Actions
    'action.createCustomer': 'إضافة عميل',
    'action.createManualOrder': 'إنشاء طلب يدوي',
    'action.addPackage': 'إضافة باقة',
    'action.renewPackage': 'تجديد الباقة',
    'action.purchasePackage': 'شراء باقة',
    'action.deductUsage': 'خصم استخدام',
    'action.wallet': 'المحفظة',
    'action.loyalty': 'الولاء',
    'action.waPass': 'بطاقة واتساب',
    'action.view': 'عرض',
    'action.delete': 'حذف',
    'action.apply': 'تطبيق',
    'action.checkout': 'إتمام الدفع',
    'action.search': 'البحث باسم، رقم، أو هاتف...',

    // POS & Cart
    'pos.cartDetails': 'تفاصيل سلة الشراء',
    'pos.cartEmpty': 'السلة فارغة',
    'pos.selectCustomer': 'اختيار العميل',
    'pos.newCustomer': 'عميل جديد',
    'pos.enterCoupon': 'إدخال رمز الكوبون',
    'pos.cartSubtotal': 'مجموع السلة:',
    'pos.manualDiscount': 'خصم يدوي (ر.ق):',
    'pos.totalAmount': 'الإجمالي النهائي:',
    'pos.paymentMethod': 'طريقة الدفع',
    'pos.cashPayment': 'دفع نقدي',
    'pos.cardPayment': 'دفع بالبطاقة',
    'pos.walletPayment': 'دفع من المحفظة',
    'pos.payLater': 'الدفع لاحقاً',

    // Table Headers
    'th.customerId': 'معرف العميل',
    'th.customerName': 'اسم العميل',
    'th.customerType': 'نوع العميل',
    'th.contact': 'التواصل',
    'th.qrStatus': 'حالة الرمز والمحفظة',
    'th.walletBalance': 'رصيد المحفظة',
    'th.actions': 'الإجراءات',
    'th.orderId': 'رقم الطلب',
    'th.customer': 'العميل',
    'th.orderDate': 'تاريخ الطلب',
    'th.deliveryDate': 'تاريخ التوصيل',
    'th.totalAmount': 'المبلغ الإجمالي',
    'th.status': 'الحالة',
    'th.paymentStatus': 'حالة الدفع',
    'th.courier': 'مندوب التوصيل',
    'th.modifyStatus': 'تعديل الحالة',

    // Customer Types & Package Status
    'status.activePackage': 'باقة نشطة',
    'status.regularCustomer': 'عميل منتظم',
    'status.created': 'تم الإنشاء',
    'status.accepted': 'مقبول',
    'status.received': 'تم الاستلام',
    'status.ready': 'جاهز',
    'status.outForDelivery': 'قيد التوصيل',
    'status.delivered': 'تم التوصيل',
    'status.paid': 'مدفوع',
    'status.unpaid': 'غير مدفوع'
  }
};
