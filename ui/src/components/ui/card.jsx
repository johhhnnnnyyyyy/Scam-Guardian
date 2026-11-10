import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-2xl border bg-card text-card-foreground', className)} {...props} />
));
Card.displayName = 'Card';
const CardHeader = React.forwardRef(({ className, ...props }, ref) => <div ref={ref} className={cn('flex flex-col gap-1.5 p-4 sm:p-5', className)} {...props} />);
CardHeader.displayName = 'CardHeader';
const CardTitle = React.forwardRef(({ className, ...props }, ref) => <h2 ref={ref} className={cn('text-xl font-semibold leading-snug sm:text-[1.375rem]', className)} {...props} />);
CardTitle.displayName = 'CardTitle';
const CardDescription = React.forwardRef(({ className, ...props }, ref) => <p ref={ref} className={cn('text-base leading-relaxed text-muted-foreground', className)} {...props} />);
CardDescription.displayName = 'CardDescription';
const CardContent = React.forwardRef(({ className, ...props }, ref) => <div ref={ref} className={cn('p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />);
CardContent.displayName = 'CardContent';
const CardFooter = React.forwardRef(({ className, ...props }, ref) => <div ref={ref} className={cn('flex items-center p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />);
CardFooter.displayName = 'CardFooter';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
