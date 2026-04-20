import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Ellipsis, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { AddGroupMembersDialog } from "@/components/message/AddGroupMembersDialog"
import { CreateGroupDialog, type CreateGroupPresetMember } from "@/components/message/CreateGroupDialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatPage } from "@/contexts/ChatPageContext"
import { chatService } from "@/services/chat/chat.service"
import { userService } from "@/services/user/user.service"
import type { CreateGroupConversationResponse } from "@/types/chat"
import type { GroupParticipantInfo } from "@/types/chat"
import type { UserProfile } from "@/types/user.type"

type GroupMembersPanelProps = {
  conversationId: string
  onBack: () => void
}

export default function GroupMembersPanel({ conversationId, onBack }: GroupMembersPanelProps) {
  const { currentUserId, refetchConversations, selectConversation, setDetailsView } = useChatPage()
  const [participants, setParticipants] = useState<GroupParticipantInfo[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isCopyGroupOpen, setIsCopyGroupOpen] = useState(false)
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [transferTarget, setTransferTarget] = useState<{ id: string; displayName: string } | null>(null)
  const [isTransferringAdmin, setIsTransferringAdmin] = useState(false)

  const loadGroupDetails = async () => {
    setIsLoading(true)
    try {
      const response = await chatService.getGroupConversationDetails(conversationId)
      setParticipants(response.data.participantInfos ?? [])
      setMemberCount(response.data.numberMember ?? 0)
    } catch {
      toast.error("Không tải được thông tin thành viên nhóm.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadGroupDetails()
  }, [conversationId])

  useEffect(() => {
    if (participants.length === 0) {
      setProfiles({})
      return
    }
    let cancelled = false
    void Promise.all(
      participants.map(async (participant) => {
        try {
          const response = await userService.getProfileByIdentityUserId(participant.idAccount)
          return [participant.idAccount, response.data] as const
        } catch {
          return null
        }
      }),
    ).then((resolved) => {
      if (cancelled) {
        return
      }
      const nextProfiles: Record<string, UserProfile> = {}
      for (const item of resolved) {
        if (!item) {
          continue
        }
        nextProfiles[item[0]] = item[1]
      }
      setProfiles(nextProfiles)
    })

    return () => {
      cancelled = true
    }
  }, [participants])

  const list = useMemo(() => {
    return participants.map((participant) => {
      const profile = profiles[participant.idAccount]
      const displayName = profile
        ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || participant.idAccount
        : participant.idAccount
      const fallback = toFallback(displayName)
      const roleLabel =
        participant.idAccount === currentUserId
          ? participant.role === "ADMIN"
            ? "Trưởng nhóm"
            : participant.role === "DEPUTY"
              ? "Phó nhóm"
              : "Bạn"
          : participant.role === "ADMIN"
            ? "Trưởng nhóm"
            : participant.role === "DEPUTY"
              ? "Phó nhóm"
              : ""

      return {
        id: participant.idAccount,
        role: participant.role,
        displayName: participant.idAccount === currentUserId ? "Bạn" : displayName,
        roleLabel,
        avatar: profile?.avatar ?? undefined,
        fallback,
      }
    })
  }, [participants, profiles, currentUserId])

  const currentUserParticipant = useMemo(
    () => participants.find((participant) => participant.idAccount === currentUserId) ?? null,
    [participants, currentUserId],
  )

  const copyGroupPresetMembers = useMemo<CreateGroupPresetMember[]>(() => {
    return participants
      .filter((participant) => participant.idAccount !== currentUserId)
      .map((participant) => {
        const profile = profiles[participant.idAccount]
        const displayName = profile
          ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || participant.idAccount
          : participant.idAccount
        return {
          id: participant.idAccount,
          displayName,
          avatar: profile?.avatar,
        }
      })
  }, [participants, currentUserId, profiles])

  const handleCopiedGroupCreated = async (createdGroup: CreateGroupConversationResponse) => {
    await refetchConversations()
    selectConversation(createdGroup.idConversation)
    setIsCopyGroupOpen(false)
  }

  const handleLeaveGroup = async () => {
    try {
      await chatService.leaveGroupConversation(conversationId)
      toast.success("Bạn đã rời nhóm.")
      await refetchConversations()
      setDetailsView("main")
      selectConversation(null)
    } catch {
      toast.error("Rời nhóm thất bại, vui lòng thử lại.")
    }
  }

  const handleToggleDeputy = async (memberId: string, isDeputy: boolean) => {
    try {
      await chatService.updateGroupMemberRole(conversationId, memberId, {
        role: isDeputy ? "USER" : "DEPUTY",
      })
      toast.success(isDeputy ? "Đã gỡ quyền phó nhóm." : "Đã thêm phó nhóm.")
      await loadGroupDetails()
      await refetchConversations()
    } catch {
      toast.error("Cập nhật quyền thất bại, vui lòng thử lại.")
    }
  }

  const canKickMember = (memberRole: GroupParticipantInfo["role"]) => {
    if (currentUserParticipant?.role === "ADMIN") {
      return memberRole !== "ADMIN"
    }
    if (currentUserParticipant?.role === "DEPUTY") {
      return memberRole === "USER"
    }
    return false
  }

  const handleRemoveMember = async (memberId: string, memberRole: GroupParticipantInfo["role"]) => {
    if (!canKickMember(memberRole)) {
      toast.error("Bạn không có quyền xóa thành viên này.")
      return
    }
    try {
      await chatService.removeGroupMember(conversationId, memberId)
      toast.success("Đã xóa thành viên khỏi nhóm.")
      await loadGroupDetails()
      await refetchConversations()
    } catch {
      toast.error("Xóa thành viên thất bại, vui lòng thử lại.")
    }
  }

  const handleTransferAdmin = async () => {
    if (!transferTarget || isTransferringAdmin) {
      return
    }
    setIsTransferringAdmin(true)
    try {
      await chatService.transferGroupAdmin(conversationId, {
        targetIdentityUserId: transferTarget.id,
      })
      toast.success("Chuyển quyền trưởng nhóm thành công.")
      await loadGroupDetails()
      await refetchConversations()
      setTransferTarget(null)
    } catch {
      toast.error("Chuyển quyền trưởng nhóm thất bại, vui lòng thử lại.")
    } finally {
      setIsTransferringAdmin(false)
    }
  }

  return (
    <>
      <div className="flex h-full w-full max-w-[340px] shrink-0 flex-col overflow-hidden border-l bg-background">
        <div className="flex shrink-0 items-center border-b px-4 py-4">
          <Button variant="ghost" size="icon-sm" className="mr-2" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold text-foreground">Thành viên</h2>
        </div>

        <div className="px-4 pt-4">
          <Button
            variant="secondary"
            className="h-10 w-full justify-center gap-2 rounded-sm bg-slate-100 text-sm text-slate-700 hover:bg-slate-200"
            onClick={() => setIsAddMemberOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Thêm thành viên
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-between px-4">
          <h3 className="text-base font-semibold text-slate-800">
            Danh sách thành viên ({memberCount || list.length})
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <Ellipsis className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 p-1">
              <DropdownMenuItem className="h-9 rounded-md px-3" onClick={() => setIsCopyGroupOpen(true)}>
                Copy nhóm
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="mt-2 min-h-0 flex-1">
          <div className="space-y-2 px-4 py-2">
            {isLoading ? (
              <p className="text-sm text-slate-500">Đang tải danh sách thành viên...</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-slate-500">Nhóm chưa có thành viên.</p>
            ) : (
              list.map((member) => (
                <div
                  key={member.id}
                  className="group flex items-center gap-3 rounded-md px-1 py-2 transition-colors hover:bg-slate-100"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={member.avatar} alt={member.displayName} />
                    <AvatarFallback>{member.fallback}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{member.displayName}</p>
                    {member.roleLabel ? (
                      <p className="truncate text-xs text-slate-500">{member.roleLabel}</p>
                    ) : null}
                  </div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Ellipsis className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 p-1">
                      {member.id === currentUserId ? (
                        <DropdownMenuItem className="h-9 rounded-md px-3" onClick={() => void handleLeaveGroup()}>
                          Rời nhóm
                        </DropdownMenuItem>
                      ) : currentUserParticipant?.role === "ADMIN" ? (
                        <>
                          <DropdownMenuItem
                            className="h-9 rounded-md px-3"
                            onClick={() =>
                              setTransferTarget({
                                id: member.id,
                                displayName: member.displayName,
                              })
                            }
                          >
                            Chuyển quyền trưởng nhóm
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="h-9 rounded-md px-3"
                            onClick={() => void handleToggleDeputy(member.id, member.role === "DEPUTY")}
                          >
                            {member.role === "DEPUTY" ? "Gỡ quyền phó nhóm" : "Thêm phó nhóm"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="h-9 rounded-md px-3 text-red-600 focus:text-red-600"
                            onClick={() => void handleRemoveMember(member.id, member.role)}
                          >
                            Xóa khỏi nhóm
                          </DropdownMenuItem>
                        </>
                      ) : currentUserParticipant?.role === "DEPUTY" && member.role === "USER" ? (
                        <DropdownMenuItem
                          className="h-9 rounded-md px-3 text-red-600 focus:text-red-600"
                          onClick={() => void handleRemoveMember(member.id, member.role)}
                        >
                          Xóa khỏi nhóm
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="h-9 rounded-md px-3" disabled>
                          Không có quyền
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <AddGroupMembersDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        conversationId={conversationId}
        currentIdentityUserId={currentUserId}
        existingMemberIds={participants.map((item) => item.idAccount)}
        onMembersAdded={async () => {
          await loadGroupDetails()
          await refetchConversations()
        }}
      />

      <CreateGroupDialog
        open={isCopyGroupOpen}
        onOpenChange={setIsCopyGroupOpen}
        currentIdentityUserId={currentUserId}
        onCreatedGroup={handleCopiedGroupCreated}
        initialSelectedMembers={copyGroupPresetMembers}
      />

      <AlertDialog open={Boolean(transferTarget)} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận chuyển quyền trưởng nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn chuyển quyền trưởng nhóm cho {transferTarget?.displayName || "thành viên này"} không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferringAdmin}>Hủy</AlertDialogCancel>
            <AlertDialogAction disabled={isTransferringAdmin} onClick={() => void handleTransferAdmin()}>
              {isTransferringAdmin ? "Đang xử lý..." : "Xác nhận chuyển quyền"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function toFallback(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return "U"
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase()
}
