import { TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AdminStat } from "@/types/admin"

interface AdminStatCardProps {
  stat: AdminStat
}

export function AdminStatCard({ stat }: AdminStatCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
      <div className="mt-2">
        <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-medium",
            stat.trend === "up" && "text-emerald-600",
            stat.trend === "down" && "text-rose-600",
            stat.trend === "neutral" && "text-slate-500",
          )}
        >
          {stat.trend === "up" ? <TrendingUp className="size-3.5" /> : null}
          {stat.trend === "down" ? <TrendingDown className="size-3.5" /> : null}
          {stat.delta}
        </p>
      </div>
    </section>
  )
}
