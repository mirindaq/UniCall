import axios from "axios"

import axiosClient from "@/configurations/axios.config"
import { buildApiUrl } from "@/constants/api"
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationEmailRequest,
} from "@/types/auth"
import type { ResponseSuccess } from "@/types/api-response"

const AUTH_API_PREFIX = "/identity-service/api/v1/auth"
const authApiUrl = (path: string) => buildApiUrl(`${AUTH_API_PREFIX}${path}`)

export const authService = {
  login: async (payload: LoginRequest): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.post<ResponseSuccess<void>>(`${AUTH_API_PREFIX}/login`, payload)
    return response.data
  },

  register: async (payload: RegisterRequest): Promise<ResponseSuccess<RegisterResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<RegisterResponse>>(`${AUTH_API_PREFIX}/register`, payload)
    return response.data
  },

  resendVerificationEmail: async (payload: ResendVerificationEmailRequest): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.post<ResponseSuccess<void>>(
      `${AUTH_API_PREFIX}/resend-verification-email`,
      payload
    )
    return response.data
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.post<ResponseSuccess<void>>(`${AUTH_API_PREFIX}/forgot-password`, payload)
    return response.data
  },

  changePassword: async (payload: ChangePasswordRequest): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.post<ResponseSuccess<void>>(`${AUTH_API_PREFIX}/change-password`, payload)
    return response.data
  },

  refreshAccessToken: async (): Promise<ResponseSuccess<void>> => {
    const response = await axios.post<ResponseSuccess<void>>(
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
