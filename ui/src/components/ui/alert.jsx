import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-xl border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-5 [&>svg~*]:pl-8', {
  variants: {
    variant: {
      default: 'bg-card text-foreground',
      info: 'border-primary/40 bg-secondary text-secondary-foreground',
      careful: 'border-[#c98b1c] bg-careful text-careful-foreground',
      destructive: 'border-destructive bg-danger text-danger-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});
const Alert = React.forwardRef(({ className, variant, ...props }, ref) => <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />);
Alert.displayName = 'Alert';
const AlertTitle = React.forwardRef(({ className, ...props }, ref) => <h3 ref={ref} className={cn('mb-1 text-base font-semibold leading-tight', className)} {...props} />);
AlertTitle.displayName = 'AlertTitle';
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => <div ref={ref} className={cn('text-sm leading-relaxed sm:text-base', className)} {...props} />);
AlertDescription.displayName = 'AlertDescription';
export { Alert, AlertTitle, AlertDescription };
