import type { AxiosError } from "axios"
import { useRef, useState } from "react"
import { AlertTriangle, KeyRound, Pencil, PencilLine, Save } from "lucide-react"
import { toast } from "sonner"

import { authService } from "@/services/auth/auth.service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useMutation } from "@/hooks/useMutation"
import { useQuery } from "@/hooks/useQuery"
import { userService } from "@/services/user/user.service"
import type { ResponseError } from "@/types/api-response"
import type { AccountDeletionStatus, UpdateMyProfileRequest, UserProfile } from "@/types/user.type"
import { formatDateVi } from "@/utils/date.util"
import { mapGenderToLabel } from "@/utils/gender.util"

type UserProfileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProfileChanged?: (profile: UserProfile) => void
}

const toFallback = (firstName: string, lastName: string) => {
  const a = firstName?.[0] ?? ""
  const b = lastName?.[0] ?? ""
  return `${a}${b}`.toUpperCase() || "U"
}

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  const axiosError = error as AxiosError<ResponseError>
  const message = axiosError.response?.data?.message?.trim()
  if (message === "Password is incorrect") {
    return "Mật khẩu không chính xác."
  }
  return message && message.length > 0 ? message : fallback
}

export function UserProfileDialog({ open, onOpenChange, onProfileChanged }: UserProfileDialogProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showDeletionPanel, setShowDeletionPanel] = useState(false)
  const [deletionStatus, setDeletionStatus] = useState<AccountDeletionStatus | null>(null)
  const [deletionReason, setDeletionReason] = useState("")
  const [deletionPassword, setDeletionPassword] = useState("")
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [formData, setFormData] = useState<UpdateMyProfileRequest>({
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
  })

  const { isLoading } = useQuery(
    async () => {
      const [profileResponse, deletionStatusResponse] = await Promise.all([
        userService.getMyProfile(),
        userService.getMyAccountDeletionStatus(),
      ])
      return {
        profile: profileResponse.data,
        deletionStatus: deletionStatusResponse.data,
      }
    },
    {
      enabled: open,
      deps: [open],
      onSuccess: ({ profile, deletionStatus }) => {
        setProfile(profile)
        setFormData({
          firstName: profile.firstName ?? "",
          lastName: profile.lastName ?? "",
          gender: profile.gender ?? "MALE",
          dateOfBirth: profile.dateOfBirth ?? "",
        })
        setDeletionStatus(deletionStatus)
      },
      onError: () => {
        toast.error("Không tải được thông tin cá nhân.")
      },
    },
  )

  const { mutate: updateProfile, isLoading: isSaving } = useMutation(
    async (payload: unknown) => {
      const response = await userService.updateMyProfile(payload as UpdateMyProfileRequest)
      return response.data
    },
    {
      onSuccess: (nextProfile) => {
        setProfile(nextProfile)
        onProfileChanged?.(nextProfile)
        setIsEditing(false)
        toast.success("Cập nhật thông tin thành công.")
      },
      onError: () => {
        toast.error("Cập nhật thông tin thất bại.")
      },
    },
  )

  const { mutate: uploadAvatar, isLoading: isUploadingAvatar } = useMutation(
    async (file: unknown) => {
      const response = await userService.updateMyAvatar(file as File)
      return response.data
    },
    {
      onSuccess: (nextProfile) => {
        setProfile(nextProfile)
        onProfileChanged?.(nextProfile)
        toast.success("Cập nhật ảnh đại diện thành công.")
      },
      onError: () => {
        toast.error("Cập nhật ảnh đại diện thất bại.")
      },
      onSettled: () => {
        if (fileRef.current) {
          fileRef.current.value = ""
        }
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
        setProfile((prev) =>
          prev
            ? { ...prev, allowFriendInvites: Boolean(response.allowFriendInvites) }
            : prev,
        )
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

  const handleSaveProfile = async () => {
    await updateProfile(formData)
  }

  const handleUploadAvatar = async (file?: File) => {
    if (!file) return
    await uploadAvatar(file)
  }

  const handleToggleFriendInvitePrivacy = async (nextValue: boolean) => {
    if (!profile || isUpdatingInvitePrivacy) {
      return
    }
    const previous = Boolean(profile.allowFriendInvites)
    setProfile((prev) => (prev ? { ...prev, allowFriendInvites: nextValue } : prev))
    try {
      await updateInvitePrivacy(nextValue)
    } catch {
      setProfile((prev) => (prev ? { ...prev, allowFriendInvites: previous } : prev))
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

  const handleCancelAccountDeletionRequest = async () => {
    await cancelAccountDeletion(undefined)
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
      <DialogContent className="max-h-[92vh] min-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="text-lg text-slate-900">Thông tin cá nhân</DialogTitle>

        </DialogHeader>

        {isLoading || !profile ? (
          <div className="py-6 text-center text-sm text-slate-500">Đang tải thông tin...</div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleUploadAvatar(event.target.files?.[0])}
              />
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={() => !isUploadingAvatar && fileRef.current?.click()}
                className="group relative rounded-full"
              >
                <Avatar className="h-28 w-28 ring-2 ring-slate-200">
                  <AvatarImage src={profile.avatar ?? undefined} alt="my-avatar" />
                  <AvatarFallback className="text-lg">{toFallback(profile.firstName, profile.lastName)}</AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/35">
                  <span className="rounded-full bg-white/95 p-2 text-slate-700 opacity-0 shadow-sm transition group-hover:opacity-100">
                    <Pencil className="h-4 w-4" />
                  </span>
                </span>
                {isUploadingAvatar ? (
                  <span className="absolute -right-1 -bottom-1 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">
                    Đang tải
                  </span>
                ) : null}
              </button>
            </div>

            <div className="flex justify-end pt-1">
              {isEditing ? (
                <Button
                  type="button"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={isSaving}
                  onClick={() => void handleSaveProfile()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Đang lưu..." : "Lưu"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading || !profile}
                  onClick={() => setIsEditing(true)}
                >
                  <PencilLine className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input value={profile.phoneNumber} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Tên</Label>
                <Input
                  value={isEditing ? formData.firstName : profile.firstName}
                  disabled={!isEditing}
                  onChange={(event) => setFormData((prev) => ({ ...prev, firstName: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Họ</Label>
                <Input
                  value={isEditing ? formData.lastName : profile.lastName}
                  disabled={!isEditing}
                  onChange={(event) => setFormData((prev) => ({ ...prev, lastName: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Giới tính</Label>
                {isEditing ? (
                  <select
                    value={formData.gender}
                    onChange={(event) => setFormData((prev) => ({ ...prev, gender: event.target.value }))}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                ) : (
                  <Input value={mapGenderToLabel(profile.gender)} disabled />
                )}
              </div>
              <div className="space-y-2">
                <Label>Ngày sinh</Label>
                {isEditing ? (
                  <CustomDatePicker
                    value={formData.dateOfBirth}
                    onChange={(value) => setFormData((prev) => ({ ...prev, dateOfBirth: value }))}
                    placeholder="Chọn ngày sinh"
                    triggerClassName="focus-visible:ring-blue-500"
                  />
                ) : (
                  <Input type="text" value={formatDateVi(profile.dateOfBirth)} disabled />
                )}
              </div>
            </div>



            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-slate-800">Cho phép người khác gửi lời mời kết bạn</p>
                  <p className="text-xs text-slate-500">
                    Tắt mục này để chặn toàn bộ yêu cầu kết bạn mới.
                  </p>
                </div>
                <Switch
                  checked={Boolean(profile.allowFriendInvites)}
                  onCheckedChange={(checked) => void handleToggleFriendInvitePrivacy(checked)}
                  disabled={isUpdatingInvitePrivacy}
                />
              </div>

              <div className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Yêu cầu xóa tài khoản</p>
                      {deletionStatus?.deletionPending ? (
                        <p className="text-xs text-amber-700">
                          Tài khoản sẽ bị xóa sau {deletionStatus.remainingDays} ngày.
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Hệ thống sẽ giữ yêu cầu trong 30 ngày trước khi xóa vĩnh viễn.
                        </p>
                      )}
                    </div>
                  </div>
                  {!deletionStatus?.deletionPending ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => setShowDeletionPanel((prev) => !prev)}
                    >
                      {showDeletionPanel ? "Đóng" : "Yêu cầu xóa"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                      disabled={isCancellingDeletion}
                      onClick={() => void handleCancelAccountDeletionRequest()}
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

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <KeyRound className="h-4 w-4" />
                  <span className="text-sm font-medium">Bảo mật tài khoản</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowChangePassword((prev) => !prev)}
                >
                  {showChangePassword ? "Đóng" : "Đổi mật khẩu"}
                </Button>
              </div>

              {showChangePassword ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                      }
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
