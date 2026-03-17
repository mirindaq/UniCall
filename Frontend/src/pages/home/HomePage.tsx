import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { ADMIN_PATH } from "@/constants/admin"
import { AUTH_PATH } from "@/constants/auth"
import { USER_PATH } from "@/constants/user"
import { authService } from "@/services/auth/auth.service"
import { authTokenStore } from "@/stores/auth-token.store"

export function HomePage() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore network error and clear local state
    } finally {
      authTokenStore.clear()
      toast.success("Da dang xuat")
      navigate(AUTH_PATH.LOGIN, { replace: true })
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-white/20 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-lg">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-4 py-1 text-xs font-semibold tracking-wide text-emerald-200 uppercase">
          <ShieldCheck className="size-4" />
          Authenticated
        </div>
        <h1 className="text-3xl font-semibold">Welcome to UniCall</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">
          Ban da dang nhap thanh cong bang Keycloak. Co the tiep tuc xay dung dashboard/chuc nang nghiep vu tu day.
        </p>

        <div className="mt-6 flex items-center gap-3 text-black">
          <Button variant="outline" onClick={() => navigate(`${USER_PATH.ROOT}/${USER_PATH.CHAT}`)}>
            Vao user layout
          </Button>
          <Button onClick={() => navigate(`${ADMIN_PATH.ROOT}/${ADMIN_PATH.DASHBOARD}`)}>
            Vao admin template
          </Button>
          <Button variant="secondary" onClick={handleLogout}>
            Dang xuat
          </Button>
        </div>
      </section>
    </main>
  )
}
