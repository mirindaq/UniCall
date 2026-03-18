import { useEffect, useMemo, useState, type FormEvent } from "react"
import { LogIn, UserPlus, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useLocation, useNavigate } from "react-router"

import { authService } from "@/services/auth/auth.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AUTH_PATH } from "@/constants/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authTokenStore } from "@/stores/auth-token.store"
import type { LoginRequest, RegisterRequest } from "@/types/auth"

type AuthTab = "login" | "register"

export function AuthPage() {
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
      const accessToken = response.data.accessToken
      if (!accessToken) {
        throw new Error("Missing access token")
      }
      authTokenStore.set(accessToken)
      toast.success(response.message || "Đăng nhập thành công")
      navigate(AUTH_PATH.HOME)
    } catch {
      authTokenStore.clear()
      toast.error("Đăng nhập thất bại, vui lòng kiểm tra số điện thoại và mật khẩu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#e0f2fe_0%,#f8fafc_48%,#dbeafe_100%)] px-4 py-8">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl" />

      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2 text-sky-700">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
            <ShieldCheck className="size-9" />
          </div>
          <p className="text-3xl font-semibold tracking-tight">UniCall</p>
        </div>

        <Card className="border-sky-100 bg-white/95 shadow-xl shadow-sky-200/40 backdrop-blur">
          <CardHeader>
            <div className="mb-2 inline-flex rounded-lg bg-sky-50 p-1">
              <Button
                type="button"
                variant={tab === "login" ? "default" : "ghost"}
                className="h-8 px-4 data-[state=active]:bg-sky-600"
                onClick={() => navigate(AUTH_PATH.LOGIN)}
              >
                <LogIn className="size-4" />
                Đăng nhập
              </Button>
              <Button
                type="button"
                variant={tab === "register" ? "default" : "ghost"}
                className="h-8 px-4 data-[state=active]:bg-sky-600"
                onClick={() => navigate(AUTH_PATH.REGISTER)}
              >
                <UserPlus className="size-4" />
                Đăng ký
              </Button>
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {tab === "login"
                ? "Đăng nhập qua hệ thống xác thực tập trung."
                : "Tạo tài khoản mới để bắt đầu sử dụng UniCall."}
            </CardDescription>
          </CardHeader>

          <CardContent>
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
                  />
                </div>
                <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={isSubmitting}>
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
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm"
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
                  />
                </div>

                <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={isSubmitting}>
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
