import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { Loader2 } from "lucide-react"

import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import { authService } from "@/services/auth/auth.service"

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, setAuthenticated, clearAuthenticated } = useAuth()
  const location = useLocation()
  const [loading, setLoading] = useState(!isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(false)
      return
    }

    let mounted = true

    authService.refreshAccessToken()
      .then(() => {
        setAuthenticated()
        if (mounted) {
          setLoading(false)
        }
      })
      .catch(() => {
        clearAuthenticated()
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [clearAuthenticated, isAuthenticated, setAuthenticated])

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

  if (!isAuthenticated) {
    return <Navigate to={AUTH_PATH.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
