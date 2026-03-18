import {
  Image as ImageIcon,
  PanelRight,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Sticker,
  Video,
} from "lucide-react"
import { useRef } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { messageWindowMessages } from "@/mock/message-data"

export default function ChatWindow() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-muted/20">
      <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarImage
              src="https://avatarngau.sbs/wp-content/uploads/2025/05/avatar-phong-canh-17.jpg"
              alt="Avatar"
            />
            <AvatarFallback>NH</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              NguyÃ¡Â»â€¦n Ã„ÂÃ¡Â»Â©c HÃƒÂ¹ng
            </h2>
            <p className="text-xs text-green-500">
              VÃ¡Â»Â«a mÃ¡Â»â€ºi truy cÃ¡ÂºÂ­p
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="TÃƒÂ¬m kiÃ¡ÂºÂ¿m tin nhÃ¡ÂºÂ¯n"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="CuÃ¡Â»â„¢c gÃ¡Â»Âi thoÃ¡ÂºÂ¡i"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="CuÃ¡Â»â„¢c gÃ¡Â»Âi video"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-primary"
            title="ThÃƒÂ´ng tin hÃ¡Â»â„¢i thoÃ¡ÂºÂ¡i"
          >
            <PanelRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-full">
        <div className="space-y-2 p-4">
          {messageWindowMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.sender === "me" ? "justify-end" : "justify-start"
              )}
            >
              {msg.sender === "them" && (
                <Avatar size="sm" className="mb-1 self-end">
                  <AvatarImage src={msg.avatar} alt="Avatar" />
                  <AvatarFallback>NH</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "flex max-w-[70%] flex-col",
                  msg.sender === "me" ? "items-end" : "items-start"
                )}
              >
                {msg.type === "text" ? (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm",
                      msg.sender === "me"
                        ? "rounded-br-sm bg-primary/10 text-foreground"
                        : "rounded-bl-sm border bg-background text-foreground shadow-xs"
                    )}
                  >
                    {msg.text}
                  </div>
                ) : (
                  <div className="flex w-64 items-center gap-3 rounded-lg border bg-background p-3 shadow-xs">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary p-2 text-sm font-bold text-primary-foreground">
                      W
                    </div>
                    <div className="overflow-hidden">
                      <p className="cursor-pointer truncate text-sm font-medium text-primary hover:underline">
                        {msg.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {msg.fileSize}
                      </p>
                    </div>
                  </div>
                )}
                <span className="mt-1 text-[11px] text-muted-foreground">
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-background p-3">
        <div className="mb-2 flex gap-1">
          <Button variant="ghost" size="icon-sm" title="GÃ¡Â»Â­i sticker">
            <Sticker className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="GÃ¡Â»Â­i Ã¡ÂºÂ£nh">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Ã„ÂÃƒÂ­nh kÃƒÂ¨m file">
            <Paperclip className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-end rounded-lg border bg-background pr-1">
            <Textarea
              ref={textareaRef}
              onInput={handleInput}
              placeholder="NhÃ¡ÂºÂ­p @, tin nhÃ¡ÂºÂ¯n tÃ¡Â»â€ºi NguyÃ¡Â»â€¦n Ã„ÂÃ¡Â»Â©c HÃƒÂ¹ng"
              rows={1}
              className="custom-scrollbar max-h-32 min-h-[38px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Separator orientation="vertical" className="h-5 self-center" />
            <Button
              variant="ghost"
              size="icon-sm"
              className="mb-1 ml-1"
              title="ChÃ¡Â»Ân biÃ¡Â»Æ’u tÃ†Â°Ã¡Â»Â£ng cÃ¡ÂºÂ£m xÃƒÂºc"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          <Button size="icon" className="rounded-full" title="GÃ¡Â»Â­i">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
