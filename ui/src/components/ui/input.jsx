import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn('flex min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-semibold', className)} {...props} />
));
Input.displayName = 'Input';
const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('flex min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground disabled:opacity-50', className)} {...props} />
));
Textarea.displayName = 'Textarea';
// A native <select> is the most reliable control for older users and for Indic fonts on phones, so shadcn's
// styling is applied to it directly instead of using a custom popover.
const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn('min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground disabled:opacity-50', className)} {...props}>{children}</select>
));
Select.displayName = 'Select';
export { Input, Textarea, Select };
