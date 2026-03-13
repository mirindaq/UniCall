import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { API_PREFIX } from '@/constants/api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
const LOGIN_PATH = process.env.EXPO_PUBLIC_LOGIN_PATH ?? '/login';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

const readStorage = (key: string): string | null => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  if (key === ACCESS_TOKEN_KEY) return memoryAccessToken;
  if (key === REFRESH_TOKEN_KEY) return memoryRefreshToken;
  return null;
};

const writeStorage = (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  if (key === ACCESS_TOKEN_KEY) memoryAccessToken = value;
  if (key === REFRESH_TOKEN_KEY) memoryRefreshToken = value;
};

const removeStorage = (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  if (key === ACCESS_TOKEN_KEY) memoryAccessToken = null;
  if (key === REFRESH_TOKEN_KEY) memoryRefreshToken = null;
};

const clearAuthData = () => {
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(REFRESH_TOKEN_KEY);
};

const navigateToLogin = () => {
  if (Platform.OS === 'web') {
    window.location.href = LOGIN_PATH;
    return;
  }
  router.replace(LOGIN_PATH as never);
};

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 300000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(token!);
  });
  failedQueue = [];
};

axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = readStorage(ACCESS_TOKEN_KEY);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status === 403 || status === 409 || status === 500) {
      return Promise.reject(error);
    }

    if (status === 401) {
      if (originalRequest.url?.includes('/auth/refresh-token') || originalRequest._retry) {
        clearAuthData();
        navigateToLogin();
        return Promise.reject(error);
      }

      const refreshToken = readStorage(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        clearAuthData();
        navigateToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              originalRequest._retry = true;
              resolve(axiosClient(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}${API_PREFIX}/auth/refresh-token`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = data?.data?.accessToken;
        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        writeStorage(ACCESS_TOKEN_KEY, newAccessToken);
        if (data?.data?.refreshToken) {
          writeStorage(REFRESH_TOKEN_KEY, data.data.refreshToken);
        }

        axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthData();
        navigateToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
