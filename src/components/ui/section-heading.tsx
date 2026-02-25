import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const SectionHeading = React.forwardRef<
  HTMLHeadingElement,
  SectionHeadingProps
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-mono text-[10px] font-semibold uppercase tracking-widest text-muted',
      className,
    )}
    {...props}
  />
));
SectionHeading.displayName = 'SectionHeading';

export { SectionHeading };
