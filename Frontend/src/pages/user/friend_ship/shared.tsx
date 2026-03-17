import { MoreHorizontal, SearchX, Users } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import type { AvatarSeed } from "@/pages/user/friend_ship/friendship.data"

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

export function InlineMoreButton() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="rounded-full text-slate-400 hover:text-slate-700"
    >
      <MoreHorizontal className="size-4" />
    </Button>
  )
}

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

export function FriendshipEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia className="flex size-28 items-center justify-center rounded-full bg-blue-50 text-blue-300">
            <SearchX className="size-14" />
          </EmptyMedia>
          <EmptyTitle className="text-2xl text-slate-900">{title}</EmptyTitle>
          <EmptyDescription className="text-base text-slate-500">
            {description}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

export function ZeroDataState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia className="flex size-28 items-center justify-center rounded-full bg-blue-50 text-blue-300">
            <Users className="size-14" />
          </EmptyMedia>
          <EmptyTitle className="text-2xl text-slate-900">{title}</EmptyTitle>
          <EmptyDescription className="text-base text-slate-500">
            {description}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
