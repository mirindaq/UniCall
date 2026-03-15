import axios from "axios"

import axiosClient from "@/configurations/axios.config"
import { buildApiUrl } from "@/constants/api"
import type { AccessTokenResponse, RegisterRequest, RegisterResponse } from "@/types/auth"
import type { ResponseSuccess } from "@/types/api-response"

export const registerApi = (payload: RegisterRequest) =>
  axiosClient.post<ResponseSuccess<RegisterResponse>>("/auth/register", payload)

export const refreshAccessTokenApi = () =>
  axios.post<ResponseSuccess<AccessTokenResponse>>(
    buildApiUrl("/auth/refresh"),
    {},
    {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    }
  )

export const logoutApi = () =>
  axios.post<ResponseSuccess<void>>(
    buildApiUrl("/auth/logout"),
    {},
    {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    }
  )
