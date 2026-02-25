import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-7 w-full rounded-md border border-border bg-background/50 px-2 py-1 text-[12px] text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] transition-all duration-300 ease-out-expo placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 hover:border-borderHover',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
