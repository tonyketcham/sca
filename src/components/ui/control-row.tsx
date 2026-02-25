import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const controlRowVariants = cva(
  'flex items-center justify-between rounded-md border px-2.5 py-2 transition-colors duration-200 ease-out motion-reduce:transition-none',
  {
    variants: {
      tone: {
        default:
          'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/70',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

export interface ControlRowProps
  extends React.HTMLAttributes<HTMLDivElement>,
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
