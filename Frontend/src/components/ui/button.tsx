import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Pill shape, generous padding, Inter bold — spec: border-radius 9999px, 16px v / 32px h
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-semibold transition-all duration-200 ease-luma focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary CTA — solid accent blue, white text; hover: subtle brightness lift
        default:
          "bg-primary text-primary-foreground shadow-sm hover:brightness-110 active:scale-[0.98]",
        // Primary on dark — solid white bg, dark text
        "primary-invert":
          "bg-white text-navy font-bold shadow-sm hover:bg-brand-blue-lighter active:scale-[0.98]",
        // Secondary CTA — transparent with border + subtle hover
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted active:scale-[0.98]",
        // Ghost — for nav/icon buttons
        ghost:
          "text-foreground hover:bg-muted active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-11 px-8 py-4 text-sm",        /* spec: ~16px v, 32px h */
        sm:      "h-9 px-5 py-2 text-xs",
        lg:      "h-12 px-10 py-4 text-base",
        xl:      "h-14 px-12 py-5 text-base",
        icon:    "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
