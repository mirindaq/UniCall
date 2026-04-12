const parseIceUrls = (value?: string): string[] => {
  const fallback = "stun:stun.l.google.com:19302"
  const raw = value?.trim() || fallback
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

const ICE_URLS = parseIceUrls(import.meta.env.VITE_WEBRTC_ICE_URLS)
const TURN_USERNAME = import.meta.env.VITE_WEBRTC_TURN_USERNAME?.trim()
const TURN_CREDENTIAL = import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL?.trim()

export const WEBRTC_ICE_SERVERS: RTCIceServer[] = [
  TURN_USERNAME && TURN_CREDENTIAL
    ? { urls: ICE_URLS, username: TURN_USERNAME, credential: TURN_CREDENTIAL }
    : { urls: ICE_URLS },
]

export const CALL_RING_TIMEOUT_MS = 15_000
