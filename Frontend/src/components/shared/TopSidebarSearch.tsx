import { Search, UserPlus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TopSidebarSearch({
  value,
  onChange,
  placeholder,
  onAddFriend,
  onCreateGroup,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onAddFriend?: () => void
  onCreateGroup?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "Tìm kiếm"}
          className="border-transparent bg-muted pl-9"
        />
      </div>
      <Button variant="ghost" size="icon-sm" title="Thêm bạn" onClick={onAddFriend}>
        <UserPlus className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Tạo nhóm" onClick={onCreateGroup}>
        <Users className="h-5 w-5" />
      </Button>
    </div>
  )
}
