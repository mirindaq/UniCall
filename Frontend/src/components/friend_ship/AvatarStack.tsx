import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { AvatarSeed } from "@/types/friendship"

export function AvatarStack({
  avatars,
  extraMembers,
}: {
  avatars: AvatarSeed[]
  extraMembers?: number
}) {
  return (
    <div className="flex w-16 justify-start lg:w-20">
      <AvatarGroup className="shrink-0">
        {avatars.map((avatar, index) => (
          <Avatar key={`${avatar.fallback}-${index}`} size="sm">
            <AvatarFallback
              className={cn("text-[11px] font-semibold", avatar.tone)}
            >
              {avatar.fallback}
            </AvatarFallback>
          </Avatar>
        ))}
        {extraMembers ? (
          <AvatarGroupCount className="text-xs">
            +{extraMembers}
          </AvatarGroupCount>
        ) : null}
      </AvatarGroup>
    </div>
  )
}
