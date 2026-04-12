import type { AxiosError } from "axios"
import { AlertTriangle, KeyRound, Shield, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useMutation } from "@/hooks/useMutation"
import { useQuery } from "@/hooks/useQuery"
import { authService } from "@/services/auth/auth.service"
import { userService } from "@/services/user/user.service"
import type { ResponseError } from "@/types/api-response"
import type { AccountDeletionStatus, FriendInvitePrivacy, PhoneSearchPrivacy, UserProfile } from "@/types/user.type"

type UserSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab = "privacy" | "security"

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<ResponseError>
  const message = axiosError.response?.data?.message?.trim()
  if (message === "Password is incorrect") {
    return "Mật khẩu không chính xác."
  }
  return message && message.length > 0 ? message : fallback
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("privacy")
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [deletionStatus, setDeletionStatus] = useState<AccountDeletionStatus | null>(null)
  const [friendInvitePrivacy, setFriendInvitePrivacy] = useState<FriendInvitePrivacy | null>(null)
  const [phoneSearchPrivacy, setPhoneSearchPrivacy] = useState<PhoneSearchPrivacy | null>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showDeletionPanel, setShowDeletionPanel] = useState(false)
  const [deletionReason, setDeletionReason] = useState("")
  const [deletionPassword, setDeletionPassword] = useState("")
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const { isLoading } = useQuery(
    async () => {
      const [profileResponse, deletionStatusResponse, friendInvitePrivacyResponse, phoneSearchPrivacyResponse] = await Promise.all([
        userService.getMyProfile(),
        userService.getMyAccountDeletionStatus(),
        userService.getMyFriendInvitePrivacy(),
        userService.getMyPhoneSearchPrivacy(),
      ])
      return {
        profile: profileResponse.data,
        deletionStatus: deletionStatusResponse.data,
        friendInvitePrivacy: friendInvitePrivacyResponse.data,
        phoneSearchPrivacy: phoneSearchPrivacyResponse.data,
      }
    },
    {
      enabled: open,
      deps: [open],
      onSuccess: ({ profile, deletionStatus, friendInvitePrivacy, phoneSearchPrivacy }) => {
        setProfile(profile)
        setDeletionStatus(deletionStatus)
        setFriendInvitePrivacy(friendInvitePrivacy)
        setPhoneSearchPrivacy(phoneSearchPrivacy)
      },
      onError: () => {
        toast.error("Không tải được dữ liệu cài đặt.")
      },
    },
  )

  const { mutate: updateInvitePrivacy, isLoading: isUpdatingInvitePrivacy } = useMutation(
    async (allowFriendInvites: unknown) => {
      const response = await userService.updateMyFriendInvitePrivacy(Boolean(allowFriendInvites))
      return response.data
    },
    {
      onSuccess: (response) => {
        setFriendInvitePrivacy(response)
        toast.success(
          response.allowFriendInvites
            ? "Đã bật nhận lời mời kết bạn."
            : "Đã tắt nhận lời mời kết bạn.",
        )
      },
      onError: () => {
        toast.error("Cập nhật quyền nhận lời mời kết bạn thất bại.")
      },
    },
  )

  const { mutate: updatePhoneSearchPrivacy, isLoading: isUpdatingPhoneSearchPrivacy } = useMutation(
    async (allowPhoneSearch: unknown) => {
      const response = await userService.updateMyPhoneSearchPrivacy(Boolean(allowPhoneSearch))
      return response.data
    },
    {
      onSuccess: (response) => {
        setPhoneSearchPrivacy(response)
        toast.success(
          response.allowPhoneSearch
            ? "Đã bật tìm kiếm theo số điện thoại."
            : "Đã tắt tìm kiếm theo số điện thoại.",
        )
      },
      onError: () => {
        toast.error("Cập nhật quyền tìm kiếm số điện thoại thất bại.")
      },
    },
  )

  const { mutate: requestAccountDeletion, isLoading: isRequestingDeletion } = useMutation(
    async (payload: unknown) => {
      const response = await userService.requestMyAccountDeletion(
        payload as {
          phoneNumber: string
          reason: string
          password: string
        },
      )
      return response.data
    },
    {
      onSuccess: (response) => {
        setDeletionStatus(response)
        setDeletionPassword("")
        setShowDeletionPanel(false)
        toast.success("Đã gửi yêu cầu xóa tài khoản.")
      },
      onError: (error) => {
        toast.error(extractApiErrorMessage(error, "Gửi yêu cầu xóa tài khoản thất bại."))
      },
    },
  )

  const { mutate: cancelAccountDeletion, isLoading: isCancellingDeletion } = useMutation(
    async () => {
      const response = await userService.cancelMyAccountDeletionRequest()
      return response.data
    },
    {
      onSuccess: (response) => {
        setDeletionStatus(response)
        toast.success("Đã hủy yêu cầu xóa tài khoản.")
      },
      onError: () => {
        toast.error("Hủy yêu cầu xóa tài khoản thất bại.")
      },
    },
  )

  const { mutate: changePassword, isLoading: isChangingPassword } = useMutation(
    async (payload: unknown) => {
      const response = await authService.changePassword(
        payload as {
          phoneNumber: string
          currentPassword: string
          newPassword: string
        },
      )
      return response.message
    },
    {
      onSuccess: (message) => {
        toast.success(message || "Đổi mật khẩu thành công.")
        setShowChangePassword(false)
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      },
      onError: () => {
        toast.error("Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.")
      },
    },
  )

  const handleToggleFriendInvitePrivacy = async (nextValue: boolean) => {
    if (!friendInvitePrivacy || isUpdatingInvitePrivacy) {
      return
    }
    const previous = Boolean(friendInvitePrivacy.allowFriendInvites)
    setFriendInvitePrivacy((prev) => (prev ? { ...prev, allowFriendInvites: nextValue } : prev))
    try {
      await updateInvitePrivacy(nextValue)
    } catch {
      setFriendInvitePrivacy((prev) => (prev ? { ...prev, allowFriendInvites: previous } : prev))
    }
  }

  const handleTogglePhoneSearchPrivacy = async (nextValue: boolean) => {
    if (!phoneSearchPrivacy || isUpdatingPhoneSearchPrivacy) {
      return
    }
    const previous = Boolean(phoneSearchPrivacy.allowPhoneSearch)
    setPhoneSearchPrivacy((prev) => (prev ? { ...prev, allowPhoneSearch: nextValue } : prev))
    try {
      await updatePhoneSearchPrivacy(nextValue)
    } catch {
      setPhoneSearchPrivacy((prev) => (prev ? { ...prev, allowPhoneSearch: previous } : prev))
    }
  }

  const handleRequestAccountDeletion = async () => {
    if (!profile?.phoneNumber) {
      toast.error("Không xác định được số điện thoại của tài khoản.")
      return
    }
    if (!deletionReason.trim()) {
      toast.error("Vui lòng nhập lý do xóa tài khoản.")
      return
    }
    if (!deletionPassword.trim()) {
      toast.error("Vui lòng nhập mật khẩu để xác nhận.")
      return
    }
    await requestAccountDeletion({
      phoneNumber: profile.phoneNumber,
      reason: deletionReason.trim(),
      password: deletionPassword,
    })
  }

  const handleChangePassword = async () => {
    if (!profile?.phoneNumber) {
      toast.error("Không xác định được tài khoản hiện tại.")
      return
    }
    if (!passwordForm.currentPassword.trim()) {
      toast.error("Vui lòng nhập mật khẩu hiện tại.")
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự.")
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Xác nhận mật khẩu mới không khớp.")
      return
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error("Mật khẩu mới phải khác mật khẩu hiện tại.")
      return
    }

    await changePassword({
      phoneNumber: profile.phoneNumber,
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] min-w-[920px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle className="text-lg text-slate-900">Cài đặt</DialogTitle>
        </DialogHeader>

        {isLoading || !profile ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">Đang tải dữ liệu cài đặt...</div>
        ) : (
          <div className="grid h-[72vh] grid-cols-[220px_1fr]">
            <aside className="border-r border-slate-200 bg-slate-50 p-3">
              <button
                type="button"
                className={`mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  activeTab === "privacy"
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setActiveTab("privacy")}
              >
                <Shield className="h-4 w-4" />
                Quyền riêng tư
              </button>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  activeTab === "security"
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setActiveTab("security")}
              >
                <ShieldCheck className="h-4 w-4" />
                Tài khoản và bảo mật
              </button>
            </aside>

            <section className="overflow-y-auto bg-slate-50 p-5">
              {activeTab === "privacy" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Cho phép người khác gửi lời mời kết bạn</p>
                        <p className="text-xs text-slate-500">Tắt mục này để chặn toàn bộ yêu cầu kết bạn mới.</p>
                      </div>
                      <Switch
                        checked={Boolean(friendInvitePrivacy?.allowFriendInvites)}
                        onCheckedChange={(checked) => void handleToggleFriendInvitePrivacy(checked)}
                        disabled={isUpdatingInvitePrivacy}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Cho phép tìm bằng số điện thoại</p>
                        <p className="text-xs text-slate-500">Tắt mục này để người lạ không tìm thấy bạn qua số điện thoại.</p>
                      </div>
                      <Switch
                        checked={Boolean(phoneSearchPrivacy?.allowPhoneSearch)}
                        onCheckedChange={(checked) => void handleTogglePhoneSearchPrivacy(checked)}
                        disabled={isUpdatingPhoneSearchPrivacy}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-800">
                        <KeyRound className="h-4 w-4" />
                        <span className="text-sm font-medium">Đổi mật khẩu</span>
                      </div>
                      {!showChangePassword ? (
                        <Button type="button" variant="outline" onClick={() => setShowChangePassword(true)}>
                          Đổi mật khẩu
                        </Button>
                      ) : null}
                    </div>

                    {showChangePassword ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Mật khẩu hiện tại</Label>
                          <Input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mật khẩu mới</Label>
                          <Input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Xác nhận mật khẩu mới</Label>
                          <Input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                            }
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="mr-2"
                            disabled={isChangingPassword}
                            onClick={() => {
                              setShowChangePassword(false)
                              setPasswordForm({
                                currentPassword: "",
                                newPassword: "",
                                confirmPassword: "",
                              })
                            }}
                          >
                            Hủy
                          </Button>
                          <Button
                            type="button"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            disabled={isChangingPassword}
                            onClick={() => void handleChangePassword()}
                          >
                            {isChangingPassword ? "Đang đổi..." : "Cập nhật mật khẩu"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">Yêu cầu xóa tài khoản</p>
                          {deletionStatus?.deletionPending ? (
                            <p className="text-xs text-amber-700">Tài khoản sẽ bị xóa sau {deletionStatus.remainingDays} ngày.</p>
                          ) : (
                            <p className="text-xs text-slate-500">Hệ thống sẽ giữ yêu cầu trong 30 ngày trước khi xóa vĩnh viễn.</p>
                          )}
                        </div>
                      </div>
                      {!deletionStatus?.deletionPending ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => setShowDeletionPanel(true)}
                        >
                          Yêu cầu xóa
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-300 text-slate-700 hover:bg-slate-100"
                          disabled={isCancellingDeletion}
                          onClick={() => void cancelAccountDeletion(undefined)}
                        >
                          {isCancellingDeletion ? "Đang hủy..." : "Hủy yêu cầu"}
                        </Button>
                      )}
                    </div>

                    {deletionStatus?.deletionPending ? (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <p>Đã chờ: {deletionStatus.pendingDays} ngày</p>
                        <p>Còn lại: {deletionStatus.remainingDays} ngày</p>
                        {deletionStatus.deletionReason ? <p>Lý do: {deletionStatus.deletionReason}</p> : null}
                      </div>
                    ) : null}

                    {showDeletionPanel && !deletionStatus?.deletionPending ? (
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1">
                          <Label>Lý do xóa tài khoản</Label>
                          <Input
                            value={deletionReason}
                            onChange={(event) => setDeletionReason(event.target.value)}
                            placeholder="Nhập lý do..."
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Mật khẩu xác nhận</Label>
                          <Input
                            type="password"
                            value={deletionPassword}
                            onChange={(event) => setDeletionPassword(event.target.value)}
                            placeholder="Nhập mật khẩu hiện tại"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="mr-2"
                            disabled={isRequestingDeletion}
                            onClick={() => setShowDeletionPanel(false)}
                          >
                            Hủy
                          </Button>
                          <Button
                            type="button"
                            className="bg-red-600 text-white hover:bg-red-700"
                            disabled={isRequestingDeletion}
                            onClick={() => void handleRequestAccountDeletion()}
                          >
                            {isRequestingDeletion ? "Đang gửi..." : "Xác nhận yêu cầu xóa"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
