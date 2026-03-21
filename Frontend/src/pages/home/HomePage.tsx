import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { ADMIN_PATH } from "@/constants/admin"
import { AUTH_PATH } from "@/constants/auth"
import { USER_PATH } from "@/constants/user"
import { authService } from "@/services/auth/auth.service"
import { authTokenStore } from "@/stores/auth-token.store"

import { Header } from "@/components/home/header"
import { Hero } from "@/components/home/hero"
import { Features } from "@/components/home/features"
import { Stats } from "@/components/home/stats"
import { Ecosystem } from "@/components/home/ecosystem"
import { News } from "@/components/home/news"
import { Footer } from "@/components/home/footer"

export function HomePage() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    } finally {
      authTokenStore.clear()
      toast.success("Đã đăng xuất")
      navigate(AUTH_PATH.LOGIN, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="bg-emerald-500 text-white text-center py-2 text-xs font-bold flex items-center justify-center gap-2">
        <ShieldCheck className="size-4" />
        AUTHENTICATED
        <button onClick={handleLogout} className="underline ml-4">Đăng xuất</button>
      </div>

      <main>
        <Hero />
        <Features />
        <Stats />
        <Ecosystem />
        <News />
      </main>

      <Footer />
    </div>
  )
}