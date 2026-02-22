import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-body tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Luxury variants
        luxury: "bg-primary text-primary-foreground btn-luxury uppercase tracking-[0.2em] hover:shadow-[0_0_30px_hsl(43_74%_49%/0.3)]",
        luxuryOutline: "border border-primary/50 bg-transparent text-primary btn-luxury uppercase tracking-[0.2em] hover:bg-primary hover:text-primary-foreground hover:border-primary",
        luxuryGhost: "bg-transparent text-foreground uppercase tracking-[0.2em] hover:text-primary transition-colors",
        hero: "bg-gradient-to-r from-primary via-primary-glow to-primary text-primary-foreground btn-luxury uppercase tracking-[0.25em] font-semibold shadow-[0_0_40px_hsl(43_74%_49%/0.25)] hover:shadow-[0_0_60px_hsl(43_74%_49%/0.4)] hover:scale-[1.02]",
        heroOutline: "border-2 border-primary/60 bg-transparent text-foreground btn-luxury uppercase tracking-[0.25em] font-semibold hover:bg-primary/10 hover:border-primary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-md px-12 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
