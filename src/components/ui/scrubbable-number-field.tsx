import * as React from 'react';
import { LabeledField } from './labeled-field';
import { ScrubbableNumberInput } from './scrubbable-number-input';

type ScrubbableNumberFieldProps = Omit<
  React.ComponentPropsWithoutRef<typeof LabeledField>,
  'children'
> &
  Omit<
    React.ComponentPropsWithoutRef<typeof ScrubbableNumberInput>,
    'id' | 'value' | 'onValueChange' | 'placeholder' | 'className'
  > & {
    value: number | null;
    onValueChange: (value: number) => void;
    placeholder?: string;
    showMixedPlaceholder?: boolean;
    inputClassName?: string;
  };

export function ScrubbableNumberField({
  id,
  label,
  className,
  labelClassName,
  value,
  onValueChange,
  placeholder,
  showMixedPlaceholder = true,
  inputClassName,
  ...inputProps
}: ScrubbableNumberFieldProps) {
  const resolvedPlaceholder =
    showMixedPlaceholder && value === null
      ? (placeholder ?? 'Mixed')
      : placeholder;

  return (
    <LabeledField
      id={id}
      label={label}
      className={className}
      labelClassName={labelClassName}
    >
      <ScrubbableNumberInput
        id={id}
        value={value}
        onValueChange={onValueChange}
        className={inputClassName}
        placeholder={resolvedPlaceholder}
        {...inputProps}
      />
    </LabeledField>
  );
}
