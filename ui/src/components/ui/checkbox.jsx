import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// 24px box: easy to hit, to hit with a shaky hand; the label next to it is also clickable (see CheckRow).
const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root ref={ref} className={cn('peer size-6 shrink-0 rounded-md border-2 border-input bg-card data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:opacity-50', className)} {...props}>
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current"><Check className="size-4" strokeWidth={3} /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';
export { Checkbox };
