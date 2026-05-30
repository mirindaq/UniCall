import axiosClient from "@/configurations/axios.config"
import { API_PREFIXES } from "@/constants/api-prefixes"
import type { ResponseSuccess } from "@/types/api-response"
import type {
  CreateTaskCommentPayload,
  CreateTaskColumnPayload,
  CreateTaskGroupPayload,
  CreateTaskItemPayload,
  ReorderTaskColumnsPayload,
  TaskComment,
  TaskDashboardSummary,
  TaskGroup,
  TaskItem,
  UpdateTaskItemPayload,
} from "@/types/task"

const TASK_API_PREFIX = API_PREFIXES.tasks

export const taskService = {
  listGroups: async () => {
    const { data } = await axiosClient.get<ResponseSuccess<TaskGroup[]>>(`${TASK_API_PREFIX}/groups`)
    return data
  },

  createGroup: async (payload: CreateTaskGroupPayload) => {
    const { data } = await axiosClient.post<ResponseSuccess<TaskGroup>>(`${TASK_API_PREFIX}/groups`, payload)
    return data
  },

  getGroup: async (groupId: string) => {
    const { data } = await axiosClient.get<ResponseSuccess<TaskGroup>>(
      `${TASK_API_PREFIX}/groups/${encodeURIComponent(groupId)}`
    )
    return data
  },

  addMembers: async (groupId: string, memberIds: string[]) => {
    const { data } = await axiosClient.post<ResponseSuccess<TaskGroup>>(
      `${TASK_API_PREFIX}/groups/${encodeURIComponent(groupId)}/members`,
      { memberIds }
    )
    return data
  },

  removeMember: async (groupId: string, memberId: string) => {
    const { data } = await axiosClient.delete<ResponseSuccess<TaskGroup>>(
      `${TASK_API_PREFIX}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/kick`
    )
    return data
  },

  addColumn: async (groupId: string, payload: CreateTaskColumnPayload) => {
    const { data } = await axiosClient.post<ResponseSuccess<TaskGroup>>(
      `${TASK_API_PREFIX}/groups/${encodeURIComponent(groupId)}/columns`,
      payload
    )
    return data
  },

  reorderColumns: async (groupId: string, payload: ReorderTaskColumnsPayload) => {
    const { data } = await axiosClient.patch<ResponseSuccess<TaskGroup>>(
      `${TASK_API_PREFIX}/groups/${encodeURIComponent(groupId)}/columns/order`,
      payload
    )
    return data
  },

  listTasks: async (groupId: string, columnId?: string) => {
    const { data } = await axiosClient.get<ResponseSuccess<TaskItem[]>>(
      `${TASK_API_PREFIX}/groups/${encodeURIComponent(groupId)}/items`,
      { params: columnId ? { columnId } : undefined }
    )
    return data
  },

  listMyTasks: async () => {
    const { data } = await axiosClient.get<ResponseSuccess<TaskItem[]>>(`${TASK_API_PREFIX}/my-items`)
    return data
  },

  createTask: async (groupId: string, payload: CreateTaskItemPayload) => {
    const { data } = await axiosClient.post<ResponseSuccess<TaskItem>>(
      `${TASK_API_PREFIX}/groups/${encodeURIComponent(groupId)}/items`,
      payload
    )
    return data
  },

  updateTask: async (taskId: string, payload: UpdateTaskItemPayload) => {
    const { data } = await axiosClient.patch<ResponseSuccess<TaskItem>>(
      `${TASK_API_PREFIX}/items/${encodeURIComponent(taskId)}`,
      payload
    )
    return data
  },

  getDashboard: async (groupId: string) => {
    const { data } = await axiosClient.get<ResponseSuccess<TaskDashboardSummary>>(
      `${TASK_API_PREFIX}/groups/${encodeURIComponent(groupId)}/dashboard`
    )
    return data
  },

  createComment: async (taskId: string, payload: CreateTaskCommentPayload) => {
    const { data } = await axiosClient.post<ResponseSuccess<TaskComment>>(
      `${TASK_API_PREFIX}/items/${encodeURIComponent(taskId)}/comments`,
      payload
    )
    return data
  },

  listComments: async (taskId: string) => {
    const { data } = await axiosClient.get<ResponseSuccess<TaskComment[]>>(
      `${TASK_API_PREFIX}/items/${encodeURIComponent(taskId)}/comments`
    )
    return data
  },

  deleteComment: async (taskId: string, commentId: string) => {
    const { data } = await axiosClient.delete<ResponseSuccess<void>>(
      `${TASK_API_PREFIX}/items/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`
    )
    return data
  },
}
