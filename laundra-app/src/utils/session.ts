import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { setAuthToken } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { User } from '../types/user';

const TOKEN_KEY = 'll_auth_token';
const USER_KEY = 'll_auth_user';

// In-memory fallback for web/testing runtime
let memoryToken: string | null = null;
let memoryUser: string | null = null;

async function setItem(key: string, val: string) {
  try {
    if (Platform.OS === 'web') {
      if (key === TOKEN_KEY) memoryToken = val;
      if (key === USER_KEY) memoryUser = val;
    } else {
      await SecureStore.setItemAsync(key, val);
    }
  } catch (e) {
    if (key === TOKEN_KEY) memoryToken = val;
    if (key === USER_KEY) memoryUser = val;
  }
}

async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return key === TOKEN_KEY ? memoryToken : memoryUser;
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    return key === TOKEN_KEY ? memoryToken : memoryUser;
  }
}

async function removeItem(key: string) {
  try {
    if (Platform.OS === 'web') {
      if (key === TOKEN_KEY) memoryToken = null;
      if (key === USER_KEY) memoryUser = null;
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (e) {
    if (key === TOKEN_KEY) memoryToken = null;
    if (key === USER_KEY) memoryUser = null;
  }
}

export const SessionService = {
  saveSession: async (user: User, token: string) => {
    console.log('[SESSION] Saving session token securely to Secure Store...');
    await setItem(TOKEN_KEY, token);
    await setItem(USER_KEY, JSON.stringify(user));
    setAuthToken(token);
    useAuthStore.getState().loginUser(user);
    console.log('[SESSION] Session saved and Axios Authorization header restored.');
  },

  loadSession: async (): Promise<{ user: User; token: string } | null> => {
    console.log('[SESSION] App startup: Hydrating session from Secure Store...');
    const token = await getItem(TOKEN_KEY);
    const userJson = await getItem(USER_KEY);

    if (token && userJson) {
      try {
        const user: User = JSON.parse(userJson);
        console.log(`[SESSION] Secure Store token exists! Restoring JWT for user: ${user.name}`);
        setAuthToken(token);
        useAuthStore.getState().loginUser(user);
        console.log('[SESSION] Axios Authorization header restored automatically.');
        return { user, token };
      } catch (e) {
        console.warn('[SESSION] Failed to parse stored user JSON:', e);
      }
    } else {
      console.log('[SESSION] No saved session found in Secure Store.');
    }
    return null;
  },

  clearSession: async () => {
    console.log('[SESSION] Logging out: Clearing Secure Store session...');
    await removeItem(TOKEN_KEY);
    await removeItem(USER_KEY);
    setAuthToken(null);
    useAuthStore.getState().logoutUser();
    console.log('[SESSION] Secure Store cleared and Axios Authorization header removed.');
  },
};
