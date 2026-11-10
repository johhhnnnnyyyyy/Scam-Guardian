import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;
const AccordionItem = React.forwardRef(({ className, ...props }, ref) => <AccordionPrimitive.Item ref={ref} className={cn('rounded-xl border bg-card', className)} {...props} />);
AccordionItem.displayName = 'AccordionItem';
const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger ref={ref} className={cn('flex min-h-12 flex-1 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-base font-semibold [&[data-state=open]>svg]:rotate-180', className)} {...props}>
      {children}
      <ChevronDown className="size-5 shrink-0 transition-transform" aria-hidden="true" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = 'AccordionTrigger';
const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content ref={ref} className="overflow-hidden" {...props}>
    <div className={cn('space-y-3 px-4 pb-4', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = 'AccordionContent';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
