import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useChatPage } from "@/contexts/ChatPageContext"
import { chatService } from "@/services/chat/chat.service"
import { userService } from "@/services/user/user.service"
import type { GroupManagementSettings, PendingMemberRequestInfo } from "@/types/chat"
import type { UserProfile } from "@/types/user.type"

type GroupManagePanelProps = {
  conversationId: string
  onBack: () => void
}

type MemberProfileMap = Record<string, UserProfile>

const DEFAULT_SETTINGS: GroupManagementSettings = {
  allowMemberSendMessage: true,
  allowMemberPinMessage: true,
  allowMemberChangeAvatar: true,
  memberApprovalEnabled: false,
}

export default function GroupManagePanel({ conversationId, onBack }: GroupManagePanelProps) {
  const { refetchConversations } = useChatPage()
  const [settingsDraft, setSettingsDraft] = useState<GroupManagementSettings>(DEFAULT_SETTINGS)
  const [pendingRequests, setPendingRequests] = useState<PendingMemberRequestInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
  const [profileMap, setProfileMap] = useState<MemberProfileMap>({})

  const loadDetails = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await chatService.getGroupConversationDetails(conversationId)
      setSettingsDraft(response.data.groupManagementSettings ?? DEFAULT_SETTINGS)
      setPendingRequests(response.data.pendingMemberRequests ?? [])
    } catch {
      toast.error("Không tải được dữ liệu quản lý nhóm.")
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    void loadDetails()
  }, [loadDetails])

  useEffect(() => {
    const ids = Array.from(
      new Set(
        pendingRequests.flatMap((request) => [request.requesterIdentityUserId, request.targetIdentityUserId]).filter(Boolean),
      ),
    )

    if (ids.length === 0) {
      setProfileMap({})
      return
    }

    let cancelled = false
    void Promise.all(
      ids.map(async (id) => {
        try {
          const response = await userService.getProfileByIdentityUserId(id)
          return [id, response.data] as const
        } catch {
          return null
        }
      }),
    ).then((items) => {
      if (cancelled) {
        return
      }
      const next: MemberProfileMap = {}
      for (const item of items) {
        if (!item) {
          continue
        }
        next[item[0]] = item[1]
      }
      setProfileMap(next)
    })

    return () => {
      cancelled = true
    }
  }, [pendingRequests])

  const pendingRequestDisplay = useMemo(
    () =>
      pendingRequests.map((item) => {
        const requesterProfile = profileMap[item.requesterIdentityUserId]
        const targetProfile = profileMap[item.targetIdentityUserId]
        return {
          ...item,
          requesterName: displayName(requesterProfile, item.requesterIdentityUserId),
          targetName: displayName(targetProfile, item.targetIdentityUserId),
          targetAvatar: targetProfile?.avatar ?? undefined,
          targetFallback: toFallback(displayName(targetProfile, item.targetIdentityUserId)),
        }
      }),
    [pendingRequests, profileMap],
  )

  const updateSetting = (key: keyof GroupManagementSettings, value: boolean) => {
    setSettingsDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    if (isSaving) {
      return
    }
    setIsSaving(true)
    try {
      const response = await chatService.updateGroupManagementSettings(conversationId, settingsDraft)
      setSettingsDraft(response.data.groupManagementSettings ?? settingsDraft)
      toast.success("Đã cập nhật quản lý nhóm.")
      await refetchConversations()
    } catch {
      toast.error("Cập nhật quản lý nhóm thất bại.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    if (processingRequestId) {
      return
    }
    setProcessingRequestId(requestId)
    try {
      const response = await chatService.approveGroupMemberRequest(conversationId, requestId)
      setPendingRequests(response.data.pendingMemberRequests ?? [])
      toast.success("Đã duyệt thành viên.")
      await refetchConversations()
    } catch {
      toast.error("Duyệt thành viên thất bại.")
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (processingRequestId) {
      return
    }
    setProcessingRequestId(requestId)
    try {
      const response = await chatService.rejectGroupMemberRequest(conversationId, requestId)
      setPendingRequests(response.data.pendingMemberRequests ?? [])
      toast.success("Đã từ chối yêu cầu.")
      await refetchConversations()
    } catch {
      toast.error("Từ chối yêu cầu thất bại.")
    } finally {
      setProcessingRequestId(null)
    }
  }

  return (
    <div className="flex h-full w-full max-w-[340px] shrink-0 flex-col overflow-hidden border-l bg-background">
      <div className="flex shrink-0 items-center border-b px-4 py-4">
        <Button variant="ghost" size="icon-sm" className="mr-2" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-base font-semibold text-foreground">Quản lý nhóm</h2>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-4 py-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">Cho phép thành viên trong nhóm:</p>
            <div className="mt-3 space-y-3">
              <SettingSwitch
                label="Gửi tin nhắn"
                checked={settingsDraft.allowMemberSendMessage}
                onCheckedChange={(value) => updateSetting("allowMemberSendMessage", value)}
              />
              <SettingSwitch
                label="Ghim tin nhắn"
                checked={settingsDraft.allowMemberPinMessage}
                onCheckedChange={(value) => updateSetting("allowMemberPinMessage", value)}
              />
              <SettingSwitch
                label="Thay đổi ảnh đại diện nhóm"
                checked={settingsDraft.allowMemberChangeAvatar}
                onCheckedChange={(value) => updateSetting("allowMemberChangeAvatar", value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <SettingSwitch
              label="Chế độ phê duyệt thành viên mới"
              checked={settingsDraft.memberApprovalEnabled}
              onCheckedChange={(value) => updateSetting("memberApprovalEnabled", value)}
              description="Bật để trưởng/phó nhóm duyệt yêu cầu thêm thành viên."
            />
          </div>

          <Button className="w-full" disabled={isSaving || isLoading} onClick={() => void handleSaveSettings()}>
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </span>
            ) : (
              "Lưu thay đổi"
            )}
          </Button>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Yêu cầu chờ duyệt</h3>
              <span className="text-xs text-slate-500">{pendingRequestDisplay.length}</span>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-500">Đang tải...</p>
            ) : pendingRequestDisplay.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
                Chưa có yêu cầu chờ duyệt
              </p>
            ) : (
              pendingRequestDisplay.map((request) => (
                <div key={request.idRequest} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={request.targetAvatar} alt={request.targetName} />
                      <AvatarFallback>{request.targetFallback}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{request.targetName}</p>
                      <p className="truncate text-xs text-slate-500">Người thêm: {request.requesterName}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-8"
                      disabled={processingRequestId === request.idRequest}
                      onClick={() => void handleReject(request.idRequest)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <X className="h-3.5 w-3.5" />
                        Từ chối
                      </span>
                    </Button>
                    <Button
                      className="h-8"
                      disabled={processingRequestId === request.idRequest}
                      onClick={() => void handleApprove(request.idRequest)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        Duyệt
                      </span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

type SettingSwitchProps = {
  label: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
  description?: string
}

function SettingSwitch({ label, checked, onCheckedChange, description }: SettingSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-800">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function displayName(profile: UserProfile | undefined, fallback: string) {
  if (!profile) {
    return fallback
  }
  const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
  return name || fallback
}

function toFallback(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return "U"
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase()
}
