import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { messageStorageImageGroups } from "@/mock/message-data"

export default function StorageImages() {
  return (
    <div className="flex flex-col">
      <div className="flex gap-2 p-3 pb-0">
        <Button
          variant="secondary"
          className="h-8 flex-1 justify-between rounded-full"
        >
          Người gửi <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          className="h-8 flex-1 justify-between rounded-full"
        >
          Ngày gửi <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {messageStorageImageGroups.map((group, idx) => (
        <div key={group.title} className="mt-4 px-3 pb-2">
          {idx > 0 && <Separator className="mb-4" />}
          <h4 className="mb-2 text-sm font-medium text-foreground">
            {group.title}
          </h4>
          <div className="grid grid-cols-3 gap-1">
            {group.images.length === 0 && (
              <div className="flex aspect-square w-full items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                Không tồn tại
              </div>
            )}
            {group.images.map((image) => (
              <img
                key={image}
                src={image}
                alt="img"
                className="aspect-square w-full rounded object-cover"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
