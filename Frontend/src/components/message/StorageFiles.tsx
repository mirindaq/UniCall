import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { messageStorageFileGroups } from "@/mock/message-data"

export default function StorageFiles() {
  return (
    <div className="flex flex-col">
      <div className="p-3 pb-2">
        <div className="relative mb-3 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tim kiem file" className="rounded-full pl-9" />
        </div>
        <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1 whitespace-nowrap">
          <Button variant="secondary" className="h-8 rounded-full">
            Loai <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="secondary" className="h-8 rounded-full">
            Nguoi gui <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="secondary" className="h-8 rounded-full">
            Ngay gui <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {messageStorageFileGroups.map((group, idx) => (
        <div key={group.title} className="mt-2 px-3 pb-2">
          {idx > 0 && <Separator className="mb-2" />}
          <h4 className="mb-2 text-sm font-medium text-foreground">
            {group.title}
          </h4>
          {group.files.map((file) => (
            <div key={file.name} className="flex items-center gap-3 py-2">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded p-2 text-[10px] font-bold text-white ${file.extensionColor}`}
              >
                {file.extension}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{file.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{file.size}</span>
                  {file.state === "saved" && (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  )}
                  {file.state === "download" && (
                    <Clock className="h-3 w-3 text-blue-500" />
                  )}
                  {file.state === "missing" && (
                    <AlertCircle className="h-3 w-3 text-gray-400" />
                  )}
                  {file.state === "saved" && (
                    <Badge
                      variant="secondary"
                      className="h-4 rounded-sm px-1 text-[10px] text-green-700"
                    >
                      Da co tren may
                    </Badge>
                  )}
                  {file.state === "download" && (
                    <Badge
                      variant="secondary"
                      className="h-4 rounded-sm px-1 text-[10px] text-blue-700"
                    >
                      Tai ve de xem lau dai
                    </Badge>
                  )}
                  {file.state === "missing" && (
                    <Badge
                      variant="outline"
                      className="h-4 rounded-sm px-1 text-[10px]"
                    >
                      File khong ton tai
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
