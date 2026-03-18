import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { toast } from "sonner"

import { API_BASE_URL, buildApiUrl } from "@/constants/api"
import { AUTH_PATH } from "@/constants/auth"
import { authTokenStore } from "@/stores/auth-token.store"
import type { ResponseError, ResponseSuccess } from "@/types/api-response"
import type { AccessTokenResponse } from "@/types/auth"

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

const redirectToLogin = () => {
  authTokenStore.clear()
  window.location.href = LOGIN_PATH
}

const isAuthRequest = (url?: string) =>
  Boolean(
    url?.includes(`${AUTH_API_PREFIX}/login`) ||
      url?.includes(`${AUTH_API_PREFIX}/register`) ||
      url?.includes(`${AUTH_API_PREFIX}/refresh`) ||
      url?.includes(`${AUTH_API_PREFIX}/logout`)
  )

axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = authTokenStore.get()
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
      toast.error((error.response.data as ResponseError)?.message ?? "Loi server")
      return Promise.reject(error)
    }

    if (status === 409) {
      toast.error((error.response.data as ResponseError)?.message ?? "Xung dot du lieu")
      return Promise.reject(error)
    }

    if (status === 401) {
      if (isAuthRequest(originalRequest.url) || originalRequest._retry) {
        redirectToLogin()
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
        const { data } = await axios.post<ResponseSuccess<AccessTokenResponse>>(
          buildApiUrl(`${AUTH_API_PREFIX}/refresh`),
          {},
          {
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          }
        )

        const newAccessToken = data?.data?.accessToken
        if (!newAccessToken) {
          throw new Error("No access token in refresh response")
        }

        authTokenStore.set(newAccessToken)
        processQueue(null, newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axiosClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
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
