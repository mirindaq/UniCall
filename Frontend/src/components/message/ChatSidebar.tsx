import {
  ChevronDown,
  MoreHorizontal,
  Search,
  UserPlus,
  Users,
} from "lucide-react"
import { useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { messageSidebarChats } from "@/mock/message-data"

export default function ChatSidebar() {
  const [tab, setTab] = useState<"all" | "unread">("all")
  const chats =
    tab === "unread"
      ? messageSidebarChats.filter((chat) => chat.unread > 0)
      : messageSidebarChats

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r bg-background">
      <div className="shrink-0 border-b p-4 pb-2">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm"
              className="border-transparent bg-muted pl-9"
            />
          </div>
          <Button variant="ghost" size="icon-sm" title="Thêm bạn">
            <UserPlus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Tạo nhóm">
            <Users className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as "all" | "unread")}
            className="w-full"
          >
            <TabsList variant="line" className="h-9 p-0">
              <TabsTrigger value="all" className="px-2">
                Tất cả
              </TabsTrigger>
              <TabsTrigger value="unread" className="px-2">
                Chưa đọc
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1 text-xs">
            <Button variant="ghost" size="sm" className="h-8">
              Phân loại
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="h-full">
        <div className="space-y-1 p-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted",
                chat.id === 1 && "bg-muted"
              )}
            >
              <Avatar size="lg">
                <AvatarImage src={chat.avatar} alt={chat.name} />
                <AvatarFallback>{chat.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between">
                  <h3 className="truncate text-sm font-medium text-foreground">
                    {chat.name}
                  </h3>
                  <span className="ml-2 text-xs whitespace-nowrap text-muted-foreground">
                    {chat.time}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs text-muted-foreground">
                    {chat.lastMessage}
                  </p>
                  {chat.unread > 0 && (
                    <Badge className="min-w-[18px] justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px]">
                      {chat.unread > 5 ? "5+" : chat.unread}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
