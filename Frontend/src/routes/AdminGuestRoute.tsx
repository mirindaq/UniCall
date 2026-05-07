import { useEffect, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Navigate } from "react-router"

import { ADMIN_PATH } from "@/constants/admin"
import { useAuth } from "@/contexts/auth-context"
import { authService } from "@/services/auth/auth.service"
import { userService } from "@/services/user/user.service"

interface AdminGuestRouteProps {
  children: ReactNode
}

export default function AdminGuestRoute({ children }: AdminGuestRouteProps) {
  const { isAuthenticated, setAuthenticated, clearAuthenticated } = useAuth()
  const [loading, setLoading] = useState(() => !isAuthenticated)
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true

    const clearAdminLoginSession = async () => {
      try {
        await authService.logout()
      } catch {
        // ignore logout errors and clear local state anyway
      }

      if (mounted) {
        clearAuthenticated()
        setHasAdminAccess(false)
      }
    }

    const resolveAdminSession = async () => {
      if (mounted) {
        setLoading(true)
        setHasAdminAccess(null)
      }

      try {
        if (!isAuthenticated) {
          await authService.refreshAccessToken()
          const profile = await userService.getMyProfile()
          setAuthenticated(profile.data.identityUserId)
        }

        try {
          await userService.checkAdminAccess()
          if (mounted) {
            setHasAdminAccess(true)
          }
        } catch {
          await clearAdminLoginSession()
        }
      } catch {
        await clearAdminLoginSession()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void resolveAdminSession()

    return () => {
      mounted = false
    }
  }, [clearAuthenticated, isAuthenticated, setAuthenticated])

  if (loading || (isAuthenticated && hasAdminAccess === null)) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
          <Loader2 className="size-4 animate-spin" />
          Dang kiem tra phien admin...
        </div>
      </main>
    )
  }

  if (isAuthenticated && hasAdminAccess) {
    return <Navigate to={`${ADMIN_PATH.ROOT}/${ADMIN_PATH.DASHBOARD}`} replace />
  }

  return <>{children}</>
}
