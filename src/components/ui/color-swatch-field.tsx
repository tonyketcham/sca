import { Label } from './label';

type ColorSwatchFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

export function ColorSwatchField({
  id,
  label,
  value,
  onValueChange,
}: ColorSwatchFieldProps) {
  return (
    <div className="col-span-2 flex items-center gap-3 space-y-1.5">
      <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border shadow-sm">
        <input
          id={id}
          type="color"
          className="absolute -left-2 -top-2 h-12 w-12 cursor-pointer"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </div>
      <Label htmlFor={id} className="cursor-pointer text-foreground">
        {label}
      </Label>
    </div>
  );
}
