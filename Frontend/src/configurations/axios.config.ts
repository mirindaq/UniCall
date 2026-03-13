import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { toast } from "sonner"
import { API_PREFIX } from "@/constants/api"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
const LOGIN_PATH = import.meta.env.VITE_LOGIN_PATH ?? "/login"

const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)
const setAccessToken = (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token)
const setRefreshToken = (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token)
const clearAuthData = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 300000,
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
      return
    }
    resolve(token!)
  })
  failedQueue = []
}

axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (!error.response || !originalRequest) {
      return Promise.reject(error)
    }

    const status = error.response.status

    if (status === 403) {
      toast.error("Khong co quyen truy cap")
      return Promise.reject(error)
    }

    if (status === 500) {
      toast.error((error.response.data as { message?: string })?.message ?? "Loi server")
      return Promise.reject(error)
    }

    if (status === 409) {
      toast.error((error.response.data as { message?: string })?.message ?? "Xung dot du lieu")
      return Promise.reject(error)
    }

    if (status === 401) {
      if (originalRequest.url?.includes("/auth/refresh-token") || originalRequest._retry) {
        toast.error("Phien dang nhap da het han. Vui long dang nhap lai.")
        clearAuthData()
        window.location.href = LOGIN_PATH
        return Promise.reject(error)
      }

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearAuthData()
        window.location.href = LOGIN_PATH
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              originalRequest._retry = true
              resolve(axiosClient(originalRequest))
            },
            reject: (err) => reject(err),
          })
        })
      }

      isRefreshing = true
      originalRequest._retry = true

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}${API_PREFIX}/auth/refresh-token`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        )

        const newAccessToken = data?.data?.accessToken
        if (!newAccessToken) {
          throw new Error("No access token in refresh response")
        }

        setAccessToken(newAccessToken)
        if (data?.data?.refreshToken) {
          setRefreshToken(data.data.refreshToken)
        }

        axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        processQueue(null, newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axiosClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        toast.error("Phien dang nhap da het han. Vui long dang nhap lai.")
        clearAuthData()
        window.location.href = LOGIN_PATH
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default axiosClient
