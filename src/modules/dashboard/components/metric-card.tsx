import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
  items
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: "red" | "green" | "amber" | "blue";
  items?: string[];
}) {
  const colors = {
    red: "bg-red-500/14 text-red-100",
    green: "bg-emerald-500/14 text-emerald-100",
    amber: "bg-amber-500/14 text-amber-100",
    blue: "bg-sky-500/14 text-sky-100"
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${colors[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {items?.length ? (
        <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-white/58">{items.join(" · ")}</p>
      ) : null}
    </Card>
  );
}
