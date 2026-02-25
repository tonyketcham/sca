import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { ControlRow, controlRowVariants } from './control-row';
import { Label } from './label';
import { Switch } from './switch';

type SwitchControlRowProps = {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  rowClassName?: string;
  labelClassName?: string;
  switchClassName?: string;
} & VariantProps<typeof controlRowVariants> &
  Omit<
    React.ComponentPropsWithoutRef<typeof Switch>,
    'id' | 'checked' | 'onCheckedChange' | 'className'
  >;

export function SwitchControlRow({
  id,
  label,
  checked,
  onCheckedChange,
  tone,
  rowClassName,
  labelClassName,
  switchClassName,
  ...switchProps
}: SwitchControlRowProps) {
  return (
    <ControlRow tone={tone} className={rowClassName}>
      <Label htmlFor={id} className={cn('text-foreground', labelClassName)}>
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={switchClassName}
        {...switchProps}
      />
    </ControlRow>
  );
}
