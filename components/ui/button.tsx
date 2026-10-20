import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>({
  className: cn(
    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-disabled disabled:opacity-50",
    "bg-primary text-primary-foreground hover:bg-primary/90",
    "shadow-sm",
    {
      variant === "default"
        ? ""
        : variant === "secondary"
        ? "bg-secondary text-secondary-hover hover:bg-secondary/80"
        : variant === "destructive"
        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        : variant === "outline"
        ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
        : variant === "ghost"
        ? "hover:bg-accent hover:text-accent-foreground"
        : variant === "link"
        ? "underline-offset-4 hover:underline text-primary/90 collapse"
      : "",
    },
    {
      size === "lg"
        ? "h-10 px-4 py-2"
        : size === "sm"
        ? "h-9 px-3"
        : size === "icon"
        ? "h-10 w-10"
        : "h-10 px-4 py-2",
    },
    className
  ),
  defaultClassName: "",
  ...props,
});
Button.displayName = "Button";

export { Button };