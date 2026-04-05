import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { toast } from "sonner"

import { API_BASE_URL, buildApiUrl } from "@/constants/api"
import { AUTH_PATH } from "@/constants/auth"
import { updateAuthState } from "@/contexts/auth-context"
import type { ResponseError, ResponseSuccess } from "@/types/api-response"

const LOGIN_PATH = import.meta.env.VITE_LOGIN_PATH ?? AUTH_PATH.LOGIN
const AUTH_API_PREFIX = "/identity-service/api/v1/auth"

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 300000,
  withCredentials: true,
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: () => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
      return
    }
    resolve()
  })
  failedQueue = []
}

const redirectToLogin = () => {
  updateAuthState(false)
  window.location.href = LOGIN_PATH
}

const isAuthRequest = (url?: string) =>
  Boolean(
      url?.includes(`${AUTH_API_PREFIX}/login`) ||
      url?.includes(`${AUTH_API_PREFIX}/register`) ||
      url?.includes(`${AUTH_API_PREFIX}/forgot-password`) ||
      url?.includes(`${AUTH_API_PREFIX}/change-password`) ||
      url?.includes(`${AUTH_API_PREFIX}/resend-verification-email`) ||
      url?.includes(`${AUTH_API_PREFIX}/refresh`) ||
      url?.includes(`${AUTH_API_PREFIX}/logout`)
  )

const isAuthLifecycleRequest = (url?: string) =>
  Boolean(url?.includes(`${AUTH_API_PREFIX}/refresh`) || url?.includes(`${AUTH_API_PREFIX}/logout`))

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
      toast.error((error.response.data as ResponseError)?.message ?? "Loi server")
      return Promise.reject(error)
    }

    if (status === 409) {
      toast.error((error.response.data as ResponseError)?.message ?? "Xung dot du lieu")
      return Promise.reject(error)
    }

    if (status === 401) {
      if (originalRequest._retry || isAuthLifecycleRequest(originalRequest.url)) {
        redirectToLogin()
        return Promise.reject(error)
      }

      if (isAuthRequest(originalRequest.url)) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => {
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
        await axios.post<ResponseSuccess<void>>(
          buildApiUrl(`${AUTH_API_PREFIX}/refresh`),
          {},
          {
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          }
        )

        updateAuthState(true)
        processQueue(null)
        return axiosClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        toast.error("Phien dang nhap da het han. Vui long dang nhap lai.")
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default axiosClient
