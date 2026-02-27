import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const sidebarShellVariants = cva(
  'flex h-full w-[var(--sidebar-width)] min-w-[var(--sidebar-width)] flex-col bg-surface text-foreground',
  {
    variants: {
      side: {
        left: 'border-r border-border',
        right: 'border-l border-border',
      },
    },
    defaultVariants: {
      side: 'left',
    },
  },
);

export interface SidebarShellProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarShellVariants> {}

const SidebarShell = React.forwardRef<HTMLDivElement, SidebarShellProps>(
  ({ className, side, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(sidebarShellVariants({ side }), className)}
      {...props}
    />
  ),
);
SidebarShell.displayName = 'SidebarShell';

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex h-12 items-center border-b border-border px-4 text-[13px] font-semibold tracking-wide',
      className,
    )}
    {...props}
  />
));
SidebarHeader.displayName = 'SidebarHeader';

export { SidebarShell, SidebarHeader, sidebarShellVariants };
