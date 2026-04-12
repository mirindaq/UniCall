import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { API_PREFIXES } from '@/constants/api-prefixes';

const DEFAULT_GATEWAY_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '8088';
const LOGIN_PATH = process.env.EXPO_PUBLIC_LOGIN_PATH ?? '/login';
const AUTH_API_PREFIX = API_PREFIXES.auth;
const MOBILE_CLIENT_TYPE = 'mobile';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const stripLegacyGatewayPath = (value: string) =>
  stripTrailingSlash(value).replace(/\/api-gateway$/i, '');

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
    return stripLegacyGatewayPath(envBaseUrl);
  }

  const expoHost = getExpoDevHost();

  if (expoHost) {
    return `http://${expoHost}:${DEFAULT_GATEWAY_PORT}`;
  }

  if (Platform.OS === 'android') {
    // Android emulator cannot reach host machine via localhost.
    return `http://10.0.2.2:${DEFAULT_GATEWAY_PORT}`;
  }

  return `http://localhost:${DEFAULT_GATEWAY_PORT}`;
};

const API_BASE_URL = resolveApiBaseUrl();

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;
let hydrated = Platform.OS === 'web';
let hydratePromise: Promise<void> | null = null;

const readStorage = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  await ensureHydrated();
  if (key === ACCESS_TOKEN_KEY) return memoryAccessToken;
  if (key === REFRESH_TOKEN_KEY) return memoryRefreshToken;
  return null;
};

const writeStorage = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
  if (key === ACCESS_TOKEN_KEY) {
    memoryAccessToken = value;
  }
  if (key === REFRESH_TOKEN_KEY) {
    memoryRefreshToken = value;
  }
};

const removeStorage = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
  if (key === ACCESS_TOKEN_KEY) {
    memoryAccessToken = null;
  }
  if (key === REFRESH_TOKEN_KEY) {
    memoryRefreshToken = null;
  }
};

const ensureHydrated = async () => {
  if (Platform.OS === 'web' || hydrated) {
    return;
  }

  if (!hydratePromise) {
    hydratePromise = (async () => {
      const [storedAccessToken, storedRefreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      memoryAccessToken = storedAccessToken;
      memoryRefreshToken = storedRefreshToken;
      hydrated = true;
    })().finally(() => {
      hydratePromise = null;
    });
  }

  await hydratePromise;
};

const clearAuthData = async () => {
  await Promise.all([removeStorage(ACCESS_TOKEN_KEY), removeStorage(REFRESH_TOKEN_KEY)]);
};

export const authTokenStore = {
  get: () => readStorage(ACCESS_TOKEN_KEY),
  getRefresh: () => readStorage(REFRESH_TOKEN_KEY),
  set: async (accessToken: string, refreshToken?: string | null) => {
    await writeStorage(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await writeStorage(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  clear: async () => {
    await clearAuthData();
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
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

const isAuthRequest = (url?: string) =>
  Boolean(
    url?.includes(`${AUTH_API_PREFIX}/login`) ||
    url?.includes(`${AUTH_API_PREFIX}/register`) ||
    url?.includes(`${AUTH_API_PREFIX}/resend-verification-email`) ||
    url?.includes(`${AUTH_API_PREFIX}/forgot-password`) ||
    url?.includes(`${AUTH_API_PREFIX}/change-password`) ||
    url?.includes(`${AUTH_API_PREFIX}/refresh`) ||
    url?.includes(`${AUTH_API_PREFIX}/logout`)
  );

const isAccountDeletionRequest = (url?: string) =>
  Boolean(
    url?.includes(`${API_PREFIXES.users}/me/deletion-request`)
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
  async (config) => {
    config.headers['X-Client-Type'] = MOBILE_CLIENT_TYPE;
    const accessToken = await readStorage(ACCESS_TOKEN_KEY);
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
      // Wrong password on account deletion should stay on current screen.
      if (isAccountDeletionRequest(originalRequest.url)) {
        return Promise.reject(error);
      }

      if (isAuthRequest(originalRequest.url) || originalRequest._retry) {
        await clearAuthData();
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
        const currentRefreshToken = await readStorage(REFRESH_TOKEN_KEY);
        if (!currentRefreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(
          `${API_BASE_URL}${AUTH_API_PREFIX}/refresh`,
          { refreshToken: currentRefreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Type': MOBILE_CLIENT_TYPE,
            },
          }
        );

        const newAccessToken = data?.data?.accessToken;
        const rotatedRefreshToken = data?.data?.refreshToken;
        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        await authTokenStore.set(newAccessToken, rotatedRefreshToken);

        axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearAuthData();
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
