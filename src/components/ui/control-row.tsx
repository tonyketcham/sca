import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const controlRowVariants = cva(
  'flex items-center justify-between rounded-md px-2.5 py-1.5 transition-colors duration-300 ease-out-expo motion-reduce:transition-none',
  {
    variants: {
      tone: {
        default:
          'bg-transparent hover:bg-surface/40 border border-transparent hover:border-border/30',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

export interface ControlRowProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof controlRowVariants> {}

const ControlRow = React.forwardRef<HTMLDivElement, ControlRowProps>(
  ({ className, tone, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(controlRowVariants({ tone }), className)}
      {...props}
    />
  ),
);
ControlRow.displayName = 'ControlRow';

export { ControlRow, controlRowVariants };
