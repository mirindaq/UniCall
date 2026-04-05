import { useEffect, useRef, useState } from "react"
import { Pencil, PencilLine, Save } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userService } from "@/services/user/user.service"
import type { UpdateMyProfileRequest, UserProfile } from "@/types/user.type"
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

export function UserProfileDialog({ open, onOpenChange, onProfileChanged }: UserProfileDialogProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [formData, setFormData] = useState<UpdateMyProfileRequest>({
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
  })

  useEffect(() => {
    if (!open) {
      return
    }
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await userService.getMyProfile()
        if (!mounted) return
        setProfile(response.data)
        setFormData({
          firstName: response.data.firstName ?? "",
          lastName: response.data.lastName ?? "",
          gender: response.data.gender ?? "MALE",
          dateOfBirth: response.data.dateOfBirth ?? "",
        })
      } catch {
        toast.error("Không tải được thông tin cá nhân.")
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [open])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const response = await userService.updateMyProfile(formData)
      setProfile(response.data)
      onProfileChanged?.(response.data)
      setIsEditing(false)
      toast.success("Cập nhật thông tin thành công.")
    } catch {
      toast.error("Cập nhật thông tin thất bại.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadAvatar = async (file?: File) => {
    if (!file) return
    setIsUploadingAvatar(true)
    try {
      const response = await userService.updateMyAvatar(file)
      setProfile(response.data)
      onProfileChanged?.(response.data)
      toast.success("Cập nhật ảnh đại diện thành công.")
    } catch {
      toast.error("Cập nhật ảnh đại diện thất bại.")
    } finally {
      setIsUploadingAvatar(false)
      if (fileRef.current) {
        fileRef.current.value = ""
      }
    }
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
            <div className="flex justify-center mb-10">
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
                <Input
                  type={isEditing ? "date" : "text"}
                  value={isEditing ? formData.dateOfBirth : formatDateVi(profile.dateOfBirth)}
                  disabled={!isEditing}
                  onChange={(event) => setFormData((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
                />
              </div>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
