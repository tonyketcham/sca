import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const insetPanelVariants = cva(
  'rounded-md border bg-surface/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]',
  {
    variants: {
      padding: {
        sm: 'p-2.5',
        md: 'p-3',
      },
      tone: {
        default: 'border-border',
        subtle: 'border-border/50',
      },
    },
    defaultVariants: {
      padding: 'md',
      tone: 'default',
    },
  },
);

export interface InsetPanelProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof insetPanelVariants> {}

const InsetPanel = React.forwardRef<HTMLDivElement, InsetPanelProps>(
  ({ className, padding, tone, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(insetPanelVariants({ padding, tone }), className)}
      {...props}
    />
  ),
);
InsetPanel.displayName = 'InsetPanel';

export { InsetPanel, insetPanelVariants };
