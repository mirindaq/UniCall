import { ThumbsUp } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ReactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY"

export const REACTION_ICONS: Record<ReactionType, { icon: string; color: string; label: string }> =
  {
    LIKE: { icon: "👍", color: "text-blue-500", label: "Thích" },
    LOVE: { icon: "❤️", color: "text-red-500", label: "Yêu thích" },
    HAHA: { icon: "😂", color: "text-yellow-500", label: "Haha" },
    WOW: { icon: "😮", color: "text-orange-500", label: "Wow" },
    SAD: { icon: "😢", color: "text-blue-400", label: "Buồn" },
    ANGRY: { icon: "😠", color: "text-red-600", label: "Phẫn nộ" },
  }

interface ReactionPickerProps {
  currentReaction?: ReactionType
  onReact: (reaction: ReactionType) => void
  onUnreact: () => void
}

export function ReactionPicker({ currentReaction, onReact, onUnreact }: ReactionPickerProps) {
  const [open, setOpen] = useState(false)

  const handleReactionClick = (reaction: ReactionType) => {
    if (currentReaction === reaction) {
      onUnreact()
    } else {
      onReact(reaction)
    }
    setOpen(false)
  }

  const currentReactionInfo = currentReaction ? REACTION_ICONS[currentReaction] : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("flex-1 hover:bg-slate-100", currentReaction && currentReactionInfo?.color)}
        >
          {currentReaction ? (
            <>
              <span className="mr-2 text-lg">{currentReactionInfo?.icon}</span>
              <span className="font-semibold">{currentReactionInfo?.label}</span>
            </>
          ) : (
            <>
              <ThumbsUp className="mr-2 size-4 text-slate-600" />
              <span className="text-slate-600 font-medium">Thích</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-2">
          {(Object.keys(REACTION_ICONS) as ReactionType[]).map((reaction) => (
            <button
              key={reaction}
              onClick={() => handleReactionClick(reaction)}
              className={cn(
                "flex size-10 items-center justify-center rounded-full text-2xl transition-transform hover:scale-125",
                currentReaction === reaction && "scale-110 ring-2 ring-primary ring-offset-2",
              )}
              title={REACTION_ICONS[reaction].label}
            >
              {REACTION_ICONS[reaction].icon}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
