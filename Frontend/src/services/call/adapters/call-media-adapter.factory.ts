import type { ConversationType } from "@/types/chat"
import type { CallMediaAdapter } from "@/services/call/adapters/call-media-adapter"
import { P2PCallAdapter } from "@/services/call/adapters/p2p-call.adapter"
import { SFUCallAdapter } from "@/services/call/adapters/sfu-call.adapter"

export const createCallMediaAdapter = (
  conversationType?: ConversationType
): CallMediaAdapter => {
  if (conversationType === "GROUP") {
    return new SFUCallAdapter()
  }
  return new P2PCallAdapter()
}