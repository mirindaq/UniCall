import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import { identitySocketService } from "@/services/auth/identity-socket.service"
import { chatSocketService } from "@/services/chat/chat-socket.service"

export function SessionConflictHandler() {
  const { isAuthenticated, clearAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const handledRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      identitySocketService.disconnect()
      handledRef.current = false
      return
    }

    identitySocketService.connect()
    const subscription = identitySocketService.subscribeSecurityEvents((event) => {
      if (event.eventType !== "LOGGED_IN_ELSEWHERE" || handledRef.current) {
        return
      }

      handledRef.current = true
      setOpen(true)
      chatSocketService.disconnect({ force: true })
      identitySocketService.disconnect()
      clearAuthenticated()
      navigate(AUTH_PATH.LOGIN, { replace: true })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [clearAuthenticated, isAuthenticated, navigate])

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent size="sm" className="max-w-md rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Thông báo</AlertDialogTitle>
          <AlertDialogDescription>
            Tài khoản đã được đăng nhập ở nơi khác. Phiên hiện tại đã được đăng xuất.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex! justify-center! sm:justify-center!">
          <AlertDialogAction className="min-w-32!" onClick={() => setOpen(false)}>
            Đã hiểu
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
