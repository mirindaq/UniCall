import { useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import { Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { authService } from "@/services/auth/auth.service"
import { userService } from "@/services/user/user.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { ADMIN_PATH } from "@/constants/admin"
import type { LoginRequest } from "@/types/auth"
import type { ResponseError } from "@/types/api-response"

export function AdminAuthPage() {
  const { setAuthenticated, clearAuthenticated } = useAuth()
  const [loginData, setLoginData] = useState<LoginRequest>({
    phoneNumber: "",
    password: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await authService.login(loginData)
      const profile = await userService.getMyProfile()
      if (profile.data.role !== "ADMIN") {
        authService.logout().catch(() => {})
        clearAuthenticated()
        toast.error("Tài khoản không có quyền truy cập khu vực quản trị.")
        return
      }
      setAuthenticated(profile.data.identityUserId)
      toast.success(response.message || "Đăng nhập quản trị thành công")
      window.location.href = `${ADMIN_PATH.ROOT}/${ADMIN_PATH.DASHBOARD}`
    } catch (error) {
      clearAuthenticated()
      const axiosError = error as AxiosError<ResponseError>
      toast.error(
        axiosError?.response?.data?.message ||
          "Đăng nhập thất bại, vui lòng thử lại."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-white/10 text-white">
            <ShieldCheck className="size-8" />
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight">
            UniCall Admin
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Đăng nhập bằng tài khoản quản trị
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="px-6 py-7 sm:px-8">
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="admin-phone" className="text-slate-300">
                  Số điện thoại
                </Label>
                <Input
                  id="admin-phone"
                  type="tel"
                  placeholder="VD: 0987654321"
                  value={loginData.phoneNumber}
                  onChange={(event) =>
                    setLoginData({
                      ...loginData,
                      phoneNumber: event.target.value,
                    })
                  }
                  required
                  className="h-11 border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-slate-300">
                  Mật khẩu
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={loginData.password}
                  onChange={(event) =>
                    setLoginData({ ...loginData, password: event.target.value })
                  }
                  required
                  className="h-11 border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
                />
              </div>
              <Button
                type="submit"
                className="mt-1 h-11 w-full bg-sky-500 text-white hover:bg-sky-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Đăng nhập quản trị"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
