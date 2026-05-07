import { useEffect, useState, type ReactNode } from "react"
import { Navigate } from "react-router"
import { Loader2 } from "lucide-react"

import { AUTH_PATH } from "@/constants/auth"
import { userService } from "@/services/user/user.service"

interface AdminRouteProps {
  children: ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true
    userService.checkAdminAccess()
      .then(() => {
        if (mounted) {
          setAllowed(true)
        }
      })
      .catch(() => {
        if (mounted) {
          setAllowed(false)
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
          Dang kiem tra quyen admin...
        </div>
      </main>
    )
  }

  if (!allowed) {
    return <Navigate to={AUTH_PATH.ADMIN_LOGIN} replace />
  }

  return <>{children}</>
}
