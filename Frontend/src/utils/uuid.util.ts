const FALLBACK_RANDOM_PART_LENGTH = 10

const toHex = (value: number) => value.toString(16).padStart(2, "0")

const generateUuidFromRandomValues = () => {
  const cryptoObject = globalThis.crypto
  if (!cryptoObject || typeof cryptoObject.getRandomValues !== "function") {
    return null
  }

  const bytes = new Uint8Array(16)
  cryptoObject.getRandomValues(bytes)

  // RFC 4122 version 4
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, toHex)
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-")
}

export const generateUuid = () => {
  const randomUuidFn = globalThis.crypto?.randomUUID
  if (typeof randomUuidFn === "function") {
    try {
      return randomUuidFn.call(globalThis.crypto)
    } catch {
      // Fallback below for partially supported browsers.
    }
  }

  const randomValuesUuid = generateUuidFromRandomValues()
  if (randomValuesUuid) {
    return randomValuesUuid
  }

  const randomPart = Math.random()
    .toString(16)
    .slice(2, 2 + FALLBACK_RANDOM_PART_LENGTH)
  return `${Date.now()}-${randomPart}`
}
