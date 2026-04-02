import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const DEFAULT_GATEWAY_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '8088';
const DEFAULT_GATEWAY_PATH = process.env.EXPO_PUBLIC_API_GATEWAY_PATH ?? '/api-gateway';
const LOGIN_PATH = process.env.EXPO_PUBLIC_LOGIN_PATH ?? '/login';
const AUTH_API_PREFIX = '/identity-service/api/v1/auth';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const extractHost = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.replace(/^[a-zA-Z]+:\/\//, '');
  const hostAndPort = normalized.split('/')[0];
  const host = hostAndPort.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
};

const getExpoDevHost = () => {
  const constants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  };

  return (
    extractHost(constants.expoConfig?.hostUri) ||
    extractHost(constants.expoGoConfig?.debuggerHost) ||
    extractHost(constants.manifest?.debuggerHost) ||
    extractHost(constants.manifest2?.extra?.expoGo?.debuggerHost)
  );
};

const resolveApiBaseUrl = () => {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envBaseUrl) {
    return stripTrailingSlash(envBaseUrl);
  }

  const gatewayPath = ensureLeadingSlash(DEFAULT_GATEWAY_PATH);
  const expoHost = getExpoDevHost();

  if (expoHost) {
    return `http://${expoHost}:${DEFAULT_GATEWAY_PORT}${gatewayPath}`;
  }

  if (Platform.OS === 'android') {
    // Android emulator cannot reach host machine via localhost.
    return `http://10.0.2.2:${DEFAULT_GATEWAY_PORT}${gatewayPath}`;
  }

  return `http://localhost:${DEFAULT_GATEWAY_PORT}${gatewayPath}`;
};

const API_BASE_URL = resolveApiBaseUrl();

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

export const authTokenStore = {
  get: () => readStorage(ACCESS_TOKEN_KEY),
  set: (accessToken: string) => {
    writeStorage(ACCESS_TOKEN_KEY, accessToken);
  },
  clear: () => {
    clearAuthData();
  },
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

const isAuthRequest = (url?: string) =>
  Boolean(
    url?.includes(`${AUTH_API_PREFIX}/login`) ||
      url?.includes(`${AUTH_API_PREFIX}/register`) ||
      url?.includes(`${AUTH_API_PREFIX}/refresh`) ||
      url?.includes(`${AUTH_API_PREFIX}/logout`)
  );

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
      if (isAuthRequest(originalRequest.url) || originalRequest._retry) {
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
          `${API_BASE_URL}${AUTH_API_PREFIX}/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const newAccessToken = data?.data?.accessToken;
        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        authTokenStore.set(newAccessToken);

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
