import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-primary bg-primary text-primary-foreground',
      outline: 'border-current text-foreground',
      senior: 'border-lamp-safe bg-safe text-safe-foreground',
      caller: 'border-primary bg-secondary text-primary',
      unsure: 'border-input bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});
const Badge = ({ className, variant, ...props }) => <span className={cn(badgeVariants({ variant }), className)} {...props} />;
export { Badge, badgeVariants };
