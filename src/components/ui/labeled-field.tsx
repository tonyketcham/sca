import * as React from 'react';
import { cn } from '../../lib/utils';
import { Label } from './label';

type LabeledFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  id: string;
  label: React.ReactNode;
  labelClassName?: string;
};

export function LabeledField({
  id,
  label,
  className,
  labelClassName,
  children,
  ...props
}: LabeledFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      {children}
    </div>
  );
}
