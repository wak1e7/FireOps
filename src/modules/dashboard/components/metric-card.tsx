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
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">{title}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-4">
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {items?.length ? (
            <ul className="min-w-0 space-y-1 pt-1 text-xs font-semibold leading-4 text-white/58">
              {items.map((item) => (
                <li key={item} className="truncate">{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${colors[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
