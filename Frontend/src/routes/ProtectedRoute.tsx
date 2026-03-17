import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { Loader2 } from "lucide-react"

import { AUTH_PATH } from "@/constants/auth"
import { authService } from "@/services/auth/auth.service"
import { authTokenStore } from "@/stores/auth-token.store"

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const [loading, setLoading] = useState(!authTokenStore.get())
  const [authenticated, setAuthenticated] = useState(Boolean(authTokenStore.get()))

  useEffect(() => {
    if (authTokenStore.get()) {
      setAuthenticated(true)
      setLoading(false)
      return
    }

    let mounted = true

    authService.refreshAccessToken()
      .then((response) => {
        const token = response.data.accessToken
        if (!token) {
          throw new Error("Missing access token")
        }
        authTokenStore.set(token)
        if (mounted) {
          setAuthenticated(true)
        }
      })
      .catch(() => {
        authTokenStore.clear()
        if (mounted) {
          setAuthenticated(false)
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
          <Loader2 className="size-4 animate-spin" />
          Dang xac thuc phien...
        </div>
      </main>
    )
  }

  if (!authenticated) {
    return <Navigate to={AUTH_PATH.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
