import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const controlRowVariants = cva(
  'flex items-center justify-between rounded-sm border px-2.5 py-2 transition-colors duration-150 ease-out motion-reduce:transition-none',
  {
    variants: {
      tone: {
        default:
          'border-slate-500/25 bg-slate-900/45 hover:border-slate-400/40 hover:bg-slate-900/70',
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
