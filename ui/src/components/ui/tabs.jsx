import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef(({ className, ...props }, ref) => <TabsPrimitive.List ref={ref} className={cn('inline-flex items-center', className)} {...props} />);
TabsList.displayName = 'TabsList';
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn('inline-flex cursor-pointer items-center justify-center whitespace-nowrap font-semibold text-muted-foreground transition-colors data-[state=active]:text-primary', className)} {...props} />
));
TabsTrigger.displayName = 'TabsTrigger';
const TabsContent = React.forwardRef(({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn('focus-visible:outline-4', className)} {...props} />);
TabsContent.displayName = 'TabsContent';
export { Tabs, TabsList, TabsTrigger, TabsContent };
