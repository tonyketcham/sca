import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm border text-[11px] font-medium tracking-[0.02em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default:
          'border-blue-300/35 bg-blue-300/15 text-blue-50 hover:border-blue-300/55 hover:bg-blue-300/25',
        secondary:
          'border-slate-500/30 bg-slate-900/80 text-slate-100 hover:border-slate-400/45 hover:bg-slate-800/90',
        outline:
          'border-slate-500/35 bg-transparent text-slate-200 hover:border-slate-400/45 hover:bg-slate-800/70',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2.5 text-[10px]',
        compact: 'h-7 px-2 text-[10px]',
        lg: 'h-9 px-5 text-xs',
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
