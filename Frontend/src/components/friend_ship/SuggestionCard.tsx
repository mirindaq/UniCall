import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { AvatarSeed } from "@/types/friendship"

import { SeedAvatar } from "@/components/friend_ship/SeedAvatar"

export function SuggestionCard({
  avatar,
  name,
  subtitle,
}: {
  avatar: AvatarSeed
  name: string
  subtitle: string
}) {
  return (
    <Card className="gap-4 rounded-2xl border-0 bg-white py-4 shadow-none ring-1 ring-slate-200">
      <CardContent className="space-y-4 px-4">
        <div className="flex items-center gap-3">
          <SeedAvatar {...avatar} />
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold text-slate-900">
              {name}
            </p>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="h-11 rounded-xl bg-slate-100 text-base font-semibold text-slate-700 hover:bg-slate-200"
          >
            Bỏ qua
          </Button>
          <Button className="h-11 rounded-xl bg-slate-200 text-base font-semibold text-slate-800 hover:bg-slate-300">
            Kết bạn
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
