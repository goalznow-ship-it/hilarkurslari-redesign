import { cn } from "@/lib/utils";

export interface CardProps {
  className?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>({
  className: cn(
    "rounded-lg border border-border bg-card p-6 shadow-sm",
    "data-[state=open]:transition-[height,data-[state=closed]:transition-[height",
    className
  ),
  defaultClassName: "",
  ...props,
});
Card.displayName = "Card";

export { Card };