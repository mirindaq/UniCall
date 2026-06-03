const API_V1_PREFIX = "/api/v1"

export const API_PREFIXES = {
  auth: `${API_V1_PREFIX}/auth`,
  users: `${API_V1_PREFIX}/users`,
  friends: `${API_V1_PREFIX}/friends`,
  friendRequests: `${API_V1_PREFIX}/friend-requestes`,
  chat: `${API_V1_PREFIX}/chat`,
  aiChat: `${API_V1_PREFIX}/ai/chat`,
  conversations: `${API_V1_PREFIX}/conversations`,
  tasks: `${API_V1_PREFIX}/tasks`,
  files: `${API_V1_PREFIX}/files`,
  notifications: `${API_V1_PREFIX}/notifications`,
} as const

export const API_WS_PREFIXES = {
  chat: "/ws",
  identity: "/identity-ws",
} as const
