import { ShieldCheck, ShieldQuestion, TriangleAlert, OctagonAlert, CircleAlert, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

// The one thing an older person must understand at a glance: a large signal lamp (green, turmeric, red), a short
// headline and one calm sentence. Colour is never the only signal: the icon and the words change too. The lamp is
// keyed on the level, so it glows once whenever the level changes (and not at all with reduced motion).
const LOOK = {
 idle: { Icon: ShieldQuestion, lamp: 'text-lamp-idle', icon: 'text-white', box: 'border-border bg-card text-foreground' },
 safe: { Icon: ShieldCheck, lamp: 'text-lamp-safe', icon: 'text-white', box: 'border-[#9cc3a3] bg-card text-foreground' },
 careful: { Icon: TriangleAlert, lamp: 'text-lamp-careful', icon: 'text-foreground', box: 'border-lamp-careful bg-careful text-careful-foreground' },
 danger: { Icon: OctagonAlert, lamp: 'text-lamp-danger', icon: 'text-white', box: 'border-lamp-danger bg-danger text-danger-foreground' },
 error: { Icon: CircleAlert, lamp: 'text-lamp-idle', icon: 'text-white', box: 'border-border bg-card text-foreground' },
};

export function StatusCard({ panel, listening, connection, children, className }) {
 const look = LOOK[panel.risk] || LOOK.idle;
 const Icon = panel.risk === 'safe' && listening ? Mic : look.Icon;
 return (
  <section aria-label="Call safety status" className={cn('rounded-3xl border-2 p-5 sm:p-7', look.box, className)}>
   <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-6 sm:text-left lg:flex-col lg:text-center xl:flex-row xl:text-left">
    <span key={`${panel.risk}-${panel.title}`} aria-hidden="true" className={cn('lamp grid size-24 shrink-0 place-items-center rounded-full sm:size-28', look.lamp, listening && 'listening')}>
     <span className="grid size-full place-items-center rounded-full bg-current"><Icon className={cn('size-11 sm:size-12', look.icon)} strokeWidth={2.25} /></span>
    </span>
    <div className="min-w-0">
     <h1 lang={panel.lang} className="text-[1.75rem] font-semibold leading-tight sm:text-4xl">{panel.title}</h1>
     <p lang={panel.lang} className="mt-2 max-w-[42ch] text-lg leading-relaxed">{panel.message}</p>
    </div>
   </div>
   {connection && <p className="mt-4 text-center text-sm font-bold sm:text-left lg:text-center xl:text-left">{connection}</p>}
   {children}
  </section>
 );
}
