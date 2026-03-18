import {
  ChevronDown,
  Link as LinkIcon,
  MoreHorizontal,
  Search,
  Share,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { messageStorageLinkGroups } from "@/mock/message-data"

export default function StorageLinks() {
  return (
    <div className="flex flex-col">
      <div className="p-3 pb-2">
        <div className="relative mb-3 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tim kiem link" className="rounded-full pl-9" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="h-8 flex-1 justify-between rounded-full"
          >
            Nguoi gui <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            className="h-8 flex-1 justify-between rounded-full"
          >
            Ngay gui <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {messageStorageLinkGroups.map((group, idx) => (
        <div key={group.title} className="mt-2 px-3 pb-2">
          {idx > 0 && <Separator className="mb-2" />}
          <h4 className="mb-2 text-sm font-medium text-foreground">
            {group.title}
          </h4>
          {group.links.map((link) => (
            <div
              key={link.title}
              className="group flex items-center gap-3 py-2"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                {link.icon === "drive" ? (
                  <div
                    className="h-5 w-5 bg-gradient-to-tr from-green-500 via-yellow-400 to-blue-500"
                    style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
                  ></div>
                ) : (
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{link.title}</p>
                <p className="text-xs text-primary">{link.domain}</p>
              </div>
              {link.hasActions && (
                <div className="hidden items-center gap-1 group-hover:flex">
                  <Button variant="outline" size="icon-xs">
                    <Share className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon-xs">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
