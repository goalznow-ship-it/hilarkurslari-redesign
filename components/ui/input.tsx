import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "outline" | "filled";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>({
  className: cn(
    "flex h-10 w-full rounded-md border border-input bg-background px-3 pr-8 placeholder:text-muted-foreground focus:bg-accent focus-outline-none focused:ring-2 focused:ring-ring focused:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
    {
      variant === "outline"
        ? ""
        : variant === "filled"
        ? "bg-accent/5 text-accent-foreground placeholder:text-muted-foreground"
        : "",
    },
    className
  ),
  defaultClassName: "",
  ...props,
});
Input.displayName = "Input";

export { Input };