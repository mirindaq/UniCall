const UUID_FILE_PREFIX_REGEX =
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[-_]+(.+)$/i
const UUID_FILE_PREFIX_ANYWHERE_REGEX =
  /[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[-_]+(.+)$/i
const FILE_MESSAGE_REGEX = /^Đã gửi file:\s*(.+)$/i

export const stripUuidPrefixFromFileName = (fileName: string): string => {
  const normalized = fileName.trim()
  const directMatch = normalized.match(UUID_FILE_PREFIX_REGEX)
  if (directMatch?.[1]) {
    return directMatch[1].trim()
  }

  const anywhereMatch = normalized.match(UUID_FILE_PREFIX_ANYWHERE_REGEX)
  if (anywhereMatch?.[1]) {
    return anywhereMatch[1].trim()
  }

  if (normalized.length > 37 && (normalized.charAt(36) === "-" || normalized.charAt(36) === "_")) {
    return normalized.substring(37).trim()
  }

  return normalized
}

export const getOriginalFileNameFromUrl = (fileUrl: string): string => {
  const withoutQuery = (fileUrl || "").split("?")[0].split("#")[0]
  const rawName = withoutQuery.split("/").pop() || "file"

  let decodedName = rawName
  try {
    decodedName = decodeURIComponent(rawName)
  } catch {
    decodedName = rawName
  }

  return stripUuidPrefixFromFileName(decodedName)
}

export const normalizeFileMessageContent = (content?: string | null): string => {
  const safeContent = content ?? ""
  const trimmed = safeContent.trim()
  if (!trimmed) {
    return ""
  }

  const matched = trimmed.match(FILE_MESSAGE_REGEX)
  if (!matched) {
    return safeContent
  }

  return `Đã gửi file: ${stripUuidPrefixFromFileName(matched[1])}`
}

export const extractFileNameFromFileMessage = (content?: string | null): string | null => {
  const safeContent = content ?? ""
  const trimmed = safeContent.trim()
  if (!trimmed) {
    return null
  }

  const matched = trimmed.match(FILE_MESSAGE_REGEX)
  if (!matched) {
    return null
  }

  return stripUuidPrefixFromFileName(matched[1])
}
