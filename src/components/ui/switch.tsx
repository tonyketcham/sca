import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      'peer inline-flex h-[16px] w-[28px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-out-expo focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-border shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-[12px] w-[12px] rounded-full bg-foreground shadow-sm ring-0 transition-transform duration-300 ease-out-expo data-[state=checked]:translate-x-[12px] data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
