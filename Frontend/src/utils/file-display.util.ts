const UUID_FILE_PREFIX_REGEX =
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[-_]+(.+)$/i
const UUID_FILE_PREFIX_ANYWHERE_REGEX =
  /[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[-_]+(.+)$/i
const UUID_AT_START_REGEX =
  /^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(.*)$/i
const LONG_HASH_PREFIX_REGEX =
  /^[0-9a-f]{20,}[-_]+(.+)$/i
const ID_ONLY_FILENAME_REGEX =
  /^[0-9a-f-]{24,}(\.[a-z0-9]{1,8})?$/i
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

  const startsWithUuidMatch = normalized.match(UUID_AT_START_REGEX)
  if (startsWithUuidMatch) {
    const remainder = (startsWithUuidMatch[2] ?? "").replace(/^[-_]+/, "").trim()
    if (remainder) {
      return remainder
    }
  }

  const longHashPrefixMatch = normalized.match(LONG_HASH_PREFIX_REGEX)
  if (longHashPrefixMatch?.[1]) {
    return longHashPrefixMatch[1].trim()
  }

  if (normalized.length > 37 && (normalized.charAt(36) === "-" || normalized.charAt(36) === "_")) {
    return normalized.substring(37).trim()
  }

  if (ID_ONLY_FILENAME_REGEX.test(normalized)) {
    const extensionMatch = normalized.match(/\.[a-z0-9]{1,8}$/i)
    return extensionMatch ? `file${extensionMatch[0]}` : "file"
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

export const shortenFileNameForDisplay = (fileName: string, maxLength = 34): string => {
  const normalized = (fileName || "").trim()
  if (!normalized) {
    return "file"
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  const extensionIndex = normalized.lastIndexOf(".")
  if (extensionIndex > 0 && extensionIndex >= normalized.length - 10) {
    const extension = normalized.slice(extensionIndex)
    const baseLength = Math.max(8, maxLength - extension.length - 3)
    return `${normalized.slice(0, baseLength)}...${extension}`
  }

  return `${normalized.slice(0, maxLength - 3)}...`
}
