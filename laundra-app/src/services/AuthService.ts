import { apiClient } from '../api/client';
import { User } from '../types/user';
import { SessionService } from '../utils/session';

export const AuthService = {
  login: async (email: string, pass: string): Promise<{ user: User; token: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = pass.trim();

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please enter both email address and password.');
    }

    try {
      const res = await apiClient.post('/api/v1/auth/login', {
        email: cleanEmail,
        password: cleanPassword,
      });

      if (res.data && res.data.access_token) {
        const token = res.data.access_token;
        const userData = res.data.user || {};

        const user: User = {
          id: userData.id || `u-${Date.now()}`,
          name: userData.full_name || userData.name || cleanEmail.split('@')[0],
          email: userData.email || cleanEmail,
          password: '',
          role: userData.role || 'delivery',
          status: userData.status || 'Active',
          companyId: userData.tenant_id || userData.companyId || '',
          companyName: userData.company_name || userData.companyName || (userData.company && userData.company.name) || 'Laundra Operations',
          createdAt: new Date().toISOString(),
        };

        // Save token & user in SecureStore & restore Axios Authorization header
        await SessionService.saveSession(user, token);

        return { user, token };
      }
    } catch (error: any) {
      console.warn('AuthService login backend error:', error?.response?.data || error?.message);
      
      const backendMessage = error?.response?.data?.detail;
      if (typeof backendMessage === 'string') {
        throw new Error(backendMessage);
      } else if (Array.isArray(backendMessage) && backendMessage[0]?.msg) {
        throw new Error(backendMessage[0].msg);
      }
      
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        throw new Error('Incorrect email or password.');
      }

      if (error?.code === 'ECONNABORTED' || error?.message?.includes('Network Error')) {
        throw new Error('Network error. Unable to connect to authentication server.');
      }
    }

    throw new Error('Invalid email or password.');
  },

  logout: async () => {
    await SessionService.clearSession();
  },
};
