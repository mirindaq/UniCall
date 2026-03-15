const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "")
const ensureLeadingSlash = (value: string) => (value.startsWith("/") ? value : `/${value}`)

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8082/identity-service"
const rawApiPrefix = import.meta.env.VITE_API_PREFIX?.trim() || "/api/v1"

export const API_BASE_URL = stripTrailingSlash(rawBaseUrl)
export const API_PREFIX = ensureLeadingSlash(stripTrailingSlash(rawApiPrefix))

export const API_BASE_WITH_PREFIX = API_BASE_URL.endsWith(API_PREFIX)
  ? API_BASE_URL
  : `${API_BASE_URL}${API_PREFIX}`

export const buildApiUrl = (path: string) => `${API_BASE_WITH_PREFIX}${ensureLeadingSlash(path)}`
