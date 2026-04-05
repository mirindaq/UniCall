import { useEffect, useMemo, useState, type FormEvent } from "react"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useLocation, useNavigate } from "react-router"

import { authService } from "@/services/auth/auth.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { LoginRequest, RegisterRequest } from "@/types/auth"

type AuthTab = "login" | "register"

export function AuthPage() {
  const { setAuthenticated, clearAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<AuthTab>("login")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginData, setLoginData] = useState<LoginRequest>({
    phoneNumber: "",
    password: "",
  })
  const [registerData, setRegisterData] = useState<RegisterRequest>({
    phoneNumber: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    password: "",
  })

  const title = useMemo(() => {
    return tab === "login" ? "Đăng nhập UniCall" : "Đăng ký tài khoản UniCall"
  }, [tab])

  useEffect(() => {
    if (location.pathname === AUTH_PATH.REGISTER) {
      setTab("register")
      return
    }
    setTab("login")
  }, [location.pathname])

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await authService.register(registerData)
      toast.success(response.message || "Đăng ký thành công")
      navigate(AUTH_PATH.LOGIN)
    } catch {
      toast.error("Đăng ký thất bại, vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await authService.login(loginData)
      setAuthenticated()
      toast.success(response.message || "Đăng nhập thành công")
      navigate(AUTH_PATH.HOME)
    } catch {
      clearAuthenticated()
      toast.error("Đăng nhập thất bại, vui lòng kiểm tra số điện thoại và mật khẩu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#e0f2fe_0%,#f8fafc_48%,#dbeafe_100%)] px-4 py-8">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl" />
      <div className="w-full max-w-[560px]">
        <div className="mb-6 flex flex-col items-center justify-center text-center text-[#0b5ed7]">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-[#0b5ed7] text-white shadow-sm">
            <ShieldCheck className="size-9" />
          </div>
          <p className="mt-2 text-5xl font-bold tracking-tight">UniCall</p>
          <p className="mt-2 max-w-sm text-base text-slate-700">
            {tab === "login"
              ? "Đăng nhập tài khoản UniCall để kết nối nhanh và an toàn."
              : "Tạo tài khoản UniCall để bắt đầu nhắn tin và gọi điện."}
          </p>
        </div>

        <Card className="overflow-hidden border border-slate-200 bg-white shadow-xl py-0!">
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100">
            <Button
              type="button"
              variant="ghost"
              className={`h-14 rounded-none text-base font-semibold ${
                tab === "login"
                  ? "bg-white text-slate-900 shadow-[inset_0_-2px_0_0_#0ea5e9]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
              onClick={() => navigate(AUTH_PATH.LOGIN)}
            >
              Đăng nhập
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`h-14 rounded-none text-base font-semibold ${
                tab === "register"
                  ? "bg-white text-slate-900 shadow-[inset_0_-2px_0_0_#0ea5e9]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
              onClick={() => navigate(AUTH_PATH.REGISTER)}
            >
              Đăng ký
            </Button>
          </div>

          <CardContent className="px-8 py-7 sm:px-10">
            <div className="mb-6 text-center">
              <p className="text-lg font-semibold text-slate-900">{title}</p>
              <p className="mt-2 text-sm text-slate-500">
                {tab === "login"
                  ? "Phiên đăng nhập của bạn sẽ được bảo mật bằng cookie HttpOnly."
                  : "Thông tin sẽ được dùng để tạo hồ sơ tài khoản mới."}
              </p>
            </div>

            {tab === "login" ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-phone">Số điện thoại</Label>
                  <Input
                    id="login-phone"
                    type="tel"
                    placeholder="VD: 0987654321"
                    value={loginData.phoneNumber}
                    onChange={(event) => setLoginData({ ...loginData, phoneNumber: event.target.value })}
                    required
                    className="h-11 border-slate-300 focus-visible:ring-sky-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mật khẩu</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={loginData.password}
                    onChange={(event) => setLoginData({ ...loginData, password: event.target.value })}
                    required
                    className="h-11 border-slate-300 focus-visible:ring-sky-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="mt-2 h-11 w-full bg-sky-500 text-white hover:bg-sky-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <Label htmlFor="register-phone">Số điện thoại (username)</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="VD: 0987654321"
                    value={registerData.phoneNumber}
                    onChange={(event) => setRegisterData({ ...registerData, phoneNumber: event.target.value })}
                    required
                    className="h-11 border-slate-300 focus-visible:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-first-name">Tên</Label>
                    <Input
                      id="register-first-name"
                      placeholder="Viet Hoang"
                      value={registerData.firstName}
                      onChange={(event) => setRegisterData({ ...registerData, firstName: event.target.value })}
                      required
                      className="h-11 border-slate-300 focus-visible:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-last-name">Họ</Label>
                    <Input
                      id="register-last-name"
                      placeholder="Giap"
                      value={registerData.lastName}
                      onChange={(event) => setRegisterData({ ...registerData, lastName: event.target.value })}
                      required
                      className="h-11 border-slate-300 focus-visible:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-gender">Giới tính</Label>
                    <select
                      id="register-gender"
                      value={registerData.gender}
                      onChange={(event) =>
                        setRegisterData({
                          ...registerData,
                          gender: event.target.value as RegisterRequest["gender"],
                        })
                      }
                      className="h-11 w-full rounded-md border border-slate-300 bg-background px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    >
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-date-of-birth">Ngày sinh</Label>
                    <Input
                      id="register-date-of-birth"
                      type="date"
                      value={registerData.dateOfBirth}
                      onChange={(event) =>
                        setRegisterData({
                          ...registerData,
                          dateOfBirth: event.target.value,
                        })
                      }
                      required
                      className="h-11 border-slate-300 focus-visible:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={registerData.password}
                    onChange={(event) => setRegisterData({ ...registerData, password: event.target.value })}
                    required
                    minLength={6}
                    className="h-11 border-slate-300 focus-visible:ring-sky-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-2 h-11 w-full bg-sky-500 text-white hover:bg-sky-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xử lý..." : "Tạo tài khoản"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
