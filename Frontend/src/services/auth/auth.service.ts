import { buildApiUrl } from "@/constants/api"
import type { RegisterRequest } from "@/types/auth"

import { logoutApi, refreshAccessTokenApi, registerApi } from "./auth.api"

const redirectToLogin = () => {
  window.location.href = buildApiUrl("/auth/login")
}

const register = (payload: RegisterRequest) => registerApi(payload)

const refreshAccessToken = () => refreshAccessTokenApi()

const logout = () => logoutApi()

export const authService = {
  redirectToLogin,
  register,
  refreshAccessToken,
  logout,
}
