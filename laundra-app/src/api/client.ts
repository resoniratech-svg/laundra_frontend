import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  // 1. Explicit environment variable (Production / QA override)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Web browser
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:8000`;
  }

  // 3. Localhost Development on Phone via Expo Go
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8000`;
  }

  // 4. Default fallback to machine local network IP
  return 'http://192.168.1.16:8000';
};

export const API_BASE_URL = getBaseUrl();

console.log('==============================');
console.log('Platform      :', Platform.OS);
console.log('Host URI      :', Constants.expoConfig?.hostUri);
console.log('API_BASE_URL  :', API_BASE_URL);
console.log('==============================');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

apiClient.interceptors.request.use(
  async (config) => {
    if (!config.headers.Authorization) {
      try {
        let token: string | null = null;

        if (Platform.OS === 'web') {
          token =
            localStorage.getItem('ll_auth_token') ??
            sessionStorage.getItem('ll_auth_token');
        } else {
          token = await SecureStore.getItemAsync('ll_auth_token');
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.warn('Token fetch failed:', err);
      }
    }

    console.log('-----------------------------');
    console.log('REQUEST');
    console.log('BaseURL :', config.baseURL);
    console.log('URL     :', config.url);
    console.log('Full URL:', `${config.baseURL}${config.url}`);
    console.log('Method  :', (config.method || 'GET').toUpperCase());
    console.log('-----------------------------');

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(
      `SUCCESS ${response.status} -> ${response.config.baseURL}${response.config.url}`
    );
    return response;
  },
  (error) => {
    console.warn('-----------------------------');
    console.warn('RESPONSE ERROR');
    console.warn('Code    :', error?.code);
    console.warn('Message :', error?.message);
    console.warn('Status  :', error?.response?.status);
    console.warn(
      'URL     :',
      `${error?.config?.baseURL || ''}${error?.config?.url || ''}`
    );
    console.warn('-----------------------------');

    return Promise.reject(error);
  }
);