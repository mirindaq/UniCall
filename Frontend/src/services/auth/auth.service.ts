import axios from "axios"

import axiosClient from "@/configurations/axios.config"
import { buildApiUrl } from "@/constants/api"
import type { AccessTokenResponse, LoginRequest, RegisterRequest, RegisterResponse } from "@/types/auth"
import type { ResponseSuccess } from "@/types/api-response"

const AUTH_API_PREFIX = "/identity-service/api/v1/auth"
const authApiUrl = (path: string) => buildApiUrl(`${AUTH_API_PREFIX}${path}`)

export const authService = {
  login: async (payload: LoginRequest): Promise<ResponseSuccess<AccessTokenResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<AccessTokenResponse>>(
      `${AUTH_API_PREFIX}/login`,
      payload
    )
    return response.data
  },

  register: async (payload: RegisterRequest): Promise<ResponseSuccess<RegisterResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<RegisterResponse>>(`${AUTH_API_PREFIX}/register`, payload)
    return response.data
  },

  refreshAccessToken: async (): Promise<ResponseSuccess<AccessTokenResponse>> => {
    const response = await axios.post<ResponseSuccess<AccessTokenResponse>>(
      authApiUrl("/refresh"),
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
      authApiUrl("/logout"),
      {},
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      }
    )
    return response.data
  },
}
