import { Phone, PhoneOff } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

type IncomingCallPopupProps = {
  open: boolean
  callerName: string
  callerAvatar?: string
  onAccept: () => void
  onReject: () => void
}

export default function IncomingCallPopup({
  open,
  callerName,
  callerAvatar,
  onAccept,
  onReject,
}: IncomingCallPopupProps) {
  if (!open) {
    return null
  }

  const fallback = callerName.trim().slice(0, 2).toUpperCase() || "U"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm">
      <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="px-6 pt-6 pb-5 text-center">
          <p className="text-sm font-medium text-slate-500">Cuộc gọi thoại đến</p>
          <Avatar className="mx-auto mt-4 h-20 w-20 ring-4 ring-slate-100">
            <AvatarImage src={callerAvatar} alt={callerName} />
            <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
          </Avatar>
          <p className="mt-3 truncate text-xl font-semibold text-slate-900">{callerName}</p>
          <p className="mt-1 text-sm text-slate-500">Đang gọi cho bạn...</p>
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-slate-200 px-6 py-5">
          <Button
            type="button"
            variant="destructive"
            className="h-11 min-w-32 rounded-full"
            onClick={onReject}
          >
            <PhoneOff className="mr-2 h-4 w-4" />
            Từ chối
          </Button>
          <Button type="button" className="h-11 min-w-32 rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={onAccept}>
            <Phone className="mr-2 h-4 w-4" />
            Nhận
          </Button>
        </div>
      </div>
    </div>
  )
}
