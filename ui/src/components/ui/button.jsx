import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// shadcn/ui Button. Normal text sizes, but every tappable size stays at least 40px tall (44px default) for unsteady hands.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border-2 border-input bg-card text-foreground hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent text-foreground',
        link: 'text-primary underline underline-offset-4 hover:text-primary/80 h-auto min-h-10 px-1',
      },
      size: {
        default: 'min-h-11 px-4 py-2 text-sm sm:text-base [&_svg]:size-5',
        sm: 'min-h-10 px-3 py-1.5 text-sm [&_svg]:size-4',
        lg: 'min-h-12 px-5 py-2.5 text-base [&_svg]:size-5',
        xl: 'min-h-16 rounded-2xl px-6 py-3 text-xl w-full [&_svg]:size-7',
        icon: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...(asChild ? {} : { type: props.type || 'button' })} {...props} />;
});
Button.displayName = 'Button';
export { Button, buttonVariants };
