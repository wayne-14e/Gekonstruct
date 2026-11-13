import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Chunky, game-like controls: solid primary with a 3px bottom edge that compresses on
 * press. Sizes are deliberately larger than the shadcn defaults (min 40px, CTA 48px) so
 * the product stays usable on touch and reads as a learning product, not a dashboard.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_3px_0_var(--primary-edge)] hover:brightness-110 active:translate-y-[2px] active:shadow-[0_1px_0_var(--primary-edge)]",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:border-input hover:bg-elevated active:translate-y-px",
        outline:
          "border-border bg-transparent text-foreground hover:border-input hover:bg-elevated active:translate-y-px",
        ghost: "text-muted-foreground hover:bg-elevated hover:text-foreground",
        destructive:
          "border-destructive/30 bg-destructive/12 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 rounded-md px-2 text-xs",
        sm: "h-9 gap-1.5 rounded-md px-3 text-[0.8125rem]",
        lg: "h-12 px-6 text-[0.8125rem] font-bold tracking-[0.08em] uppercase",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-9 rounded-md",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
