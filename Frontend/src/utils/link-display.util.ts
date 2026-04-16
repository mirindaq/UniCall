export type MessageTextPart =
  | { type: "text"; value: string }
  | { type: "url"; value: string }

const URL_TOKEN_REGEX = /(https?:\/\/[^\s<>"'`]+)/gi
const TRAILING_PUNCTUATION_REGEX = /[),.;!?]+$/

const normalizeExtractedUrl = (raw: string): string => {
  return raw.trim().replace(TRAILING_PUNCTUATION_REGEX, "")
}

export const isHttpUrl = (value: string): boolean => {
  if (!value) {
    return false
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export const splitTextWithUrls = (text: string): MessageTextPart[] => {
  if (!text) {
    return []
  }

  const parts = text.split(URL_TOKEN_REGEX)
  const result: MessageTextPart[] = []

  for (const part of parts) {
    if (!part) {
      continue
    }

    const normalizedUrl = normalizeExtractedUrl(part)
    if (isHttpUrl(normalizedUrl)) {
      result.push({ type: "url", value: normalizedUrl })
      continue
    }

    result.push({ type: "text", value: part })
  }

  return result
}

export const extractUrlsFromText = (text?: string | null): string[] => {
  if (!text) {
    return []
  }

  const urls = splitTextWithUrls(text)
    .filter((part): part is { type: "url"; value: string } => part.type === "url")
    .map((part) => part.value)

  return Array.from(new Set(urls))
}

export const getDomainFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./i, "")
  } catch {
    return url
  }
}
