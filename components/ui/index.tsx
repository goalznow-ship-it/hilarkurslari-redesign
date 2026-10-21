"use client";

/* ==========================================================================
   Hilal Kursları — vahid UI sistemi
   Button · Input · Select · Badge · Card · Table · Skeleton · EmptyState
   StatCard · Toast  (+ Field, Dialog, Checkbox, RadioGroup, Textarea)
   Bütün səhifələr bu fayldan import edir.
   ========================================================================== */

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import { Check, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Button
   ========================================================================== */

const buttonVariants = {
  primary:
    "bg-brand-700 text-white shadow-xs hover:bg-brand-800 active:bg-brand-900",
  gold: "bg-gold-400 text-brand-900 shadow-xs hover:bg-gold-300 active:bg-gold-500",
  secondary:
    "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:bg-neutral-300",
  outline:
    "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900",
  ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
  danger:
    "bg-danger text-white shadow-xs hover:brightness-95 active:brightness-90",
  link: "text-brand-700 underline-offset-4 hover:underline",
} as const;

const buttonSizes = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-md px-4 text-sm",
  lg: "h-11 gap-2 rounded-md px-5 text-sm",
  icon: "size-9 rounded-md",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-[background-color,color,box-shadow,transform] duration-150 outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );

  // Slot tək uşaq element tələb edir — link variantında spinner render olunmur
  if (asChild) {
    return (
      <Comp data-slot="button" aria-busy={loading || undefined} className={classes} {...props}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Comp>
  );
}

/* ==========================================================================
   Input · Textarea · Label · Field
   ========================================================================== */

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-xs transition-[border-color,box-shadow] outline-none",
        "placeholder:text-neutral-500",
        "focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20",
        "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20",
        "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-xs transition-[border-color,box-shadow] outline-none",
        "placeholder:text-neutral-500",
        "focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20",
        "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20",
        "disabled:cursor-not-allowed disabled:bg-neutral-100",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex select-none items-center gap-2 text-sm font-medium leading-none text-neutral-800 peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

/** Label + kontrol + köməkçi/xəta mesajı */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs font-medium text-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   Select
   ========================================================================== */

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-xs transition-[border-color,box-shadow] outline-none",
        "data-[placeholder]:text-neutral-500",
        "focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20",
        "disabled:cursor-not-allowed disabled:bg-neutral-100",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 text-neutral-500" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-md border border-neutral-200 bg-white text-neutral-900 shadow-md",
          "data-[state=open]:animate-[fade-up_150ms_var(--ease-out-soft)]",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
          <ChevronUp className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
          <ChevronDown className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm text-neutral-800 outline-none",
        "focus:bg-brand-50 focus:text-brand-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/* ==========================================================================
   Checkbox · RadioGroup
   ========================================================================== */

export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4.5 shrink-0 rounded-[4px] border border-neutral-300 bg-white shadow-xs transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
        "data-[state=checked]:border-brand-700 data-[state=checked]:bg-brand-700 data-[state=checked]:text-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

export function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-4.5 shrink-0 rounded-full border border-neutral-300 bg-white text-brand-700 shadow-xs outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
        "data-[state=checked]:border-brand-700",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-2 rounded-full bg-brand-700" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

/* ==========================================================================
   Badge
   ========================================================================== */

const badgeVariants = {
  default: "bg-brand-700 text-white",
  neutral: "bg-neutral-100 text-neutral-700",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  danger: "bg-danger-soft text-danger-fg",
  info: "bg-info-soft text-info-fg",
  gold: "bg-gold-100 text-gold-700",
  outline: "border border-neutral-300 text-neutral-700",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        "[&_svg:not([class*='size-'])]:size-3.5",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ==========================================================================
   Card
   ========================================================================== */

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col rounded-lg border border-neutral-200 bg-white shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1 px-5 py-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base font-semibold text-neutral-900", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-neutral-500", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-5 py-4", className)} {...props} />
  );
}

export function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 px-5 py-4", className)}
      {...props}
    />
  );
}

/* ==========================================================================
   Table
   ========================================================================== */

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("border-b border-neutral-200", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("divide-y divide-neutral-100", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("transition-colors hover:bg-neutral-50", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-5 text-left align-middle text-xs font-medium text-neutral-500 whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-5 py-3.5 align-middle text-neutral-700", className)}
      {...props}
    />
  );
}

/* ==========================================================================
   Skeleton
   ========================================================================== */

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("shimmer rounded-md", className)}
      {...props}
    />
  );
}

/* ==========================================================================
   EmptyState
   ========================================================================== */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-neutral-100">
          <Icon className="size-5 text-neutral-400" />
        </span>
      )}
      <p className="text-sm font-medium text-neutral-800">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ==========================================================================
   StatCard
   ========================================================================== */

export function StatCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  href,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  deltaLabel?: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        {Icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="tnum mt-2 text-xl font-semibold text-neutral-900">{value}</p>
      <div className="mt-1 flex min-h-5 items-center gap-2">
        {typeof delta === "number" && delta !== 0 && (
          <span
            className={cn(
              "tnum inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
              delta > 0
                ? "bg-success-soft text-success-fg"
                : "bg-danger-soft text-danger-fg",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
        {(deltaLabel || hint) && (
          <p className="truncate text-xs text-neutral-500">
            {deltaLabel ?? hint}
          </p>
        )}
      </div>
    </>
  );

  const classes = cn(
    "group flex flex-col rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-xs transition-[box-shadow,border-color] duration-150 hover:border-neutral-300 hover:shadow-sm",
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes} aria-label={`${label}: ${value}`}>
        {body}
      </a>
    );
  }

  return <div className={classes}>{body}</div>;
}

/* ==========================================================================
   Toast
   ========================================================================== */

type ToastTone = "neutral" | "success" | "danger";
type ToastItem = { id: number; title: string; description?: string; tone: ToastTone };

const ToastContext = React.createContext<{
  toast: (t: Omit<ToastItem, "id">) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const seq = React.useRef(0);

  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4500);
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Bildirişlər"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-md",
              item.tone === "success" && "border-success/30 bg-success-soft",
              item.tone === "danger" && "border-danger/30 bg-danger-soft",
              item.tone === "neutral" && "border-neutral-200 bg-white",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-900">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-neutral-600">
                  {item.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => prev.filter((i) => i.id !== item.id))
              }
              className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-700"
              aria-label="Bildirişi bağla"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return { toast: () => undefined };
  }
  return ctx;
}

/* ==========================================================================
   Dialog
   ========================================================================== */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-lg outline-none",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700">
          <X className="size-4" />
          <span className="sr-only">Bağla</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base font-semibold text-neutral-900", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-neutral-500", className)}
      {...props}
    />
  );
}
