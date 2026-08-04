import { apiClient } from '../src/api/client';

async function checkAuthenticatedBackendOrders() {
  console.log('=== LOGGING IN & CHECKING BACKEND API ORDERS ===');
  try {
    // 1. Try logging in as Prakash or admin
    const loginRes = await apiClient.post('/api/v1/auth/login', {
      email: 'prakash@laundra.com',
      password: 'password', // or try fetching public/login
    });
    console.log('Login Response:', loginRes.data);
    const token = loginRes.data.access_token;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const res = await apiClient.get('/api/v1/orders');
    console.log('Orders Count:', res.data.length);
    console.log('Orders:', JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
  }
}

checkAuthenticatedBackendOrders();
