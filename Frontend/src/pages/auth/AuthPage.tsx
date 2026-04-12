import { useEffect, useMemo, useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import type {
  ConfirmationResult,
  RecaptchaVerifier,
  UserCredential,
} from "firebase/auth"
import { signInWithPhoneNumber } from "firebase/auth"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useLocation, useNavigate } from "react-router"

import { authService } from "@/services/auth/auth.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createInvisibleRecaptcha,
  getFirebaseAuth,
  toFirebasePhoneNumber,
} from "@/services/auth/firebase-phone-auth.service"
import type { ResponseError } from "@/types/api-response"
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
} from "@/types/auth"

type AuthTab = "login" | "register"
type CountryOption = { code: string; label: string }

const PHONE_COUNTRY_OPTIONS: CountryOption[] = [
  { code: "+84", label: "VN (+84)" },
  { code: "+1", label: "US (+1)" },
  { code: "+81", label: "JP (+81)" },
  { code: "+82", label: "KR (+82)" },
]

const REGISTER_EMAIL_DOMAIN = "@gmail.com"
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

function normalizePhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 15)
}

function normalizeEmailLocalPart(value: string) {
  return value.replace(/\s/g, "").replace(/@.*/, "")
}

function toInternationalPhone(countryCode: string, localPhone: string) {
  const digits = normalizePhoneInput(localPhone)
  const normalizedLocal = digits.replace(/^0+/, "")
  if (!normalizedLocal) {
    return ""
  }
  return `${countryCode}${normalizedLocal}`
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

export function AuthPage() {
  const { setAuthenticated, clearAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [tab, setTab] = useState<AuthTab>("login")
  const [loginData, setLoginData] = useState<LoginRequest>({
    phoneNumber: "",
    password: "",
    firebaseIdToken: "",
  })
  const [resendEmail, setResendEmail] = useState("")
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isSubmittingForgotPassword, setIsSubmittingForgotPassword] =
    useState(false)
  const [forgotPasswordData, setForgotPasswordData] =
    useState<ForgotPasswordRequest>({
      phoneNumber: "",
      email: "",
    })
  const [registerData, setRegisterData] = useState<RegisterRequest>({
    phoneNumber: "",
    email: "",
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    password: "",
    firebaseIdToken: "",
  })
  const [confirmPassword, setConfirmPassword] = useState("")
  const [registerEmailLocalPart, setRegisterEmailLocalPart] = useState("")
  const [loginCountryCode, setLoginCountryCode] = useState("+84")
  const [registerCountryCode, setRegisterCountryCode] = useState("+84")
  const [loginLocalPhone, setLoginLocalPhone] = useState("")
  const [registerLocalPhone, setRegisterLocalPhone] = useState("")
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [otpPhoneNumber, setOtpPhoneNumber] = useState("")
  const [otpPurpose, setOtpPurpose] = useState<"register" | null>(null)
  const [hasAutoSentOtp, setHasAutoSentOtp] = useState(false)
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [pendingRegisterPayload, setPendingRegisterPayload] =
    useState<RegisterRequest | null>(null)
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [recaptchaVerifier, setRecaptchaVerifier] =
    useState<RecaptchaVerifier | null>(null)

  const title = useMemo(() => {
    return tab === "login" ? "Đăng nhập UniCall" : "Đăng ký tài khoản UniCall"
  }, [tab])

  const isOtpBusy = isSendingOtp || isVerifyingOtp

  const extractErrorMessage = (error: unknown, fallback: string) => {
    const axiosError = error as AxiosError<ResponseError>
    return axiosError?.response?.data?.message || fallback
  }

  const isEmailNotVerifiedError = (message: string) => {
    const normalized = message.toLowerCase()
    return (
      normalized.includes("not activated") ||
      normalized.includes("verify your email")
    )
  }

  useEffect(() => {
    if (location.pathname === AUTH_PATH.REGISTER) {
      setTab("register")
      return
    }
    setTab("login")
  }, [location.pathname])

  useEffect(() => {
    if (tab === "register") {
      setShowResendVerification(false)
      setShowForgotPassword(false)
    }
  }, [tab])

  useEffect(() => {
    if (!showForgotPassword) {
      return
    }

    setForgotPasswordData((prev) => ({
      ...prev,
      phoneNumber: loginData.phoneNumber.trim(),
    }))
  }, [showForgotPassword, loginData.phoneNumber])

  const resetOtpFlow = () => {
    setOtpCode("")
    setOtpPhoneNumber("")
    setOtpPurpose(null)
    setHasAutoSentOtp(false)
    setConfirmationResult(null)
    setPendingRegisterPayload(null)

    if (recaptchaVerifier) {
      recaptchaVerifier.clear()
      setRecaptchaVerifier(null)
    }
  }

  const ensureRecaptcha = () => {
    if (recaptchaVerifier) {
      return recaptchaVerifier
    }

    const verifier = createInvisibleRecaptcha(
      getFirebaseAuth(),
      "firebase-recaptcha-container"
    )
    setRecaptchaVerifier(verifier)
    return verifier
  }

  const openOtpDialog = (phoneNumber: string, payload: RegisterRequest) => {
    resetOtpFlow()
    setOtpPurpose("register")
    setOtpPhoneNumber(phoneNumber)
    setPendingRegisterPayload(payload)

    setShowOtpDialog(true)
    toast.info(`Vui lòng xác thực OTP gửi đến số ${phoneNumber}.`)
  }

  useEffect(() => {
    if (!showOtpDialog || otpPurpose !== "register" || hasAutoSentOtp) {
      return
    }

    const timer = window.setTimeout(() => {
      const recaptchaContainer = document.getElementById(
        "firebase-recaptcha-container"
      )

      if (!recaptchaContainer) {
        return
      }

      setHasAutoSentOtp(true)
      void handleSendOtp(otpPhoneNumber)
    }, 150)

    return () => window.clearTimeout(timer)
  }, [showOtpDialog, otpPurpose, hasAutoSentOtp, otpPhoneNumber])

  const handleSendOtp = async (phoneNumberOverride?: string) => {
    const targetPhoneNumber = (phoneNumberOverride ?? otpPhoneNumber).trim()

    if (!targetPhoneNumber) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ.")
      return
    }

    setIsSendingOtp(true)

    try {
      const appVerifier = ensureRecaptcha()
      const firebasePhoneNumber = toFirebasePhoneNumber(targetPhoneNumber)

      const result = await signInWithPhoneNumber(
        getFirebaseAuth(),
        firebasePhoneNumber,
        appVerifier
      )

      setOtpPhoneNumber(targetPhoneNumber)
      setConfirmationResult(result)
      toast.success("Đã gửi OTP qua SMS.")
    } catch (error) {
      const message = extractErrorMessage(error, "Gửi OTP thất bại.")
      toast.error(message)
    } finally {
      setIsSendingOtp(false)
    }
  }

  const doRegisterAfterOtp = async (
    firebaseIdToken: string,
    payload: RegisterRequest
  ) => {
    const response = await authService.register({
      ...payload,
      firebaseIdToken,
    })

    toast.success(response.message || "Đăng ký thành công.")
    setShowOtpDialog(false)
    resetOtpFlow()
    navigate(AUTH_PATH.LOGIN)
  }

  const handleVerifyOtp = async () => {
    if (!confirmationResult) {
      toast.error("Vui lòng gửi OTP trước.")
      return
    }

    if (!otpCode.trim()) {
      toast.error("Vui lòng nhập mã OTP.")
      return
    }

    if (!otpPurpose) {
      toast.error("Không xác định được luồng OTP.")
      return
    }

    setIsVerifyingOtp(true)

    try {
      let firebaseIdToken = ""

      try {
        const firebaseCredential: UserCredential =
          await confirmationResult.confirm(otpCode.trim())
        firebaseIdToken = await firebaseCredential.user.getIdToken()
      } catch (otpError) {
        const otpMessage = extractErrorMessage(
          otpError,
          "Mã OTP không hợp lệ hoặc đã hết hạn."
        )
        toast.error(otpMessage)
        return
      }

      try {
        if (otpPurpose === "register" && pendingRegisterPayload) {
          await doRegisterAfterOtp(firebaseIdToken, pendingRegisterPayload)
          return
        }

        toast.error("Dữ liệu OTP không hợp lệ.")
      } catch (authError) {
        clearAuthenticated()
        const authMessage = extractErrorMessage(
          authError,
          "Đăng nhập/đăng ký thất bại."
        )
        setShowResendVerification(false)
        toast.error(authMessage)
      }
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidVietnamPhoneForBackend(registerData.phoneNumber)) {
      toast.error("Số điện thoại không hợp lệ.")
      return
    }

    if (registerData.password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.")
      return
    }

    if (!registerData.email.trim()) {
      toast.error("Vui lòng nhập email.")
      return
    }

    if (!registerData.firstName.trim() || !registerData.lastName.trim()) {
      toast.error("Vui lòng nhập đầy đủ họ tên.")
      return
    }

    if (!registerData.dateOfBirth) {
      toast.error("Vui lòng chọn ngày sinh.")
      return
    }

    if (!STRONG_PASSWORD_REGEX.test(registerData.password)) {
      toast.error(
        "Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
      )
      return
    }

    const payload: RegisterRequest = {
      ...registerData,
      phoneNumber: toBackendVietnamPhone(registerData.phoneNumber),
      email: registerData.email.trim(),
      firebaseIdToken: "",
    }

    openOtpDialog(payload.phoneNumber, payload)
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidVietnamPhoneForBackend(loginData.phoneNumber)) {
      toast.error("Số điện thoại không hợp lệ.")
      return
    }

    if (!loginData.password.trim()) {
      toast.error("Vui lòng nhập mật khẩu.")
      return
    }

    clearAuthenticated()

    const payload: LoginRequest = {
      ...loginData,
      phoneNumber: toBackendVietnamPhone(loginData.phoneNumber),
      firebaseIdToken: "",
    }

    setIsSubmittingLogin(true)

    try {
      const response = await authService.login(payload)
      setAuthenticated()
      setShowResendVerification(false)
      toast.success(response.message || "Đăng nhập thành công")
      navigate(AUTH_PATH.HOME)
    } catch (error) {
      clearAuthenticated()
      const message = extractErrorMessage(error, "Đăng nhập thất bại.")

      if (isEmailNotVerifiedError(message)) {
        setShowResendVerification(true)
        toast.error(
          "Tài khoản chưa kích hoạt. Vui lòng xác nhận email trước khi đăng nhập."
        )
      } else {
        setShowResendVerification(false)
        toast.error(message)
      }
    } finally {
      setIsSubmittingLogin(false)
    }
  }

  const handleResendVerificationEmail = async () => {
    if (!loginData.phoneNumber.trim()) {
      toast.error("Vui lòng nhập số điện thoại tài khoản trước.")
      return
    }

    if (!resendEmail.trim()) {
      toast.error("Vui lòng nhập email để gửi lại xác thực.")
      return
    }

    setIsResendingVerification(true)

    try {
      const response = await authService.resendVerificationEmail({
        phoneNumber: loginData.phoneNumber.trim(),
        email: resendEmail.trim(),
      })

      toast.success(response.message || "Đã gửi lại email xác thực.")
    } catch (error) {
      toast.error(
        extractErrorMessage(error, "Không thể gửi lại email xác thực.")
      )
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotPasswordData.phoneNumber.trim()) {
      toast.error("Vui lòng nhập số điện thoại tài khoản.")
      return
    }

    if (!forgotPasswordData.email.trim()) {
      toast.error("Vui lòng nhập email đã đăng ký.")
      return
    }

    setIsSubmittingForgotPassword(true)

    try {
      const response = await authService.forgotPassword({
        phoneNumber: forgotPasswordData.phoneNumber.trim(),
        email: forgotPasswordData.email.trim(),
      })

      toast.success(response.message || "Đã gửi email đặt lại mật khẩu.")
      setShowForgotPassword(false)
      setForgotPasswordData((prev) => ({ ...prev, email: "" }))
    } catch (error) {
      toast.error(
        extractErrorMessage(error, "Không thể gửi email đặt lại mật khẩu.")
      )
    } finally {
      setIsSubmittingForgotPassword(false)
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

        <Card className="overflow-hidden border border-slate-200 bg-white py-0! shadow-xl">
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
                  <Label htmlFor="login-phone-local">Số điện thoại</Label>

                  <div className="flex gap-2">
                    <select
                      aria-label="Mã vùng đăng nhập"
                      value={loginCountryCode}
                      onChange={(event) => {
                        const nextCode = event.target.value
                        setLoginCountryCode(nextCode)
                        setLoginData((prev) => ({
                          ...prev,
                          phoneNumber: toInternationalPhone(
                            nextCode,
                            loginLocalPhone
                          ),
                        }))
                      }}
                      className="h-11 w-[120px] rounded-md border border-slate-300 bg-white px-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      {PHONE_COUNTRY_OPTIONS.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <Input
                      id="login-phone-local"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Nhập số điện thoại"
                      value={loginLocalPhone}
                      onChange={(event) => {
                        const localPhone = normalizePhoneInput(
                          event.target.value
                        )
                        setLoginLocalPhone(localPhone)
                        setLoginData((prev) => ({
                          ...prev,
                          phoneNumber: toInternationalPhone(
                            loginCountryCode,
                            localPhone
                          ),
                        }))
                      }}
                      required
                      className="h-11 flex-1 border-slate-300 focus-visible:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Mật khẩu</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={loginData.password}
                    onChange={(event) =>
                      setLoginData({
                        ...loginData,
                        password: event.target.value,
                      })
                    }
                    required
                    className="h-11 border-slate-300 focus-visible:ring-sky-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-2 h-11 w-full bg-sky-500 text-white hover:bg-sky-600"
                  disabled={isSubmittingLogin}
                >
                  {isSubmittingLogin ? "Dang dang nhap..." : "Đăng nhập"}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="w-full text-center text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  Quên mật khẩu?
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <Label htmlFor="register-phone-local">
                    Số điện thoại (username)
                  </Label>

                  <div className="flex gap-2">
                    <select
                      aria-label="Mã vùng đăng ký"
                      value={registerCountryCode}
                      onChange={(event) => {
                        const nextCode = event.target.value
                        setRegisterCountryCode(nextCode)
                        setRegisterData((prev) => ({
                          ...prev,
                          phoneNumber: toInternationalPhone(
                            nextCode,
                            registerLocalPhone
                          ),
                        }))
                      }}
                      className="h-11 w-[120px] rounded-md border border-slate-300 bg-white px-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      {PHONE_COUNTRY_OPTIONS.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <Input
                      id="register-phone-local"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Nhập số điện thoại"
                      value={registerLocalPhone}
                      onChange={(event) => {
                        const localPhone = normalizePhoneInput(
                          event.target.value
                        )
                        setRegisterLocalPhone(localPhone)
                        setRegisterData((prev) => ({
                          ...prev,
                          phoneNumber: toInternationalPhone(
                            registerCountryCode,
                            localPhone
                          ),
                        }))
                      }}
                      required
                      className="h-11 flex-1 border-slate-300 focus-visible:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>

                  <div className="flex gap-2">
                    <Input
                      id="register-email"
                      type="text"
                      placeholder="Nhập tên email"
                      value={registerEmailLocalPart}
                      onChange={(event) => {
                        const localPart = normalizeEmailLocalPart(
                          event.target.value
                        )
                        setRegisterEmailLocalPart(localPart)
                        setRegisterData((prev) => ({
                          ...prev,
                          email: localPart
                            ? `${localPart}${REGISTER_EMAIL_DOMAIN}`
                            : "",
                        }))
                      }}
                      required
                      className="h-11 flex-1 border-slate-300 focus-visible:ring-sky-500"
                    />

                    <Input
                      type="text"
                      value={REGISTER_EMAIL_DOMAIN}
                      readOnly
                      tabIndex={-1}
                      className="h-11 w-[150px] border-slate-300 bg-slate-100 text-slate-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="register-first-name">Tên</Label>
                    <Input
                      id="register-first-name"
                      placeholder="Viet Hoang"
                      value={registerData.firstName}
                      onChange={(event) =>
                        setRegisterData({
                          ...registerData,
                          firstName: event.target.value,
                        })
                      }
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
                      onChange={(event) =>
                        setRegisterData({
                          ...registerData,
                          lastName: event.target.value,
                        })
                      }
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
                          gender: event.target
                            .value as RegisterRequest["gender"],
                        })
                      }
                      className="h-11 w-full rounded-md border border-slate-300 bg-background px-2.5 py-1 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                  <Label htmlFor="register-password">Mật khẩu</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Toi thieu 8 ky tu: hoa, thuong, so, ky tu dac biet"
                    value={registerData.password}
                    onChange={(event) =>
                      setRegisterData({
                        ...registerData,
                        password: event.target.value,
                      })
                    }
                    required
                    minLength={8}
                    className="h-11 border-slate-300 focus-visible:ring-sky-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">
                    Xác nhận mật khẩu
                  </Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    className="h-11 border-slate-300 focus-visible:ring-sky-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-2 h-11 w-full bg-sky-500 text-white hover:bg-sky-600"
                  disabled={isOtpBusy}
                >
                  {isOtpBusy ? "Đang xử lý..." : "Tạo tài khoản"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showOtpDialog}
        onOpenChange={(open) => {
          setShowOtpDialog(open)
          if (!open) {
            resetOtpFlow()
          }
        }}
      >
        <DialogContent className="max-w-md rounded-xl border border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-900">
              Xác thực OTP số điện thoại
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Vui lòng xác thực mã OTP gửi qua số{" "}
              <strong>{otpPhoneNumber || "*****"}</strong>.
            </p>

            <Input
              type="text"
              placeholder="Nhập mã OTP"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              className="h-10 border-slate-300 bg-white focus-visible:ring-sky-500"
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowOtpDialog(false)
                  resetOtpFlow()
                }}
              >
                Hủy
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSendOtp()}
                disabled={isSendingOtp}
              >
                {isSendingOtp ? "Dang gui OTP..." : "Gửi lại OTP"}
              </Button>

              <Button
                type="button"
                onClick={() => void handleVerifyOtp()}
                disabled={
                  isVerifyingOtp || !confirmationResult || !otpCode.trim()
                }
                className="bg-sky-500 text-white hover:bg-sky-600"
              >
                {isVerifyingOtp ? "Đang xác thực..." : "Xác thực"}
              </Button>
            </div>
          </div>

          <div id="firebase-recaptcha-container" />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showResendVerification}
        onOpenChange={setShowResendVerification}
      >
        <DialogContent className="max-w-md rounded-xl border border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-900">
              Xác thực email tài khoản
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Tài khoản chưa xác thực email. Vui lòng nhập đúng email đã đăng ký
              để gửi lại link kích hoạt.
            </p>

            <Input
              type="email"
              placeholder="Nhập email đã đăng ký"
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              className="h-10 border-slate-300 bg-white focus-visible:ring-sky-500"
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResendVerification(false)}
              >
                Đóng
              </Button>

              <Button
                type="button"
                onClick={() => void handleResendVerificationEmail()}
                disabled={isResendingVerification}
                className="bg-sky-500 text-white hover:bg-sky-600"
              >
                {isResendingVerification ? "Đang gửi..." : "Gửi lại email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="max-w-md rounded-xl border border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-900">
              Quên mật khẩu
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Nhập số điện thoại và email đã đăng ký. UniCall sẽ gửi email để
              bạn đặt lại mật khẩu.
            </p>

            <Input
              type="tel"
              placeholder="Số điện thoại"
              value={forgotPasswordData.phoneNumber}
              onChange={(event) =>
                setForgotPasswordData((prev) => ({
                  ...prev,
                  phoneNumber: event.target.value,
                }))
              }
              className="h-10 border-slate-300 bg-white focus-visible:ring-sky-500"
            />

            <Input
              type="email"
              placeholder="Email đã đăng ký"
              value={forgotPasswordData.email}
              onChange={(event) =>
                setForgotPasswordData((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              className="h-10 border-slate-300 bg-white focus-visible:ring-sky-500"
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
              >
                Đóng
              </Button>

              <Button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={isSubmittingForgotPassword}
                className="bg-sky-500 text-white hover:bg-sky-600"
              >
                {isSubmittingForgotPassword ? "Đang gửi..." : "Gửi email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
