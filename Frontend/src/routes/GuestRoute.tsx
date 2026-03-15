import type { ReactNode } from "react"
import { Navigate } from "react-router"

import { AUTH_PATH } from "@/constants/auth"
import { authTokenStore } from "@/stores/auth-token.store"

interface GuestRouteProps {
  children: ReactNode
}

export default function GuestRoute({ children }: GuestRouteProps) {
  const isAuthenticated = Boolean(authTokenStore.get())

  if (isAuthenticated) {
    return <Navigate to={AUTH_PATH.HOME} replace />
  }

  return <>{children}</>
}
