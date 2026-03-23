import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { AvatarSeed } from "@/types/friendship"

export function SeedAvatar({
  fallback,
  tone,
  className,
}: AvatarSeed & { className?: string }) {
  return (
    <Avatar className={className} size="lg">
      <AvatarFallback className={cn("font-semibold", tone)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  )
}
