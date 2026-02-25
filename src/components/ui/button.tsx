import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md border text-[12px] font-medium tracking-[0.01em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-45 ease-out-expo',
  {
    variants: {
      variant: {
        default:
          'border-white/5 bg-surface text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)] hover:bg-surfaceHover hover:border-white/10 active:scale-[0.98]',
        secondary:
          'border-transparent bg-surface/50 text-muted hover:bg-surfaceHover hover:text-foreground active:scale-[0.98]',
        outline:
          'border-border bg-transparent text-foreground hover:bg-surface hover:border-borderHover active:scale-[0.98]',
        ghost:
          'border-transparent bg-transparent text-muted hover:text-foreground hover:bg-surface/50 active:scale-[0.98]',
        primary:
          'border-primary/50 bg-primary/20 text-primary hover:bg-primary/30 hover:border-primary/70 active:scale-[0.98]',
      },
      size: {
        default: 'h-7 px-3',
        sm: 'h-6 px-2.5 text-[11px]',
        compact: 'h-6 px-2 text-[11px]',
        lg: 'h-8 px-4 text-xs',
        icon: 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
