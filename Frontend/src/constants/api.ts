const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "")
const ensureLeadingSlash = (value: string) => (value.startsWith("/") ? value : `/${value}`)

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8088/api-gateway"

export const API_BASE_URL = stripTrailingSlash(rawBaseUrl)

export const buildApiUrl = (path: string) => `${API_BASE_URL}${ensureLeadingSlash(path)}`
