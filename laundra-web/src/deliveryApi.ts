/**
 * deliveryApi.ts
 * Delivery Boy registration API service.
 *
 * Calls real backend endpoints:
 *   POST /api/v1/auth/delivery-boy/send-otp
 *   POST /api/v1/auth/delivery-boy/register
 *   POST /api/v1/users/:id/approve
 *
 * Each function throws an Error with a human-readable message on failure.
 * Callers can catch the error and fall back to the localStorage simulation
 * when the backend is not yet deployed.
 */

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── Shared helper ───────────────────────────────────────────────────────────

async function httpPost<T = unknown>(path: string, body: object, token?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status} – ${res.statusText}`;
    throw new Error(msg);
  }

  return data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendOtpPayload {
  email: string;
  company_code: string;
}

export interface RegisterDeliveryBoyPayload {
  company_code: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  address: string;
  vehicle_rc: string;
  insurance_number: string;
  emergency_contact: string;
  profile_photo?: string;
  license_file?: string;
  insurance_file?: string;
  otp: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  status: string;
  message: string;
}

export interface ApproveResponse {
  id: string;
  status: string;
  message: string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

/**
 * Step 1 – "Submit Application"
 * Backend generates OTP and emails it to the driver.
 */
export async function apiSendDeliveryOtp(
  payload: SendOtpPayload
): Promise<{ message: string }> {
  return httpPost('/api/v1/auth/delivery-boy/send-otp', payload);
}

/**
 * Step 2 – "Verify & Register"
 * Backend validates OTP, creates the user record with status PENDING_APPROVAL.
 */
export async function apiRegisterDeliveryBoy(
  payload: RegisterDeliveryBoyPayload
): Promise<RegisterResponse> {
  return httpPost('/api/v1/auth/delivery-boy/register', payload);
}

/**
 * Step 3 – Admin "Approve" action
 * Backend checks staff limits, sets status to ACTIVE, sends approval e-mail.
 */
export async function apiApproveDeliveryBoy(
  userId: string,
  token?: string
): Promise<{ message: string }> {
  const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
  
  const res = await fetch(`${BASE_URL}/api/v1/users/${userId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status} - ${res.statusText}`;
    throw new Error(msg);
  }
  
  return { message: data.message || "Application for delivery boy approved! They can now log in to the Delivery Portal." };
}

export async function apiRejectDeliveryBoy(
  userId: string,
  token?: string
): Promise<{ message: string }> {
  const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
  
  const res = await fetch(`${BASE_URL}/api/v1/users/${userId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status} - ${res.statusText}`;
    throw new Error(msg);
  }
  
  return { message: data.message || "Application rejected successfully." };
}

export async function apiSendOrderOtp(
  orderId: string,
  action: 'pickup' | 'delivery',
  token?: string
): Promise<{ message: string }> {
  const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
  
  const res = await fetch(`${BASE_URL}/api/v1/orders/${orderId}/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action }),
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status} - ${res.statusText}`;
    throw new Error(msg);
  }
  
  return { message: data.message || "OTP sent successfully." };
}

export async function apiVerifyOrderOtp(
  orderId: string,
  action: 'pickup' | 'delivery',
  otp: string,
  token?: string
): Promise<any> {
  const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
  
  const res = await fetch(`${BASE_URL}/api/v1/orders/${orderId}/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, otp }),
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status} - ${res.statusText}`;
    throw new Error(msg);
  }
  
  return data;
}
