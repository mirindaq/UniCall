export function formatDateVi(value?: string | null) {
  if (!value) return "--"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const day = `${date.getDate()}`.padStart(2, "0")
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
