import { TabsList, TabsTrigger } from '@/components/ui/tabs';

// Phones and small tablets: tabs fixed to the bottom edge, within thumb reach, icon plus a word.
export function BottomNav({ items }) {
 return (
  <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
   <TabsList className="mx-auto grid w-full max-w-xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map(({ value, label, Icon }) => (
     <TabsTrigger key={value} value={value} className="min-h-16 flex-col gap-1 rounded-none border-t-[3px] border-transparent text-sm font-bold text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary">
      <Icon className="size-6" aria-hidden="true" />{label}
     </TabsTrigger>
    ))}
   </TabsList>
  </nav>
 );
}

// Tablets in landscape and desktops: the same tabs in the header.
export function TopNav({ items }) {
 return (
  <nav aria-label="Main" className="hidden md:block">
   <TabsList className="gap-1 rounded-full border bg-card p-1">
    {items.map(({ value, label, Icon }) => (
     <TabsTrigger key={value} value={value} className="min-h-11 gap-2 rounded-full px-5 text-base font-bold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
      <Icon className="size-4" aria-hidden="true" />{label}
     </TabsTrigger>
    ))}
   </TabsList>
  </nav>
 );
}
