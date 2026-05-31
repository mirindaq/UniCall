import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  CalendarDays,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Copy,
  Flag,
  GanttChartSquare,
  LayoutDashboard,
  List,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCcw,
  Send,
  Tag,
  Trash2,
  User,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { friendService, type FriendApiItem } from "@/services/friend/friend.service"
import { fileService } from "@/services/file/file.service"
import { taskService } from "@/services/task/task.service"
import { userService } from "@/services/user/user.service"
import type {
  TaskAttachment,
  TaskComment,
  TaskDashboardSummary,
  TaskGroup,
  TaskItem,
  TaskPriority,
  UpdateTaskItemPayload,
} from "@/types/task"

type TaskView = "list" | "kanban" | "gantt" | "dashboard"
type TaskScope = "group" | "my"
type UserDisplay = { displayName: string; avatar?: string | null }
type FriendCandidate = { id: string; displayName: string; avatar?: string | null }

const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"]
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-rose-100 text-rose-700",
}

const TAB_ITEMS: Array<{ key: TaskView; label: string; icon: typeof List }> = [
  { key: "list", label: "List", icon: List },
  { key: "kanban", label: "Kanban", icon: Columns3 },
  { key: "gantt", label: "Gantt", icon: GanttChartSquare },
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
]

export function UserTasksPage() {
  const { identityUserId } = useAuth()

  const [scope, setScope] = useState<TaskScope>("group")
  const [view, setView] = useState<TaskView>("list")
  const [groups, setGroups] = useState<TaskGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [myTasks, setMyTasks] = useState<TaskItem[]>([])
  const [dashboard, setDashboard] = useState<TaskDashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [addingMembers, setAddingMembers] = useState(false)
  const [kickingMember, setKickingMember] = useState(false)
  const [kickMemberId, setKickMemberId] = useState<string | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [dragColumnId, setDragColumnId] = useState<string | null>(null)
  const [dragOverColumnOrderId, setDragOverColumnOrderId] = useState<string | null>(null)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [taskComments, setTaskComments] = useState<Record<string, TaskComment[]>>({})
  const [commentDraft, setCommentDraft] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [uploadingCommentAttachment, setUploadingCommentAttachment] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [savingTaskDetail, setSavingTaskDetail] = useState(false)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const commentAttachmentInputRef = useRef<HTMLInputElement | null>(null)

  const [detailTitle, setDetailTitle] = useState("")
  const [detailDescription, setDetailDescription] = useState("")
  const [detailAssigneeIds, setDetailAssigneeIds] = useState<string[]>([])
  const [detailPriority, setDetailPriority] = useState<TaskPriority>("MEDIUM")
  const [detailStartDate, setDetailStartDate] = useState("")
  const [detailDueDate, setDetailDueDate] = useState("")
  const [detailColumnId, setDetailColumnId] = useState("")

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false)

  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [friendKeyword, setFriendKeyword] = useState("")
  const [friendCandidates, setFriendCandidates] = useState<FriendCandidate[]>([])
  const [loadingFriendCandidates, setLoadingFriendCandidates] = useState(false)
  const [userDisplayMap, setUserDisplayMap] = useState<Record<string, UserDisplay>>({})

  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([])
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [taskStartDate, setTaskStartDate] = useState("")
  const [taskColumnId, setTaskColumnId] = useState("")
  const [newColumnName, setNewColumnName] = useState("")
  const [creatingColumn, setCreatingColumn] = useState(false)

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  )
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null
    return tasks.find((task) => task.id === selectedTaskId) ?? myTasks.find((task) => task.id === selectedTaskId) ?? null
  }, [myTasks, selectedTaskId, tasks])
  const selectedTaskGroup = useMemo(() => {
    if (!selectedTask) return selectedGroup
    return groups.find((group) => group.id === selectedTask.groupId) ?? selectedGroup
  }, [groups, selectedGroup, selectedTask])
  const selectedTaskComments = selectedTaskId ? taskComments[selectedTaskId] ?? [] : []
  const selectedTaskAttachments = selectedTask?.attachments ?? []
  const isOwner = Boolean(selectedGroup && identityUserId && selectedGroup.ownerId === identityUserId)
  const effectiveView: TaskView =
    scope === "my" && (view === "gantt" || view === "dashboard") ? "list" : view
  const visibleTasks = scope === "my" ? myTasks : tasks
  const tabItems = scope === "my" ? TAB_ITEMS.filter((tab) => tab.key === "list" || tab.key === "kanban") : TAB_ITEMS
  const getUserDisplayName = (userId: string) => userDisplayMap[userId]?.displayName || "Người dùng"
  const getUserAvatar = (userId: string) => userDisplayMap[userId]?.avatar ?? null
  const kickMemberName = kickMemberId ? getUserDisplayName(kickMemberId) : ""

  const availableFriends = useMemo(() => {
    if (!selectedGroup) return []
    const memberSet = new Set(selectedGroup.memberIds)
    return friendCandidates.filter((friend) => !memberSet.has(friend.id))
  }, [friendCandidates, selectedGroup])

  const filteredAvailableFriends = useMemo(() => {
    const keyword = friendKeyword.trim().toLowerCase()
    if (!keyword) return availableFriends
    return availableFriends.filter((friend) => friend.displayName.toLowerCase().includes(keyword))
  }, [availableFriends, friendKeyword])

  const groupMemberOptions = useMemo(() => {
    if (!selectedGroup) return []
    return selectedGroup.memberIds
      .map((memberId) => ({
        id: memberId,
        name: getUserDisplayName(memberId),
        avatar: userDisplayMap[memberId]?.avatar ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
  }, [selectedGroup, userDisplayMap])

  const groupedTasks = useMemo(() => {
    if (!selectedGroup) return []
    const byColumn = new Map<string, TaskItem[]>()
    selectedGroup.columns
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .forEach((column) => byColumn.set(column.id, []))

    visibleTasks.forEach((task) => {
      if (!byColumn.has(task.columnId)) {
        byColumn.set(task.columnId, [])
      }
      byColumn.get(task.columnId)?.push(task)
    })

    return Array.from(byColumn.entries()).map(([columnId, items]) => ({
      columnId,
      columnName: selectedGroup.columns.find((column) => column.id === columnId)?.name ?? "Other",
      items,
    }))
  }, [selectedGroup, visibleTasks])

  const kanbanGroupedTasks = useMemo(() => {
    if (scope === "group") return groupedTasks
    const columnMap = new Map<
      string,
      { columnId: string; columnName: string; orderIndex: number; items: TaskItem[] }
    >()

    myTasks.forEach((task) => {
      const group = groups.find((item) => item.id === task.groupId)
      const column = group?.columns.find((item) => item.id === task.columnId)
      const columnName = column?.name || "Other"
      const key = columnName.toLowerCase()
      if (!columnMap.has(key)) {
        columnMap.set(key, {
          columnId: key,
          columnName,
          orderIndex: column?.orderIndex ?? 999,
          items: [],
        })
      }
      columnMap.get(key)?.items.push(task)
    })

    return Array.from(columnMap.values())
      .sort((a, b) => a.orderIndex - b.orderIndex || a.columnName.localeCompare(b.columnName, "vi"))
      .map(({ columnId, columnName, items }) => ({ columnId, columnName, items }))
  }, [groupedTasks, groups, myTasks, scope])

  const dashboardAssigneeData = useMemo(
    () =>
      Object.entries(dashboard?.tasksByAssignee ?? {}).map(([key, value]) => ({
        name: mapIdentityToDisplayName(key, userDisplayMap),
        value,
      })),
    [dashboard, userDisplayMap]
  )
  const dashboardDurationData = useMemo(() => {
    const DAY_MS = 24 * 60 * 60 * 1000
    const stats = new Map<string, { totalDays: number; count: number }>()

    tasks.forEach((task) => {
      const assignees = task.assigneeIds?.length ? task.assigneeIds : [task.reporterId]
      const start = startOfDayTimestamp(task.startDate || task.createdAt)
      const end = startOfDayTimestamp(task.dueDate || task.startDate || task.createdAt)
      const durationDays = Math.max(1, Math.floor((end - start) / DAY_MS) + 1)

      assignees.forEach((userId) => {
        const current = stats.get(userId) ?? { totalDays: 0, count: 0 }
        current.totalDays += durationDays
        current.count += 1
        stats.set(userId, current)
      })
    })

    return Array.from(stats.entries())
      .map(([userId, value]) => ({
        name: userDisplayMap[userId]?.displayName || "Người dùng",
        value: Number((value.totalDays / value.count).toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
  }, [tasks, userDisplayMap])

  const knownUserIds = useMemo(() => {
    const ids = new Set<string>()
    selectedGroup?.memberIds?.forEach((userId) => ids.add(userId))
    tasks.forEach((task) => {
      if (task.reporterId) ids.add(task.reporterId)
      ;(task.assigneeIds ?? []).forEach((userId) => ids.add(userId))
    })
    myTasks.forEach((task) => {
      if (task.reporterId) ids.add(task.reporterId)
      ;(task.assigneeIds ?? []).forEach((userId) => ids.add(userId))
    })
    Object.keys(dashboard?.tasksByAssignee ?? {}).forEach((userId) => ids.add(userId))
    return Array.from(ids).filter(Boolean)
  }, [dashboard?.tasksByAssignee, myTasks, selectedGroup?.memberIds, tasks])

  const resetTaskForm = () => {
    setTaskTitle("")
    setTaskDescription("")
    setTaskAssigneeIds([])
    setTaskPriority("MEDIUM")
    setTaskDueDate("")
    setTaskStartDate("")
    setTaskColumnId(selectedGroup?.columns?.[0]?.id ?? "")
  }

  const loadGroups = async () => {
    const response = await taskService.listGroups()
    const nextGroups = response.data
    setGroups(nextGroups)

    if (nextGroups.length === 0) {
      setSelectedGroupId(null)
      return null
    }

    const resolvedGroupId =
      selectedGroupId && nextGroups.some((group) => group.id === selectedGroupId)
        ? selectedGroupId
        : nextGroups[0].id

    if (resolvedGroupId !== selectedGroupId) {
      setSelectedGroupId(resolvedGroupId)
    }
    return resolvedGroupId
  }

  const loadGroupData = async (groupId: string) => {
    const [groupResponse, tasksResponse] = await Promise.all([
      taskService.getGroup(groupId),
      taskService.listTasks(groupId),
    ])
    const groupData = groupResponse.data
    setGroups((prev) => prev.map((group) => (group.id === groupId ? groupData : group)))
    setTasks(tasksResponse.data)
    setTaskColumnId((current) => current || groupData.columns[0]?.id || "")

    if (effectiveView === "dashboard") {
      const dashboardResponse = await taskService.getDashboard(groupId)
      setDashboard(dashboardResponse.data)
    } else {
      setDashboard(null)
    }
  }

  const loadMyTasks = async () => {
    const response = await taskService.listMyTasks()
    setMyTasks(response.data)
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const groupId = await loadGroups()
      if (scope === "my") {
        await loadMyTasks()
      } else if (groupId) {
        await loadGroupData(groupId)
      }
    } catch {
      toast.error("Không thể tải dữ liệu công việc")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (scope === "my") {
      void loadMyTasks()
    }
  }, [scope])

  useEffect(() => {
    if (scope !== "group" || !selectedGroupId) return
    void loadGroupData(selectedGroupId)
  }, [scope, selectedGroupId, effectiveView])

  useEffect(() => {
    const unresolvedIds = knownUserIds.filter(
      (userId) => isLikelyIdentityUserId(userId) && !userDisplayMap[userId]
    )
    if (unresolvedIds.length === 0) return

    let cancelled = false
    void Promise.all(
      unresolvedIds.map(async (userId) => {
        try {
          const response = await userService.getProfileByIdentityUserId(userId)
          const profile = response.data
          return {
            id: userId,
            displayName: buildDisplayName(profile.firstName, profile.lastName),
            avatar: profile.avatar ?? null,
          }
        } catch {
          return {
            id: userId,
            displayName: "Người dùng",
            avatar: null,
          }
        }
      })
    ).then((profiles) => {
      if (cancelled) return
      setUserDisplayMap((prev) => {
        const next = { ...prev }
        for (const profile of profiles) {
          next[profile.id] = {
            displayName: profile.displayName,
            avatar: profile.avatar,
          }
        }
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [knownUserIds, userDisplayMap])

  useEffect(() => {
    if (!isAddMemberOpen) return

    let cancelled = false
    setLoadingFriendCandidates(true)
    void (async () => {
      try {
        const myProfileResponse = await userService.getMyProfile()
        const currentUserId = myProfileResponse.data.identityUserId || identityUserId
        if (!currentUserId) {
          setFriendCandidates([])
          return
        }

        const response = await friendService.getAllFriends(currentUserId)
        const friends = response.data ?? []
        const peerRecords = new Map<string, FriendApiItem>()

        for (const friend of friends) {
          const peerId =
            friend.idAccountSent === currentUserId
              ? friend.idAccountReceive
              : friend.idAccountSent
          if (!peerId) continue
          peerRecords.set(peerId, friend)
        }

        const candidates = await Promise.all(
          Array.from(peerRecords.entries()).map(async ([peerId, friend]) => {
            try {
              const profileResponse = await userService.getProfileByIdentityUserId(peerId)
              const profile = profileResponse.data
              return {
                id: peerId,
                displayName: buildDisplayName(profile.firstName, profile.lastName),
                avatar: sanitizeAvatar(profile.avatar ?? friend.avatar ?? friend.pathAvartar ?? null),
              }
            } catch {
              return {
                id: peerId,
                displayName: buildDisplayName(friend.firstName, friend.lastName),
                avatar: sanitizeAvatar(friend.avatar ?? friend.pathAvartar ?? null),
              }
            }
          })
        )

        if (cancelled) return
        setFriendCandidates(candidates)
        setUserDisplayMap((prev) => {
          const next = { ...prev }
          for (const candidate of candidates) {
            next[candidate.id] = {
              displayName: candidate.displayName,
              avatar: candidate.avatar,
            }
          }
          return next
        })
      } catch {
        if (cancelled) return
        setFriendCandidates([])
        toast.error("Không thể tải danh sách bạn bè")
      } finally {
        if (!cancelled) {
          setLoadingFriendCandidates(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAddMemberOpen, identityUserId])

  useEffect(() => {
    if (!isAddMemberOpen) return
    setSelectedFriendIds([])
    setFriendKeyword("")
  }, [isAddMemberOpen, selectedGroupId])

  useEffect(() => {
    if (!selectedTask) {
      setDetailTitle("")
      setDetailDescription("")
      setDetailAssigneeIds([])
      setDetailPriority("MEDIUM")
      setDetailStartDate("")
      setDetailDueDate("")
      setDetailColumnId("")
      return
    }
    setDetailTitle(selectedTask.title ?? "")
    setDetailDescription(selectedTask.description ?? "")
    setDetailAssigneeIds(selectedTask.assigneeIds ?? [])
    setDetailPriority(selectedTask.priority ?? "MEDIUM")
    setDetailStartDate(formatDateForInput(selectedTask.startDate || selectedTask.createdAt))
    setDetailDueDate(formatDateForInput(selectedTask.dueDate))
    setDetailColumnId(selectedTask.columnId ?? "")
  }, [selectedTask?.id, selectedTask?.updatedAt])

  useEffect(() => {
    if (!selectedTaskId) return
    void loadTaskComments(selectedTaskId)
  }, [selectedTaskId])

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm")
      return
    }
    setCreatingGroup(true)
    try {
      const response = await taskService.createGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      })
      const created = response.data
      setGroups((prev) => [created, ...prev])
      setSelectedGroupId(created.id)
      setScope("group")
      setNewGroupName("")
      setNewGroupDescription("")
      setIsCreateGroupOpen(false)
      toast.success("Tạo nhóm công việc thành công")
    } catch {
      toast.error("Tạo nhóm công việc thất bại")
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleAddMembers = async () => {
    if (!selectedGroupId) return
    if (selectedFriendIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một bạn bè")
      return
    }
    setAddingMembers(true)
    try {
      const response = await taskService.addMembers(selectedGroupId, selectedFriendIds)
      setGroups((prev) => prev.map((group) => (group.id === selectedGroupId ? response.data : group)))
      setSelectedFriendIds([])
      setIsAddMemberOpen(false)
      toast.success("Thêm thành viên thành công")
    } catch {
      toast.error("Thêm thành viên thất bại")
    } finally {
      setAddingMembers(false)
    }
  }

  const handleConfirmKickMember = async () => {
    if (!selectedGroupId || !kickMemberId) return
    setKickingMember(true)
    try {
      const response = await taskService.removeMember(selectedGroupId, kickMemberId)
      setGroups((prev) => prev.map((group) => (group.id === selectedGroupId ? response.data : group)))
      setKickMemberId(null)
      await loadGroupData(selectedGroupId)
      toast.success("Xóa thành viên thành công")
    } catch {
      toast.error("Xóa thành viên thất bại")
    } finally {
      setKickingMember(false)
    }
  }

  const handleCreateTask = async () => {
    if (!selectedGroupId || !taskTitle.trim() || !taskColumnId) {
      toast.error("Vui lòng nhập đầy đủ thông tin công việc")
      return
    }
    setCreatingTask(true)
    try {
      await taskService.createTask(selectedGroupId, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        assigneeIds: taskAssigneeIds,
        columnId: taskColumnId,
        priority: taskPriority,
        startDate: taskStartDate ? new Date(taskStartDate).toISOString() : undefined,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
      })
      resetTaskForm()
      setIsCreateTaskOpen(false)
      await loadGroupData(selectedGroupId)
      await loadMyTasks()
      toast.success("Tạo công việc thành công")
    } catch {
      toast.error("Tạo công việc thất bại")
    } finally {
      setCreatingTask(false)
    }
  }

  const handleCreateColumn = async () => {
    if (!selectedGroupId || !newColumnName.trim()) {
      toast.error("Vui lòng nhập tên nhóm trạng thái")
      return
    }
    setCreatingColumn(true)
    try {
      const response = await taskService.addColumn(selectedGroupId, { name: newColumnName.trim() })
      setGroups((prev) => prev.map((group) => (group.id === selectedGroupId ? response.data : group)))
      setNewColumnName("")
      setIsCreateColumnOpen(false)
      await loadGroupData(selectedGroupId)
      toast.success("Tạo nhóm trạng thái thành công")
    } catch {
      toast.error("Tạo nhóm trạng thái thất bại")
    } finally {
      setCreatingColumn(false)
    }
  }

  const handleQuickMoveTask = async (taskId: string, payload: UpdateTaskItemPayload) => {
    if (!selectedGroupId) return
    try {
      await taskService.updateTask(taskId, payload)
      await loadGroupData(selectedGroupId)
      await loadMyTasks()
    } catch {
      toast.error("Cập nhật công việc thất bại")
    }
  }

  const handleDropToColumn = async (columnId: string) => {
    setDragOverColumnId(null)
    if (!dragTaskId || !selectedGroup) return
    const current = tasks.find((task) => task.id === dragTaskId)
    setDragTaskId(null)
    if (!current || current.columnId === columnId) return
    await handleQuickMoveTask(current.id, { columnId })
  }

  const handleDropColumnOrder = async (targetColumnId: string) => {
    setDragOverColumnId(null)
    setDragOverColumnOrderId(null)
    if (!selectedGroupId || !selectedGroup || !dragColumnId) return
    if (dragColumnId === targetColumnId) {
      setDragColumnId(null)
      return
    }

    const orderedColumns = selectedGroup.columns
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((column) => column.id)

    const sourceIndex = orderedColumns.indexOf(dragColumnId)
    const targetIndex = orderedColumns.indexOf(targetColumnId)
    if (sourceIndex < 0 || targetIndex < 0) {
      setDragColumnId(null)
      return
    }

    const nextOrder = orderedColumns.slice()
    const [moved] = nextOrder.splice(sourceIndex, 1)
    nextOrder.splice(targetIndex, 0, moved)

    setDragColumnId(null)
    try {
      const response = await taskService.reorderColumns(selectedGroupId, { columnIds: nextOrder })
      setGroups((prev) => prev.map((group) => (group.id === selectedGroupId ? response.data : group)))
      await loadGroupData(selectedGroupId)
      toast.success("Đã sắp xếp lại nhóm trạng thái")
    } catch {
      toast.error("Sắp xếp nhóm trạng thái thất bại")
    }
  }

  const openTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  const closeTaskDetail = () => {
    setSelectedTaskId(null)
    setCommentDraft("")
  }

  const loadTaskComments = async (taskId: string) => {
    setLoadingComments(true)
    try {
      const response = await taskService.listComments(taskId)
      setTaskComments((prev) => ({ ...prev, [taskId]: response.data }))
    } catch {
      toast.error("Không thể tải bình luận")
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async () => {
    if (!selectedTaskId) return
    const content = commentDraft.trim()
    if (!content) return
    try {
      await taskService.createComment(selectedTaskId, { content })
      setCommentDraft("")
      await loadTaskComments(selectedTaskId)
      const groupId = selectedTask?.groupId
      if (groupId) {
        await loadGroupData(groupId)
      }
      await loadMyTasks()
      toast.success("Đã thêm bình luận")
    } catch {
      toast.error("Thêm bình luận thất bại")
    }
  }

  const handleAttachmentInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ""
    void handleUploadAttachment(file)
  }

  const handleCommentAttachmentInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ""
    void handleUploadCommentAttachment(file)
  }

  const handleUploadAttachment = async (file: File) => {
    if (!selectedTaskId || !selectedTask) return
    setUploadingAttachment(true)
    try {
      const response = await fileService.uploadFile(file)
      const data = response.data
      const currentAttachments = selectedTask.attachments ?? []
      const attachment: TaskAttachment = {
        id: buildLocalId(),
        name: file.name,
        url: data.url,
        type: data.type || (file.type.startsWith("image/") ? "IMAGE" : "FILE"),
        size: data.fileSize,
        uploadedAt: new Date().toISOString(),
        uploadedBy: identityUserId ?? undefined,
      }
      await taskService.updateTask(selectedTaskId, {
        attachments: [attachment, ...currentAttachments],
      })
      const groupId = selectedTask.groupId
      await loadGroupData(groupId)
      await loadMyTasks()
      toast.success("Tải tệp đính kèm thành công")
    } catch {
      toast.error("Upload file thất bại")
    } finally {
      setUploadingAttachment(false)
    }
  }

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!selectedTask) return
    const nextAttachments = (selectedTask.attachments ?? []).filter((attachment) => attachment.id !== attachmentId)
    setUploadingAttachment(true)
    try {
      await taskService.updateTask(selectedTask.id, {
        attachments: nextAttachments,
      })
      await loadGroupData(selectedTask.groupId)
      await loadMyTasks()
      toast.success("Đã xóa tệp đính kèm")
    } catch {
      toast.error("Xóa tệp đính kèm thất bại")
    } finally {
      setUploadingAttachment(false)
    }
  }

  const handleUploadCommentAttachment = async (file: File) => {
    if (!selectedTaskId) return
    setUploadingCommentAttachment(true)
    try {
      const response = await fileService.uploadFile(file)
      const data = response.data
      const attachment: TaskAttachment = {
        id: buildLocalId(),
        name: file.name,
        url: data.url,
        type: data.type || (file.type.startsWith("image/") ? "IMAGE" : "FILE"),
        size: data.fileSize,
        uploadedAt: new Date().toISOString(),
        uploadedBy: identityUserId ?? undefined,
      }
      await taskService.createComment(selectedTaskId, {
        attachments: [attachment],
      })
      await loadTaskComments(selectedTaskId)
      const groupId = selectedTask?.groupId
      if (groupId) {
        await loadGroupData(groupId)
      }
      await loadMyTasks()
      toast.success("Đã gửi tài liệu dưới dạng comment")
    } catch {
      toast.error("Upload tài liệu cho comment thất bại")
    } finally {
      setUploadingCommentAttachment(false)
    }
  }

  const handleDeleteComment = async (comment: TaskComment) => {
    if (!selectedTaskId || !selectedTask) return
    if (!identityUserId || comment.authorId !== identityUserId) {
      toast.error("Bạn chỉ có thể xóa bình luận của chính mình")
      return
    }

    setDeletingCommentId(comment.id)
    try {
      const attachmentUrls = (comment.attachments ?? [])
        .map((attachment) => attachment.url)
        .filter((url): url is string => Boolean(url))

      if (attachmentUrls.length > 0) {
        await fileService.deleteFiles(attachmentUrls)
      }

      await taskService.deleteComment(selectedTaskId, comment.id)
      await loadTaskComments(selectedTaskId)
      await loadGroupData(selectedTask.groupId)
      await loadMyTasks()
      toast.success("Đã xóa bình luận")
    } catch {
      toast.error("Xóa bình luận thất bại")
    } finally {
      setDeletingCommentId(null)
    }
  }

  const handleToggleDetailAssignee = (assigneeId: string) => {
    setDetailAssigneeIds((prev) =>
      prev.includes(assigneeId) ? prev.filter((id) => id !== assigneeId) : [...prev, assigneeId]
    )
  }

  const handleToggleCreateAssignee = (assigneeId: string) => {
    setTaskAssigneeIds((prev) =>
      prev.includes(assigneeId) ? prev.filter((id) => id !== assigneeId) : [...prev, assigneeId]
    )
  }

  const handleSaveTaskDetail = async () => {
    if (!selectedTask) return
    const title = detailTitle.trim()
    if (!title) {
      toast.error("Tiêu đề task không được để trống")
      return
    }
    if (!detailColumnId) {
      toast.error("Vui lòng chọn trạng thái")
      return
    }

    const payload: UpdateTaskItemPayload = {
      title,
      description: detailDescription.trim() || "",
      assigneeIds: detailAssigneeIds,
      priority: detailPriority,
      columnId: detailColumnId,
      startDate: detailStartDate ? new Date(`${detailStartDate}T00:00:00`).toISOString() : undefined,
      dueDate: detailDueDate ? new Date(`${detailDueDate}T23:59:59`).toISOString() : undefined,
    }

    setSavingTaskDetail(true)
    try {
      await taskService.updateTask(selectedTask.id, payload)
      await loadGroupData(selectedTask.groupId)
      await loadMyTasks()
      toast.success("Đã lưu thông tin task")
    } catch {
      toast.error("Lưu thông tin task thất bại")
    } finally {
      setSavingTaskDetail(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!selectedTask) return
    await handleMarkCompleteForTask(selectedTask)
  }

  const handleCopyTaskId = async () => {
    if (!selectedTask?.id) return
    try {
      await navigator.clipboard.writeText(selectedTask.id)
      toast.success("Đã copy Task ID")
    } catch (error) {
      console.error("copy task id error", error)
      toast.error("Không thể copy Task ID")
    }
  }

  const handleMarkCompleteForTask = async (task: TaskItem) => {
    const group = groups.find((item) => item.id === task.groupId) ?? selectedTaskGroup
    if (!group) {
      toast.error("Không tìm thấy nhóm công việc")
      return
    }
    setMarkingComplete(true)
    try {
      await taskService.updateTask(task.id, { completed: !Boolean(task.completed) })
      await loadGroupData(group.id)
      await loadMyTasks()
      toast.success(Boolean(task.completed) ? "Đã bỏ hoàn thành" : "Đã đánh dấu hoàn thành")
    } catch {
      toast.error("Đánh dấu hoàn thành thất bại")
    } finally {
      setMarkingComplete(false)
    }
  }

  return (
    <>
      <div className="flex h-full min-h-0 bg-[#f5f6fa] text-slate-800">
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Tasks</h2>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 px-3 py-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick Access</p>
            <button
              type="button"
              onClick={() => setScope("my")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                scope === "my" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              All My Tasks
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-slate-200 px-3 py-3">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-sm font-medium text-slate-700">Task List</p>
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                title="New Group"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <div className="min-h-0 space-y-1 overflow-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setScope("group")
                    setSelectedGroupId(group.id)
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    scope === "group" && selectedGroupId === group.id
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="truncate">{group.name}</p>
                  <p className="text-xs text-slate-400">{group.memberIds.length} members</p>
                </button>
              ))}
              {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                  Chưa có task group
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-semibold tracking-tight text-slate-900">
                    {scope === "my" ? "My Tasks" : selectedGroup?.name || "Tasks"}
                  </p>
                  <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-500">
                  {scope === "my"
                    ? `${myTasks.length} tasks assigned to you`
                    : selectedGroup
                      ? `${selectedGroup.memberIds.length} thành viên`
                      : "Chọn task group để bắt đầu"}
                </p>
              </div>

              {selectedGroup ? (
                <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  {selectedGroup.memberIds.slice(0, 5).map((memberId) => (
                    <MemberBubble key={memberId} name={getUserDisplayName(memberId)} />
                  ))}
                  {selectedGroup.memberIds.length > 5 ? (
                    <span className="text-xs text-slate-500">+{selectedGroup.memberIds.length - 5}</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {tabItems.map((tab) => {
                const Icon = tab.icon
                const active = effectiveView === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setView(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {scope === "group" ? (
                  <>
                    <Button
                      className="h-9 rounded-md bg-slate-900 px-3 text-white hover:bg-slate-800"
                      onClick={() => {
                        if (!selectedGroup) {
                          toast.error("Vui lòng chọn task group")
                          return
                        }
                        setIsCreateTaskOpen(true)
                      }}
                    >
                      <Plus className="mr-1 size-4" />
                      New Task
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 rounded-md border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        if (!selectedGroup) {
                          toast.error("Vui lòng chọn task group")
                          return
                        }
                        setIsCreateColumnOpen(true)
                      }}
                    >
                      <Plus className="mr-1 size-4" />
                      New Status
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 rounded-md"
                      onClick={() => {
                        if (!selectedGroup || !isOwner) {
                          toast.error("Chỉ owner trong task group mới thêm được thành viên")
                          return
                        }
                        setIsAddMemberOpen(true)
                      }}
                    >
                      <UserPlus className="mr-1 size-4" />
                      Add Member
                    </Button>
                  </>
                ) : null}
              </div>

              <Button variant="outline" className="h-9 rounded-md" disabled={loading} onClick={() => void refresh()}>
                <RefreshCcw className={`mr-1 size-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Đang tải..." : "Làm mới"}
              </Button>
            </div>

            {scope === "group" && selectedGroup ? (
              <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Thành viên nhóm</p>
                  <span className="text-xs text-slate-500">{selectedGroup.memberIds.length} members</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedGroup.memberIds.map((memberId) => (
                    <span
                      key={memberId}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                    >
                      <span className="font-medium">{getUserDisplayName(memberId)}</span>
                      {memberId === selectedGroup.ownerId ? <span className="text-slate-400">(Owner)</span> : null}
                      {isOwner && memberId !== selectedGroup.ownerId ? (
                        <button
                          type="button"
                          onClick={() => setKickMemberId(memberId)}
                          className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                          Xóa
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {effectiveView === "list" ? (
              <ListView
                groupedTasks={kanbanGroupedTasks}
                resolveUserName={getUserDisplayName}
                resolveUserAvatar={getUserAvatar}
                onSelectTask={openTaskDetail}
                onMarkComplete={(task) => void handleMarkCompleteForTask(task)}
              />
            ) : null}

            {effectiveView === "kanban" ? (
              <KanbanView
                groupedTasks={kanbanGroupedTasks}
                resolveUserName={getUserDisplayName}
                resolveUserAvatar={getUserAvatar}
                enableDnD={scope === "group"}
                dragOverColumnId={dragOverColumnId}
                onDragOverColumn={(columnId) => setDragOverColumnId(columnId)}
                onDropColumn={(columnId) => void handleDropToColumn(columnId)}
                onDragStartTask={(taskId) => {
                  setDragColumnId(null)
                  setDragTaskId(taskId)
                }}
                onDragEndTask={() => {
                  setDragTaskId(null)
                  setDragOverColumnId(null)
                }}
                dragColumnId={dragColumnId}
                dragOverColumnOrderId={dragOverColumnOrderId}
                onDragStartColumn={(columnId) => {
                  setDragTaskId(null)
                  setDragColumnId(columnId)
                  setDragOverColumnId(null)
                }}
                onDragOverColumnOrder={(columnId) => setDragOverColumnOrderId(columnId)}
                onDropColumnOrder={(columnId) => void handleDropColumnOrder(columnId)}
                onDragEndColumn={() => {
                  setDragColumnId(null)
                  setDragOverColumnId(null)
                  setDragOverColumnOrderId(null)
                }}
                onSelectTask={openTaskDetail}
                onMarkComplete={(task) => void handleMarkCompleteForTask(task)}
              />
            ) : null}

            {effectiveView === "gantt" ? (
              <GanttView
                groupedTasks={groupedTasks}
                resolveUserName={getUserDisplayName}
                resolveUserAvatar={getUserAvatar}
                onSelectTask={openTaskDetail}
              />
            ) : null}

            {effectiveView === "dashboard" ? (
              <DashboardView
                dashboard={dashboard}
                dashboardAssigneeData={dashboardAssigneeData}
                dashboardDurationData={dashboardDurationData}
              />
            ) : null}
          </div>
        </main>
      </div>

      <Sheet open={Boolean(selectedTask)} onOpenChange={(open) => (!open ? closeTaskDetail() : undefined)}>
        {selectedTask ? (
          <SheetContent side="right" className="w-full p-0 sm:max-w-[460px]!">
            <div className="flex h-full min-h-0 flex-col bg-slate-50">
              <div className="border-b border-slate-200 bg-white px-5 py-4 pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={isTaskComplete(selectedTask) ? "secondary" : "outline"}
                    className={`h-8 rounded-full px-3 text-sm ${
                      isTaskComplete(selectedTask)
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border-blue-200 text-blue-700 hover:bg-blue-50"
                    }`}
                    onClick={() => void handleMarkComplete()}
                    disabled={markingComplete}
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    {markingComplete
                      ? "Đang xử lý..."
                      : isTaskComplete(selectedTask)
                        ? "Đã hoàn thành"
                        : "Mark Complete"}
                  </Button>
                  <Button
                    className="h-8 rounded-full px-3 text-sm"
                    onClick={() => void handleSaveTaskDetail()}
                    disabled={savingTaskDetail}
                  >
                    {savingTaskDetail ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                  <div className="text-xs text-slate-400">Tạo lúc {formatDateTime(selectedTask.createdAt)}</div>
                </div>
                <Input
                  className={`mt-3 h-11 border-slate-200 bg-slate-50 text-3xl font-semibold ${
                    isTaskComplete(selectedTask) ? "text-slate-400 line-through" : "text-slate-900"
                  }`}
                  value={detailTitle}
                  onChange={(event) => setDetailTitle(event.target.value)}
                  placeholder="Tiêu đề task"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarImage src={getUserAvatar(selectedTask.reporterId) || undefined} alt={getUserDisplayName(selectedTask.reporterId)} />
                      <AvatarFallback>{buildAvatarFallback(getUserDisplayName(selectedTask.reporterId))}</AvatarFallback>
                    </Avatar>
                    <span>{getUserDisplayName(selectedTask.reporterId)}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <span>{selectedTaskGroup?.name || "Task group"}</span>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyTaskId()}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                    title="Copy Task ID"
                  >
                    <Copy className="size-3.5" />
                    Copy ID
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <InfoCard icon={User} label="Assignee">
                    <div className="space-y-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-8 w-full justify-between border-slate-200 bg-white px-2 text-sm">
                            <span className="truncate text-left">
                              {detailAssigneeIds.length === 0
                                ? "Chọn assignee"
                                : detailAssigneeIds
                                    .slice(0, 2)
                                    .map((assigneeId) => getUserDisplayName(assigneeId))
                                    .join(", ")}
                              {detailAssigneeIds.length > 2 ? ` +${detailAssigneeIds.length - 2}` : ""}
                            </span>
                            <ChevronDown className="size-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72">
                          <DropdownMenuLabel>Chọn thành viên</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {groupMemberOptions.map((member) => (
                            <DropdownMenuCheckboxItem
                              key={member.id}
                              checked={detailAssigneeIds.includes(member.id)}
                              onCheckedChange={() => handleToggleDetailAssignee(member.id)}
                              onSelect={(event) => event.preventDefault()}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Avatar size="sm">
                                  <AvatarImage src={member.avatar || undefined} alt={member.name} />
                                  <AvatarFallback>{buildAvatarFallback(member.name)}</AvatarFallback>
                                </Avatar>
                                <span className="truncate">{member.name}</span>
                              </div>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {detailAssigneeIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {detailAssigneeIds.map((assigneeId) => (
                            <span
                              key={assigneeId}
                              className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                            >
                              {getUserDisplayName(assigneeId)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </InfoCard>
                  <InfoCard icon={Tag} label="Group">
                    {selectedTaskGroup?.name || "-"}
                  </InfoCard>
                  <InfoCard icon={CalendarDays} label="Start">
                    <Input
                      type="date"
                      value={detailStartDate}
                      onChange={(event) => setDetailStartDate(event.target.value)}
                      className="h-8 border-slate-200 bg-white text-sm"
                    />
                  </InfoCard>
                  <InfoCard icon={CalendarClock} label="Due">
                    <Input
                      type="date"
                      value={detailDueDate}
                      onChange={(event) => setDetailDueDate(event.target.value)}
                      className={`h-8 border-slate-200 bg-white text-sm ${
                        isOverdue(selectedTask.dueDate) && !isTaskComplete(selectedTask) ? "text-rose-600" : ""
                      }`}
                    />
                  </InfoCard>
                  <InfoCard icon={Flag} label="Priority">
                    <Select value={detailPriority} onValueChange={(value) => setDetailPriority(value as TaskPriority)}>
                      <SelectTrigger className="h-8 w-full min-w-0 rounded-md border-slate-200 bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </InfoCard>
                  <InfoCard icon={Tag} label="Status">
                    {selectedTaskGroup ? (
                      <Select value={detailColumnId} onValueChange={setDetailColumnId}>
                        <SelectTrigger className="h-8 w-full min-w-0 rounded-md border-slate-200 bg-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedTaskGroup.columns
                            .slice()
                            .sort((a, b) => a.orderIndex - b.orderIndex)
                            .map((column) => (
                              <SelectItem key={column.id} value={column.id}>
                                {column.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      "-"
                    )}
                  </InfoCard>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-lg font-semibold text-slate-900">Description</p>
                  <Textarea
                    className="mt-2 min-h-24 resize-none border-slate-200 bg-slate-50 text-sm text-slate-700"
                    value={detailDescription}
                    onChange={(event) => setDetailDescription(event.target.value)}
                    placeholder="Mô tả task"
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-900">Attachments</p>
                    <Button
                      variant="outline"
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={uploadingAttachment}
                    >
                      <Paperclip className="mr-1 size-3.5" />
                      {uploadingAttachment ? "Đang tải..." : "Add attachment"}
                    </Button>
                  </div>

                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentInputChange}
                  />

                  {selectedTaskAttachments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                      Chưa có tệp đính kèm
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTaskAttachments.map((attachment) => {
                        const isImage = isImageAttachment(attachment)
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300"
                          >
                            {isImage ? (
                              <a href={attachment.url} target="_blank" rel="noreferrer" className="shrink-0">
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="size-12 rounded-md border border-slate-200 object-cover"
                                />
                              </a>
                            ) : (
                              <div className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                <Paperclip className="size-4" />
                              </div>
                            )}
                            <a href={attachment.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                              <p className="truncate font-medium">{attachment.name || getFileNameFromUrl(attachment.url)}</p>
                              <p className="text-xs text-slate-400">{formatDateTime(attachment.uploadedAt)}</p>
                            </a>
                            <span className="text-xs text-slate-400">{formatBytes(attachment.size)}</span>
                            <button
                              type="button"
                              onClick={() => void handleRemoveAttachment(attachment.id)}
                              className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              title="Xóa tệp đính kèm"
                              disabled={uploadingAttachment}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-lg font-semibold text-slate-900">Comment</p>
                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {loadingComments ? (
                      <p className="text-xs text-slate-400">Đang tải bình luận...</p>
                    ) : selectedTaskComments.length === 0 ? (
                      <p className="text-xs text-slate-400">Chưa có bình luận nào.</p>
                    ) : (
                      selectedTaskComments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar size="sm">
                            <AvatarFallback>{buildAvatarFallback(getUserDisplayName(comment.authorId))}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-700">{getUserDisplayName(comment.authorId)}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">{formatDateTime(comment.createdAt)}</span>
                                {identityUserId && comment.authorId === identityUserId ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteComment(comment)}
                                    disabled={deletingCommentId === comment.id}
                                    className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Xóa bình luận"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {comment.content ? (
                              <div className="mt-1 break-words text-sm text-slate-600">{renderCommentContent(comment.content)}</div>
                            ) : null}
                            {(comment.attachments ?? []).length > 0 ? (
                              <div className="mt-2 space-y-2">
                                {(comment.attachments ?? []).map((attachment) => {
                                  const isImage = isImageAttachment(attachment)
                                  if (isImage) {
                                    return (
                                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name}
                                          className="max-h-56 w-auto rounded-md border border-slate-200 object-contain"
                                        />
                                      </a>
                                    )
                                  }
                                  return (
                                    <a
                                      key={attachment.id}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                    >
                                      <Paperclip className="size-3.5 text-slate-500" />
                                      <span className="truncate font-medium">
                                        {attachment.name || getFileNameFromUrl(attachment.url)}
                                      </span>
                                      <span className="ml-auto text-slate-400">{formatBytes(attachment.size)}</span>
                                    </a>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={commentAttachmentInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleCommentAttachmentInputChange}
                    />
                    <Textarea
                      rows={3}
                      value={commentDraft}
                      placeholder="Add a comment"
                      onChange={(event) => setCommentDraft(event.target.value)}
                      className="min-h-24 resize-none rounded-lg border-slate-200 bg-slate-50"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full px-4"
                        onClick={() => commentAttachmentInputRef.current?.click()}
                        disabled={uploadingCommentAttachment}
                      >
                        <Paperclip className="mr-2 size-4" />
                        {uploadingCommentAttachment ? "Đang tải tài liệu..." : "Upload tài liệu"}
                      </Button>
                      <Button
                        className="h-9 rounded-full px-4"
                        onClick={() => void handleAddComment()}
                        disabled={!commentDraft.trim() || uploadingCommentAttachment}
                      >
                        <Send className="mr-2 size-4" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        ) : null}
      </Sheet>

      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Tạo task group mới</DialogTitle>
            <DialogDescription>Owner sẽ quản lý thành viên và toàn bộ task trong group này.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Tên task group" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} />
            <Textarea
              placeholder="Mô tả (tùy chọn)"
              value={newGroupDescription}
              onChange={(event) => setNewGroupDescription(event.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateGroupOpen(false)}>
              Hủy
            </Button>
            <Button disabled={creatingGroup} onClick={() => void handleCreateGroup()}>
              {creatingGroup ? "Đang tạo..." : "Tạo group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Thêm thành viên</DialogTitle>
            <DialogDescription>Chọn bạn bè để thêm vào nhóm task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Tìm bạn bè theo tên"
              value={friendKeyword}
              onChange={(event) => setFriendKeyword(event.target.value)}
            />
            <div className="max-h-72 space-y-2 overflow-auto rounded-lg border border-slate-200 p-2">
              {loadingFriendCandidates ? (
                <p className="px-2 py-4 text-center text-sm text-slate-500">Đang tải danh sách bạn bè...</p>
              ) : filteredAvailableFriends.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-slate-500">
                  {availableFriends.length === 0
                    ? "Tất cả bạn bè đã ở trong nhóm hoặc bạn chưa có bạn bè."
                    : "Không có bạn bè phù hợp."}
                </p>
              ) : (
                filteredAvailableFriends.map((friend) => {
                  const selected = selectedFriendIds.includes(friend.id)
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() =>
                        setSelectedFriendIds((prev) =>
                          selected ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition ${
                        selected
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm">
                          <AvatarImage src={friend.avatar || undefined} alt={friend.displayName} />
                          <AvatarFallback>{buildAvatarFallback(friend.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{friend.displayName}</span>
                      </div>
                      <span className="text-xs font-semibold">{selected ? "Đã chọn" : "Chọn"}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Hủy
            </Button>
            <Button disabled={addingMembers} onClick={() => void handleAddMembers()}>
              {addingMembers ? "Đang thêm..." : "Thêm thành viên"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateColumnOpen} onOpenChange={setIsCreateColumnOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Tạo nhóm trạng thái mới</DialogTitle>
            <DialogDescription>
              Bạn có thể tạo thêm nhóm như Todo, Doing, Review, Done tùy quy trình nhóm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Ví dụ: Review"
              value={newColumnName}
              onChange={(event) => setNewColumnName(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateColumnOpen(false)}>
              Hủy
            </Button>
            <Button disabled={creatingColumn} onClick={() => void handleCreateColumn()}>
              {creatingColumn ? "Đang tạo..." : "Tạo nhóm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle>Tạo task mới</DialogTitle>
            <DialogDescription>Thành viên trong nhóm đều có thể tạo và cập nhật công việc.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tiêu đề</p>
              <Input
                className="h-11 rounded-lg"
                placeholder="Nhập tiêu đề task"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mô tả</p>
              <Textarea
                className="min-h-24 rounded-lg"
                placeholder="Mô tả ngắn gọn mục tiêu, đầu việc chính..."
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nhóm trạng thái</p>
                <Select value={taskColumnId} onValueChange={setTaskColumnId}>
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedGroup?.columns
                      .slice()
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mức độ ưu tiên</p>
                <Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as TaskPriority)}>
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignee</p>
                <span className="text-xs text-slate-400">{taskAssigneeIds.length} đã chọn</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 w-full justify-between rounded-lg border-slate-200 bg-white px-3">
                    <span className="truncate text-left text-sm text-slate-700">
                      {taskAssigneeIds.length === 0
                        ? "Chọn assignee"
                        : taskAssigneeIds
                            .slice(0, 3)
                            .map((assigneeId) => getUserDisplayName(assigneeId))
                            .join(", ")}
                      {taskAssigneeIds.length > 3 ? ` +${taskAssigneeIds.length - 3}` : ""}
                    </span>
                    <ChevronDown className="size-4 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  <DropdownMenuLabel>Thành viên nhóm</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {groupMemberOptions.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-slate-500">Chưa có thành viên trong nhóm.</div>
                  ) : (
                    groupMemberOptions.map((member) => (
                      <DropdownMenuCheckboxItem
                        key={member.id}
                        checked={taskAssigneeIds.includes(member.id)}
                        onCheckedChange={() => handleToggleCreateAssignee(member.id)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar size="sm">
                            <AvatarImage src={member.avatar || undefined} alt={member.name} />
                            <AvatarFallback>{buildAvatarFallback(member.name)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm">{member.name}</span>
                          {selectedGroup?.ownerId === member.id ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              Owner
                            </span>
                          ) : null}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {taskAssigneeIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {taskAssigneeIds.map((assigneeId) => (
                    <span key={assigneeId} className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                      {getUserDisplayName(assigneeId)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                className="h-11 rounded-lg"
                type="date"
                value={taskStartDate}
                onChange={(event) => setTaskStartDate(event.target.value)}
              />
              <Input
                className="h-11 rounded-lg"
                type="date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
              Hủy
            </Button>
            <Button disabled={creatingTask} onClick={() => void handleCreateTask()}>
              {creatingTask ? "Đang tạo..." : "Tạo task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(kickMemberId)} onOpenChange={(open) => (!open ? setKickMemberId(null) : undefined)}>
        <AlertDialogContent size="sm" className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa thành viên <strong>{kickMemberName}</strong> khỏi nhóm không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={kickingMember}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={kickingMember}
              onClick={() => void handleConfirmKickMember()}
            >
              {kickingMember ? "Đang xử lý..." : "Xóa thành viên"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MemberBubble({ name }: { name: string }) {
  return (
    <div className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
      {buildAvatarFallback(name)}
    </div>
  )
}

function RoundCheckbox({
  checked,
  onToggle,
  className = "",
}: {
  checked: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition ${
        checked
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-300 bg-white text-transparent hover:border-blue-400"
      } ${className}`}
    >
      <Check className="size-3.5" />
    </button>
  )
}

function ListView({
  groupedTasks,
  resolveUserName,
  resolveUserAvatar,
  onSelectTask,
  onMarkComplete,
}: {
  groupedTasks: Array<{ columnId: string; columnName: string; items: TaskItem[] }>
  resolveUserName: (userId: string) => string
  resolveUserAvatar: (userId: string) => string | null
  onSelectTask: (taskId: string) => void
  onMarkComplete: (task: TaskItem) => void
}) {
  return (
    <div className="space-y-4">
      {groupedTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Chưa có task nào.
        </div>
      ) : null}
      {groupedTasks.map((column) => (
        <section key={column.columnId} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-2.5">
            <p className="text-[15px] font-semibold text-slate-800">
              {column.columnName} <span className="text-slate-400">{column.items.length}</span>
            </p>
          </div>
          {column.items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">Không có task</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                  <tr>
                    <th className="w-10 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"></th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">Task Title</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Priority</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Assignee</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Start Time</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Due Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Creator</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {column.items.map((task) => {
                    const overdue = isOverdue(task.dueDate)
                    const completed = isTaskComplete(task)
                    const assigneeIds = task.assigneeIds ?? []
                    const showAssigneeNames = assigneeIds.length <= 2
                    const visibleAssignees = assigneeIds.slice(0, 3)
                    return (
                      <tr
                        key={task.id}
                        onClick={() => onSelectTask(task.id)}
                        className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/90"
                      >
                        <td className="px-4 py-2.5">
                          <RoundCheckbox checked={completed} onToggle={() => onMarkComplete(task)} />
                        </td>
                        <td className="px-4 py-2.5">
                          <p className={`text-[15px] font-medium leading-5 ${completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
                            {task.title}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLOR[task.priority]}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {assigneeIds.length === 0 ? (
                            <span className="text-xs text-slate-400">Unassigned</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {visibleAssignees.map((assigneeId) => (
                                <div key={assigneeId} className="flex items-center gap-1.5">
                                  <Avatar size="sm">
                                    <AvatarImage src={resolveUserAvatar(assigneeId) || undefined} alt="avatar" />
                                    <AvatarFallback>{buildAvatarFallback(resolveUserName(assigneeId))}</AvatarFallback>
                                  </Avatar>
                                  {showAssigneeNames ? (
                                    <span className="text-sm text-slate-700">{resolveUserName(assigneeId)}</span>
                                  ) : null}
                                </div>
                              ))}
                              {assigneeIds.length > visibleAssignees.length ? (
                                <span className="text-xs text-slate-400">+{assigneeIds.length - visibleAssignees.length}</span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5" />
                            {formatDateOnly(task.startDate || task.createdAt)}
                          </span>
                        </td>
                        <td className={`px-3 py-2.5 ${overdue && !completed ? "text-rose-600" : "text-slate-600"}`}>
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3.5" />
                            {formatDateOnly(task.dueDate)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          <div className="flex items-center gap-2">
                            <Avatar size="sm">
                              <AvatarImage src={resolveUserAvatar(task.reporterId) || undefined} alt="avatar" />
                              <AvatarFallback>{buildAvatarFallback(resolveUserName(task.reporterId))}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-700">{resolveUserName(task.reporterId)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3.5" />
                            {formatDateTimeShort(task.createdAt)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function KanbanView({
  groupedTasks,
  resolveUserName,
  resolveUserAvatar,
  enableDnD,
  dragOverColumnId,
  onDragOverColumn,
  onDropColumn,
  onDragStartTask,
  onDragEndTask,
  dragColumnId,
  dragOverColumnOrderId,
  onDragStartColumn,
  onDragOverColumnOrder,
  onDropColumnOrder,
  onDragEndColumn,
  onSelectTask,
  onMarkComplete,
}: {
  groupedTasks: Array<{ columnId: string; columnName: string; items: TaskItem[] }>
  resolveUserName: (userId: string) => string
  resolveUserAvatar: (userId: string) => string | null
  enableDnD: boolean
  dragOverColumnId: string | null
  onDragOverColumn: (columnId: string) => void
  onDropColumn: (columnId: string) => void
  onDragStartTask: (taskId: string) => void
  onDragEndTask: () => void
  dragColumnId: string | null
  dragOverColumnOrderId: string | null
  onDragStartColumn: (columnId: string) => void
  onDragOverColumnOrder: (columnId: string) => void
  onDropColumnOrder: (columnId: string) => void
  onDragEndColumn: () => void
  onSelectTask: (taskId: string) => void
  onMarkComplete: (task: TaskItem) => void
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {groupedTasks.map((column) => (
          <div
            key={column.columnId}
            className={`w-80 rounded-xl border p-3 transition ${
              enableDnD && (dragOverColumnId === column.columnId || dragOverColumnOrderId === column.columnId)
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white"
            }`}
            onDragOver={(event) => {
              if (!enableDnD) return
              event.preventDefault()
              onDragOverColumn(column.columnId)
            }}
            onDragLeave={() => {
              if (!enableDnD) return
              onDragOverColumn("")
            }}
            onDrop={(event) => {
              if (!enableDnD) return
              event.preventDefault()
              onDropColumn(column.columnId)
            }}
          >
            <div
              className={`mb-2 flex cursor-grab items-center justify-between rounded-md px-1 py-1 ${
                dragColumnId === column.columnId ? "bg-blue-100" : ""
              }`}
              draggable={enableDnD}
              onDragStart={() => {
                if (!enableDnD) return
                onDragStartColumn(column.columnId)
              }}
              onDragOver={(event) => {
                if (!enableDnD) return
                event.preventDefault()
                onDragOverColumnOrder(column.columnId)
              }}
              onDrop={(event) => {
                if (!enableDnD) return
                event.preventDefault()
                onDropColumnOrder(column.columnId)
              }}
              onDragEnd={() => {
                if (!enableDnD) return
                onDragEndColumn()
              }}
            >
              <p className="text-sm font-semibold text-slate-700">
                {column.columnName} <span className="text-slate-400">{column.items.length}</span>
              </p>
              <MoreHorizontal className="size-4 text-slate-400" />
            </div>

            <div className="space-y-2">
              {column.items.map((task) => {
                const assigneeIds = task.assigneeIds ?? []
                const visibleAssignees = assigneeIds.slice(0, 3)
                return (
                <article key={task.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300">
                  <div className="mb-1.5 flex items-start gap-2">
                    <RoundCheckbox checked={isTaskComplete(task)} onToggle={() => onMarkComplete(task)} className="mt-0.5" />
                    <button
                      type="button"
                      draggable={enableDnD}
                      onDragStart={() => {
                        if (!enableDnD) return
                        onDragStartTask(task.id)
                      }}
                      onDragEnd={() => {
                        if (!enableDnD) return
                        onDragEndTask()
                      }}
                      onClick={() => onSelectTask(task.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`truncate text-[15px] font-medium ${isTaskComplete(task) ? "text-slate-400 line-through" : "text-slate-900"}`}
                          title={task.title}
                        >
                          {task.title}
                        </p>
                        <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLOR[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      {formatKanbanDateRange(task.startDate || task.createdAt, task.dueDate)}
                    </span>
                    {assigneeIds.length > 0 ? (
                      <div className="flex items-center -space-x-1">
                      {visibleAssignees.map((assigneeId) => (
                        <Avatar key={assigneeId} size="sm" className="ring-2 ring-white">
                          <AvatarImage src={resolveUserAvatar(assigneeId) || undefined} alt={resolveUserName(assigneeId)} />
                          <AvatarFallback>{buildAvatarFallback(resolveUserName(assigneeId))}</AvatarFallback>
                        </Avatar>
                      ))}
                      {assigneeIds.length > visibleAssignees.length ? (
                        <span className="ml-2 inline-flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-500">
                          +{assigneeIds.length - visibleAssignees.length}
                        </span>
                      ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              )})}
              {column.items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                  Kéo task vào đây
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GanttView({
  groupedTasks,
  resolveUserName,
  resolveUserAvatar,
  onSelectTask,
}: {
  groupedTasks: Array<{ columnId: string; columnName: string; items: TaskItem[] }>
  resolveUserName: (userId: string) => string
  resolveUserAvatar: (userId: string) => string | null
  onSelectTask: (taskId: string) => void
}) {
  const DAY_MS = 24 * 60 * 60 * 1000
  const dayWidth = 60

  const timeline = useMemo(() => {
    type GanttGroupRow = {
      type: "group"
      id: string
      columnName: string
      count: number
    }
    type GanttTaskRow = {
      type: "task"
      id: string
      task: TaskItem
      startDay: number
      endDay: number
      daySpan: number
    }
    type GanttRow = GanttGroupRow | GanttTaskRow

    const rows: GanttRow[] = []
    let minDay = Number.POSITIVE_INFINITY
    let maxDay = Number.NEGATIVE_INFINITY

    groupedTasks.forEach((column) => {
      rows.push({
        type: "group",
        id: `group-${column.columnId}`,
        columnName: column.columnName,
        count: column.items.length,
      })

      column.items
        .slice()
        .sort((a, b) => {
          const aStart = startOfDayTimestamp(a.startDate || a.createdAt)
          const bStart = startOfDayTimestamp(b.startDate || b.createdAt)
          return aStart - bStart
        })
        .forEach((task) => {
          const startDay = startOfDayTimestamp(task.startDate || task.createdAt)
          const dueValue = task.dueDate || task.startDate || task.createdAt
          const endDay = Math.max(startDay, startOfDayTimestamp(dueValue))
          const daySpan = Math.max(1, Math.floor((endDay - startDay) / DAY_MS) + 1)

          minDay = Math.min(minDay, startDay)
          maxDay = Math.max(maxDay, endDay)
          rows.push({
            type: "task",
            id: task.id,
            task,
            startDay,
            endDay,
            daySpan,
          })
        })
    })

    const today = startOfDayTimestamp(new Date())
    if (!Number.isFinite(minDay) || !Number.isFinite(maxDay)) {
      minDay = today - DAY_MS * 7
      maxDay = today + DAY_MS * 7
    } else {
      minDay -= DAY_MS * 2
      maxDay += DAY_MS * 2
    }

    const days: number[] = []
    for (let cursor = minDay; cursor <= maxDay; cursor += DAY_MS) {
      days.push(cursor)
    }

    const dayIndexMap = new Map<number, number>()
    days.forEach((day, index) => dayIndexMap.set(day, index))

    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
    const monthSegments: Array<{ label: string; startIndex: number; span: number }> = []

    days.forEach((day, index) => {
      const label = monthFormatter.format(new Date(day))
      const last = monthSegments[monthSegments.length - 1]
      if (!last || last.label !== label) {
        monthSegments.push({ label, startIndex: index, span: 1 })
      } else {
        last.span += 1
      }
    })

    const todayIndex = dayIndexMap.get(today) ?? null

    return {
      rows,
      days,
      dayIndexMap,
      monthSegments,
      todayIndex,
    }
  }, [groupedTasks])

  if (timeline.rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Không có task để hiển thị Gantt.
      </div>
    )
  }

  const timelineWidth = Math.max(760, timeline.days.length * dayWidth)
  const todayLineLeft = timeline.todayIndex !== null ? timeline.todayIndex * dayWidth : null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[520px_minmax(720px,1fr)]">
        <div className="border-r border-slate-200 bg-white">
          <div className="grid h-[74px] grid-cols-[minmax(0,1fr)_120px] items-end border-b border-slate-200 px-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Task Title</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</p>
          </div>

          <div>
            {timeline.rows.map((row) =>
              row.type === "group" ? (
                <div
                  key={row.id}
                  className="flex h-10 items-center border-b border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700"
                >
                  <span className="mr-2 text-slate-400">▾</span>
                  <span>{row.columnName}</span>
                  <span className="ml-2 text-slate-400">{row.count}</span>
                </div>
              ) : (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onSelectTask(row.task.id)}
                  className="grid h-[52px] w-full grid-cols-[minmax(0,1fr)_120px] items-center border-b border-slate-100 px-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0 pr-3">
                    <p
                      className={`truncate text-[15px] font-medium ${isTaskComplete(row.task) ? "text-slate-400 line-through" : "text-slate-800"}`}
                      title={row.task.title}
                    >
                      {row.task.title}
                    </p>
                  </div>

                  <div className="flex items-center">
                    {(() => {
                      const assignees = row.task.assigneeIds ?? []
                      const ownerId = assignees[0] || row.task.reporterId
                      const overflow = Math.max(0, assignees.length - 1)
                      return (
                        <div className="flex items-center -space-x-1.5">
                          <Avatar size="sm" className="ring-2 ring-white">
                            <AvatarImage src={resolveUserAvatar(ownerId) || undefined} alt={resolveUserName(ownerId)} />
                            <AvatarFallback>{buildAvatarFallback(resolveUserName(ownerId))}</AvatarFallback>
                          </Avatar>
                          {overflow > 0 ? (
                            <span className="ml-1 inline-flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-500">
                              +{overflow}
                            </span>
                          ) : null}
                        </div>
                      )
                    })()}
                  </div>
                </button>
              )
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="relative" style={{ width: timelineWidth }}>
            {todayLineLeft !== null ? (
              <div
                className="pointer-events-none absolute inset-y-0 z-20 w-px bg-blue-500/90"
                style={{ left: todayLineLeft }}
              >
                <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                  Hôm nay
                </span>
              </div>
            ) : null}

            <div className="sticky top-0 z-10 bg-white">
              <div className="flex h-9 border-b border-slate-200">
                {timeline.monthSegments.map((segment) => (
                  <div
                    key={`${segment.label}-${segment.startIndex}`}
                    className="flex items-center border-r border-slate-100 px-3 text-sm font-medium text-slate-600"
                    style={{ width: segment.span * dayWidth }}
                  >
                    {segment.label}
                  </div>
                ))}
              </div>
              <div className="flex h-9 border-b border-slate-200 bg-slate-50/60">
                {timeline.days.map((day, index) => (
                  <div
                    key={day}
                    className={`flex shrink-0 items-center justify-center border-r text-xs ${
                      index === timeline.todayIndex
                        ? "border-slate-100 bg-blue-50/70 font-semibold text-blue-700"
                        : "border-slate-100 text-slate-500"
                    }`}
                    style={{ width: dayWidth }}
                  >
                    {new Date(day).getDate()}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-0">
                {timeline.days.map((day, index) => (
                  <div
                    key={`grid-${day}`}
                    className="absolute inset-y-0 border-r border-slate-100"
                    style={{ left: index * dayWidth, width: dayWidth }}
                  />
                ))}
              </div>

              <div className="relative">
                {timeline.rows.map((row) =>
                  row.type === "group" ? (
                    <div key={row.id} className="h-10 border-b border-slate-200 bg-slate-50/80" />
                  ) : (
                    <div key={row.id} className="relative h-[52px] border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => onSelectTask(row.task.id)}
                        className={`absolute top-1/2 flex h-7 -translate-y-1/2 items-center rounded-md px-2 text-left text-xs font-medium transition ${
                          isTaskComplete(row.task)
                            ? "bg-slate-300 text-slate-700 hover:bg-slate-400"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        style={{
                          left: row.startDay !== undefined
                            ? (timeline.dayIndexMap.get(row.startDay) ?? 0) * dayWidth + 3
                            : 0,
                          width: Math.max(dayWidth - 6, row.daySpan * dayWidth - 6),
                        }}
                      >
                        <span className="truncate">{row.task.title}</span>
                        <span className="ml-2 shrink-0 text-[10px] opacity-90">
                          {row.daySpan} {row.daySpan > 1 ? "days" : "day"}
                        </span>
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardView({
  dashboard,
  dashboardAssigneeData,
  dashboardDurationData,
}: {
  dashboard: TaskDashboardSummary | null
  dashboardAssigneeData: Array<{ name: string; value: number }>
  dashboardDurationData: Array<{ name: string; value: number }>
}) {
  if (!dashboard) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Đang tải dashboard...
      </div>
    )
  }

  const completionData = [
    { name: "Hoàn thành", value: dashboard.completedTasks, color: "#2dbd2d" },
    { name: "Chưa hoàn thành", value: dashboard.incompleteTasks, color: "#b7e3c8" },
  ]

  const overdueData = [
    { name: "Không trễ", value: Math.max(0, dashboard.totalTasks - dashboard.overdueTasks), color: "#3b6ce1" },
    { name: "Trễ hạn", value: dashboard.overdueTasks, color: "#1fbeb3" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total tasks" value={dashboard.totalTasks} accent="text-slate-800" />
        <StatCard label="Completed tasks" value={dashboard.completedTasks} accent="text-emerald-600" />
        <StatCard label="Incomplete tasks" value={dashboard.incompleteTasks} accent="text-amber-600" />
        <StatCard label="Overdue tasks" value={dashboard.overdueTasks} accent="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Tasks by completion status</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
              Smart Analysis
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={86}
                  label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(2)}%)`}
                >
                  {completionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Tasks by overdue status</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
              Smart Analysis
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overdueData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={86}
                  label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(2)}%)`}
                >
                  {overdueData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Tasks by assignee</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
              Smart Analysis
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardAssigneeData}>
                <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={74} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Average task duration by assignee / Days</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
              Smart Analysis
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardDurationData}>
                <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={74} />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value} ngày`} />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function startOfDayTimestamp(value: string | number | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return Date.now()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatKanbanDateRange(start?: string | null, due?: string | null) {
  const from = formatDateOnly(start)
  const to = formatDateOnly(due)
  if (from === "-" && to === "-") return "-"
  if (to === "-") return from
  if (from === "-") return to
  if (from === to) return from
  return `${from} - ${to}`
}

function formatDateForInput(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}

function formatDateTimeShort(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${hours}:${minutes} ${day}/${month}/${year}`
}

function isImageAttachment(attachment?: { type?: string | null; url?: string | null }) {
  if (!attachment) return false
  const upperType = (attachment.type || "").toUpperCase()
  if (upperType === "IMAGE" || upperType === "GIF") return true
  const url = (attachment.url || "").toLowerCase()
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/.test(url)
}

function getFileNameFromUrl(url?: string | null) {
  if (!url) return "Attachment"
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split("/").filter(Boolean)
    return decodeURIComponent(parts[parts.length - 1] || "Attachment")
  } catch {
    const normalized = url.split("?")[0]
    const parts = normalized.split("/").filter(Boolean)
    return decodeURIComponent(parts[parts.length - 1] || "Attachment")
  }
}

function formatBytes(value?: number) {
  if (!value || Number.isNaN(value)) return "-"
  if (value < 1024) return `${value} B`
  const kb = value / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function renderCommentContent(content?: string | null) {
  if (!content) return null
  const urlRegex = /^https?:\/\/[^\s]+$/i
  const lines = content.split("\n")

  return (
    <>
      {lines.map((line, lineIndex) => {
        const tokens = line.split(/(https?:\/\/[^\s]+)/g)
        return (
          <span key={`${lineIndex}-${line}`}>
            {tokens.map((token, tokenIndex) => {
              if (!token) return null
              if (urlRegex.test(token)) {
                return (
                  <a
                    key={`${lineIndex}-${tokenIndex}`}
                    href={token}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline hover:text-blue-700"
                  >
                    {token}
                  </a>
                )
              }
              return <span key={`${lineIndex}-${tokenIndex}`}>{token}</span>
            })}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        )
      })}
    </>
  )
}

function buildLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isTaskComplete(task: TaskItem) {
  return Boolean(task.completed)
}

function isOverdue(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

function buildDisplayName(firstName?: string | null, lastName?: string | null) {
  const name = `${lastName ?? ""} ${firstName ?? ""}`.trim()
  if (name) return name
  return "Người dùng"
}

function buildAvatarFallback(name: string) {
  const normalized = name.trim()
  if (!normalized) return "U"
  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return `${words[0].slice(0, 1)}${words[words.length - 1].slice(0, 1)}`.toUpperCase()
}

function isLikelyIdentityUserId(value?: string | null) {
  if (!value) return false
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(value)
}

function mapIdentityToDisplayName(userKey: string, map: Record<string, UserDisplay>) {
  if (isLikelyIdentityUserId(userKey)) {
    return map[userKey]?.displayName || "Người dùng"
  }
  return map[userKey]?.displayName || userKey
}

function sanitizeAvatar(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="min-h-6 w-full break-words text-sm text-slate-800">{children}</div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[18px] leading-none text-slate-800">{label}</p>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
          Smart Analysis
        </span>
      </div>
      <p className={`mt-4 text-[78px] leading-none font-semibold tracking-tight ${accent}`}>{value}</p>
    </div>
  )
}
