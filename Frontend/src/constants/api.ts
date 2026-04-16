import { API_WS_PREFIXES } from "@/constants/api-prefixes"

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "")
const ensureLeadingSlash = (value: string) => (value.startsWith("/") ? value : `/${value}`)

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8088"

export const API_BASE_URL = stripTrailingSlash(rawBaseUrl)

export const buildApiUrl = (path: string) => `${API_BASE_URL}${ensureLeadingSlash(path)}`

/** STOMP broker qua API Gateway; xác thực bằng HttpOnly cookie. */
export const buildChatStompBrokerUrl = () => {
  const wsBase = API_BASE_URL.replace(/^http/i, (scheme) => (scheme.toLowerCase() === "https" ? "wss" : "ws"))
  return `${wsBase}${API_WS_PREFIXES.chat}`
}
