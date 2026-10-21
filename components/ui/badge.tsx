import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants: Record<string, string> = {
  default: "bg-[#4a1c2c] text-white",
  secondary: "bg-slate-100 text-slate-700",
  outline: "border border-slate-300 text-slate-700",
  destructive: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-800",
};

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: keyof typeof badgeVariants }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
