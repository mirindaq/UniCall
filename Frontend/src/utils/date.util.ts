export function formatDateVi(value?: string | null) {
  if (!value) return "--"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const day = `${date.getDate()}`.padStart(2, "0")
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return "Vừa xong"
  } else if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`
  } else if (diffDays < 7) {
    return `${diffDays} ngày trước`
  } else {
    return formatDateVi(value)
  }
}
