import { useEffect, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Navigate } from "react-router"

import { USER_PATH } from "@/constants/user"
import { useAuth } from "@/contexts/auth-context"
import { authService } from "@/services/auth/auth.service"

interface GuestRouteProps {
  children: ReactNode
}

export default function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, setAuthenticated, clearAuthenticated } = useAuth()
  const [loading, setLoading] = useState(() => !isAuthenticated)

  useEffect(() => {
    let mounted = true

    if (isAuthenticated) {
      setLoading(false)
      return
    }

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
          Dang kiem tra phien dang nhap...
        </div>
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={`${USER_PATH.ROOT}/${USER_PATH.CHAT}`} replace />
  }

  return <>{children}</>
}
