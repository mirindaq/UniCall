import { useEffect, useMemo, useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import { LogIn, UserPlus, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useLocation, useNavigate } from "react-router"

import { authService } from "@/services/auth/auth.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AUTH_PATH } from "@/constants/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RegisterRequest } from "@/types/auth"
import type { ResponseError } from "@/types/api-response"

type AuthTab = "login" | "register"

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<AuthTab>("login")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registerData, setRegisterData] = useState<RegisterRequest>({
    phoneNumber: "",
    fullName: "",
    gender: "MALE",
    dateOfBirth: "",
    password: "",
  })

  const title = useMemo(() => {
    return tab === "login" ? "Dang nhap UniCall" : "Dang ky tai khoan UniCall"
  }, [tab])

  const description = useMemo(() => {
    return tab === "login"
      ? "Dang nhap bang luong OAuth2 Authorization Code + PKCE qua identity-service (BFF)."
      : "Tao tai khoan moi, du lieu duoc dong bo vao Keycloak bang Admin API."
  }, [tab])

  useEffect(() => {
    if (location.pathname === AUTH_PATH.REGISTER) {
      setTab("register")
      return
    }
    setTab("login")
  }, [location.pathname])

  const extractMessage = (error: unknown) => {
    const axiosError = error as AxiosError<ResponseError>
    return axiosError.response?.data?.message ?? "Co loi xay ra, vui long thu lai."
  }

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await authService.register(registerData)
      toast.success(response.data.message || "Dang ky thanh cong")
      navigate(AUTH_PATH.LOGIN)
    } catch (error) {
      toast.error(extractMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_40%,#fef3c7_100%)] px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200/70 bg-white/65 p-8 shadow-lg backdrop-blur-sm">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-1 text-xs font-semibold tracking-wide text-sky-700 uppercase">
            <ShieldCheck className="size-4" />
            Keycloak BFF Auth
          </div>

          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">UniCall Identity</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600">
            Luong moi khong dung password grant. Frontend redirect sang Keycloak, identity-service exchange code,
            giu refresh token trong HttpOnly cookie.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-slate-700">
            <p>- Dang nhap Keycloak: username = so dien thoai.</p>
            <p>- Refresh token: HttpOnly Secure cookie.</p>
            <p>- Frontend chi dung access token ngan han.</p>
          </div>
        </section>

        <Card className="border-slate-200/80 bg-white/90 backdrop-blur">
          <CardHeader>
            <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-1">
              <Button
                type="button"
                variant={tab === "login" ? "default" : "ghost"}
                className="h-8 px-4"
                onClick={() => navigate(AUTH_PATH.LOGIN)}
              >
                <LogIn className="size-4" />
                Dang nhap
              </Button>
              <Button
                type="button"
                variant={tab === "register" ? "default" : "ghost"}
                className="h-8 px-4"
                onClick={() => navigate(AUTH_PATH.REGISTER)}
              >
                <UserPlus className="size-4" />
                Dang ky
              </Button>
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          <CardContent>
            {tab === "login" ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Bam nut ben duoi de bat dau dang nhap qua Keycloak. Ban se duoc redirect den trang SSO.
                </p>
                <Button type="button" className="w-full" onClick={authService.redirectToLogin}>
                  Dang nhap voi Keycloak
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <Label htmlFor="register-phone">So dien thoai (username)</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="VD: 0987654321"
                    value={registerData.phoneNumber}
                    onChange={(event) => setRegisterData({ ...registerData, phoneNumber: event.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-full-name">Ho va ten</Label>
                  <Input
                    id="register-full-name"
                    placeholder="Nguyen Van A"
                    value={registerData.fullName}
                    onChange={(event) => setRegisterData({ ...registerData, fullName: event.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-gender">Gioi tinh</Label>
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
                      <option value="FEMALE">Nu</option>
                      <option value="OTHER">Khac</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-date-of-birth">Ngay sinh</Label>
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
                    placeholder="Toi thieu 6 ky tu"
                    value={registerData.password}
                    onChange={(event) => setRegisterData({ ...registerData, password: event.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Dang xu ly..." : "Tao tai khoan"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
