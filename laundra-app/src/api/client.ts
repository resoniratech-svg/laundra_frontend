import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  // 1. Explicit environment variable (Production / QA)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Web
  if (Platform.OS === 'web') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:8000`;
  }

  // 3. Expo Go / Physical Device
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoGo?.developer?.tool;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];

    if (
      hostIp &&
      hostIp !== 'localhost' &&
      hostIp !== '127.0.0.1'
    ) {
      return `http://${hostIp}:8000`;
    }
  }

  // 4. Android Emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  // 5. iOS Simulator / Desktop
  return 'http://localhost:8000';
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