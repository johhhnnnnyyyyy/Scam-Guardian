import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

// A checkbox whose label is also tappable, so the whole line is an easy target.
export function CheckRow({ checked, onChange, children, disabled }) {
 const id = useId();
 return (
  <div className="flex items-start gap-3">
   <Checkbox id={id} checked={checked} onCheckedChange={v => onChange(v === true)} disabled={disabled} className="mt-0.5" />
   <label htmlFor={id} className="cursor-pointer text-sm leading-snug sm:text-base">{children}</label>
  </div>
 );
}
