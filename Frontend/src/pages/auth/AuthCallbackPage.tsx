import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router"

import { AUTH_PATH } from "@/constants/auth"
import { authService } from "@/services/auth/auth.service"
import { authTokenStore } from "@/stores/auth-token.store"

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const bootstrapSession = async () => {
      try {
        const response = await authService.refreshAccessToken()
        const accessToken = response.data.accessToken
        if (!accessToken) {
          throw new Error("Missing access token")
        }

        authTokenStore.set(accessToken)
        if (mounted) {
          navigate(AUTH_PATH.HOME, { replace: true })
        }
      } catch (error) {
        authTokenStore.clear()
        toast.error("Dang nhap that bai. Vui long thu lai.")
        if (mounted) {
          navigate(AUTH_PATH.LOGIN, { replace: true })
        }
      }
    }

    bootstrapSession()
    return () => {
      mounted = false
    }
  }, [navigate])

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
        <Loader2 className="size-4 animate-spin" />
        Dang khoi tao phien dang nhap...
      </div>
    </main>
  )
}
