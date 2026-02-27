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
    <div className="col-span-2 flex items-center gap-3">
      <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border bg-surface shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_1px_2px_rgba(0,0,0,0.28)] transition-all duration-300 ease-out-expo hover:border-borderHover focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40">
        <input
          id={id}
          type="color"
          className="absolute -left-2 -top-2 h-12 w-12 cursor-pointer appearance-none border-none bg-transparent p-0 focus-visible:outline-none"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </div>
      <Label
        htmlFor={id}
        className="cursor-pointer text-foreground leading-none"
      >
        {label}
      </Label>
    </div>
  );
}
