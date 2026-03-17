import axios from "axios"

import axiosClient from "@/configurations/axios.config"
import type { AccessTokenResponse, RegisterRequest, RegisterResponse } from "@/types/auth"
import type { ResponseSuccess } from "@/types/api-response"

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "")
const ensureLeadingSlash = (value: string) => (value.startsWith("/") ? value : `/${value}`)
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8082/identity-service"
const rawApiPrefix = import.meta.env.VITE_API_PREFIX?.trim() || "/api/v1"
const apiBaseUrl = stripTrailingSlash(rawBaseUrl)
const apiPrefix = ensureLeadingSlash(stripTrailingSlash(rawApiPrefix))
const apiBaseWithPrefix = apiBaseUrl.endsWith(apiPrefix) ? apiBaseUrl : `${apiBaseUrl}${apiPrefix}`
const authApiUrl = (path: string) => `${apiBaseWithPrefix}${ensureLeadingSlash(path)}`

export const authService = {
  redirectToLogin: () => {
    window.location.href = authApiUrl("/auth/login")
  },

  register: async (payload: RegisterRequest): Promise<ResponseSuccess<RegisterResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<RegisterResponse>>("/auth/register", payload)
    return response.data
  },

  refreshAccessToken: async (): Promise<ResponseSuccess<AccessTokenResponse>> => {
    const response = await axios.post<ResponseSuccess<AccessTokenResponse>>(
      authApiUrl("/auth/refresh"),
      {},
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      }
    )
    return response.data
  },

  logout: async (): Promise<ResponseSuccess<void>> => {
    const response = await axios.post<ResponseSuccess<void>>(
      authApiUrl("/auth/logout"),
      {},
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      }
    )
    return response.data
  },
}
