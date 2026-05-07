import { useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import { LockKeyhole, ShieldCheck } from "lucide-react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ADMIN_PATH } from "@/constants/admin"
import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import { authService } from "@/services/auth/auth.service"
import { userService } from "@/services/user/user.service"
import type { ResponseError } from "@/types/api-response"
import type { LoginRequest } from "@/types/auth"

function normalizePhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 15)
}

function toVietnamInternationalPhone(localPhone: string) {
  const digits = normalizePhoneInput(localPhone)
  const normalizedLocal = digits.replace(/^0+/, "")
  if (!normalizedLocal) {
    return ""
  }
  return `+84${normalizedLocal}`
}

function toBackendVietnamPhone(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "")
  if (/^84\d{9}$/.test(digits)) {
    return `0${digits.slice(2)}`
  }
  if (/^0\d{9}$/.test(digits)) {
    return digits
  }
  if (/^\d{9}$/.test(digits)) {
    return `0${digits}`
  }
  return phoneNumber.trim()
}

function isValidVietnamPhoneForBackend(phoneNumber: string) {
  return /^0\d{9}$/.test(toBackendVietnamPhone(phoneNumber))
}

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { setAuthenticated, clearAuthenticated } = useAuth()
  const [loginLocalPhone, setLoginLocalPhone] = useState("")
  const [loginData, setLoginData] = useState<LoginRequest>({
    phoneNumber: "",
    password: "",
    firebaseIdToken: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const adminDashboardUrl = `${ADMIN_PATH.ROOT}/${ADMIN_PATH.DASHBOARD}`

  const extractErrorMessage = (error: unknown, fallback: string) => {
    const axiosError = error as AxiosError<ResponseError>
    return axiosError?.response?.data?.message || fallback
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidVietnamPhoneForBackend(loginData.phoneNumber)) {
      toast.error("So dien thoai khong hop le.")
      return
    }

    if (!loginData.password.trim()) {
      toast.error("Vui long nhap mat khau.")
      return
    }

    clearAuthenticated()
    setIsSubmitting(true)

    try {
      const response = await authService.adminLogin({
        ...loginData,
        phoneNumber: toBackendVietnamPhone(loginData.phoneNumber),
        firebaseIdToken: "",
      })
      const profile = await userService.getMyProfile({ forceRefresh: true })
      setAuthenticated(profile.data.identityUserId)
      toast.success(response.message || "Dang nhap admin thanh cong")
      window.location.replace(adminDashboardUrl)
    } catch (error) {
      try {
        await authService.logout()
      } catch {
        // ignore logout errors and clear local state anyway
      }
      clearAuthenticated()
      toast.error(extractErrorMessage(error, "Dang nhap admin that bai."))
      window.history.replaceState(null, "", AUTH_PATH.ADMIN_LOGIN)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_36%,#f8fafc_100%)] px-4 py-8">
      <div className="pointer-events-none absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-cyan-200/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-14%] right-[-8%] h-80 w-80 rounded-full bg-sky-300/40 blur-3xl" />

      <div className="w-full max-w-[460px]">
        <div className="mb-6 text-center text-sky-900">
          <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-sky-700 text-white shadow-lg shadow-sky-200/60">
            <ShieldCheck className="size-8" />
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight">UniCall Admin</p>
          <p className="mt-2 text-sm text-slate-600">
            Cong dang nhap rieng danh cho quan tri vien he thong.
          </p>
        </div>

        <Card className="border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur">
          <CardContent className="px-8 py-8">
            <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
                  <LockKeyhole className="size-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">Đăng nhập quản trị</p>
                </div>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="admin-phone-local">So dien thoai admin</Label>
                <div className="flex gap-2">
                  <div className="flex h-11 w-[90px] items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm font-medium text-slate-700">
                    VN +84
                  </div>
                  <Input
                    id="admin-phone-local"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Nhap so dien thoai"
                    value={loginLocalPhone}
                    onChange={(event) => {
                      const localPhone = normalizePhoneInput(event.target.value)
                      setLoginLocalPhone(localPhone)
                      setLoginData((prev) => ({
                        ...prev,
                        phoneNumber: toVietnamInternationalPhone(localPhone),
                      }))
                    }}
                    required
                    className="h-11 flex-1 border-slate-300 focus-visible:ring-sky-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Mat khau</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Nhap mat khau admin"
                  value={loginData.password}
                  onChange={(event) =>
                    setLoginData((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  required
                  className="h-11 border-slate-300 focus-visible:ring-sky-600"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-sky-700 text-white hover:bg-sky-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Dang dang nhap..." : "Dang nhap admin"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-600">
              <span>Dang nhap nguoi dung thong thuong? </span>
              <button
                type="button"
                onClick={() => navigate(AUTH_PATH.LOGIN)}
                className="font-semibold text-sky-700 hover:text-sky-800"
              >
                Ve trang user login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
