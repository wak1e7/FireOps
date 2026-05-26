import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    className={cn(
      "flex min-h-12 w-full rounded-xl border border-white/18 bg-white px-4 py-3 text-base text-slate-950 caret-fire-red outline-none transition placeholder:text-slate-500 focus:border-fire-red focus:ring-2 focus:ring-fire-red/25 disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
