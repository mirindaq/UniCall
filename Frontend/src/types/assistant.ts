export type AssistantIntent =
  | "AI_CAPABILITIES"
  | "GENERAL_QA"
  | "SMALL_TALK"
  | "LIST_CONVERSATIONS"
  | "LIST_MESSAGES"
  | "SEARCH_KEYWORD"
  | "SEARCH_SEMANTIC"
  | "SEARCH_MY_CHAT_SPACE"
  | "FIND_WHO_SAID"
  | "TASK_LIST_GROUPS"
  | "TASK_FIND_BY_NAME"
  | "TASK_LIST_GROUP_ITEMS"
  | "TASK_CREATE"
  | "TASK_UPDATE"
  | "TASK_DELETE"
  | "TASK_DETAIL"
  | "TASK_COMMENT_CREATE"
  | "TASK_COMMENT_LIST"
  | "TASK_LIST_MY_ITEMS"
  | "TASK_LIST_OVERDUE"
  | "TASK_LIST_DUE_SOON"
  | "SUMMARIZE_CONVERSATION"
  | "UNKNOWN"

export type AssistantToolCode =
  | "CHAT_LIST_MY_CONVERSATIONS"
  | "CHAT_GET_CONVERSATION_MESSAGES"
  | "CHAT_SEARCH_KEYWORD"
  | "CHAT_SEMANTIC_SEARCH_CONVERSATION"
  | "CHAT_SEMANTIC_SEARCH_MY_SPACE"
  | "CHAT_FIND_WHO_SAID"
  | "TASK_LIST_MY_GROUPS"
  | "TASK_FIND_TASKS_BY_NAME"
  | "TASK_LIST_GROUP_TASKS"
  | "TASK_CREATE_TASK"
  | "TASK_UPDATE_TASK"
  | "TASK_DELETE_TASK"
  | "TASK_GET_TASK_DETAIL"
  | "TASK_ADD_TASK_COMMENT"
  | "TASK_LIST_TASK_COMMENTS"
  | "TASK_LIST_MY_TASKS"
  | "TASK_LIST_MY_OVERDUE_TASKS"
  | "TASK_LIST_MY_DUE_SOON_TASKS"

export type AssistantMessageRole = "USER" | "ASSISTANT"

export interface AssistantAskRequest {
  message: string
}

export interface AssistantAskResponse {
  threadId: string
  question: string
  intent: AssistantIntent
  toolsUsed: AssistantToolCode[]
  answer: string
  data: unknown
  metadata?: Record<string, unknown>
}

export interface AssistantThreadResponse {
  threadId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface AssistantThreadMessageResponse {
  id: string
  role: AssistantMessageRole
  content: string
  intent?: AssistantIntent
  toolsUsed?: AssistantToolCode[]
  data?: unknown
  createdAt: string
}
