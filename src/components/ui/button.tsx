import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fire-red disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-fire-red text-white shadow-glow hover:bg-red-500",
        secondary: "border border-white/10 bg-white/8 text-white hover:bg-white/12",
        ghost: "text-white/82 hover:bg-white/10",
        danger: "bg-red-950 text-red-100 hover:bg-red-900"
      },
      size: {
        default: "px-4 py-2.5",
        sm: "min-h-9 rounded-lg px-3 py-1.5 text-xs",
        icon: "h-11 w-11 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
