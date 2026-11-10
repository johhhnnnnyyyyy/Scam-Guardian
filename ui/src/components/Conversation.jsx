import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { speakerLabel } from '@/lib/copy.js';
import { cn } from '@/lib/utils';

// Live, chat-style transcript (decision 24 labels). The caller is on the left, "You" on the right, and anything the
// app is not sure about stays on the left in grey with an honest "Unsure who" / "Probably caller" label: a guess is
// never drawn as if it were certain. Highlighted lines are the ones a warning is based on.
const SIDE = {
 senior: 'ml-auto items-end',
 caller: 'mr-auto items-start',
 unsure: 'mr-auto items-start',
 none: 'mr-auto items-start',
};
const BUBBLE = {
 senior: 'rounded-br-md border-lamp-safe/60 bg-safe text-safe-foreground',
 caller: 'rounded-bl-md border-primary/30 bg-secondary text-foreground',
 unsure: 'rounded-bl-md border-dashed border-input bg-card text-foreground',
 none: 'rounded-bl-md border-border bg-card text-foreground',
};

export function Conversation({ session, listening }) {
 const segments = session?.segments || [];
 const list = useRef(null);
 const flagged = new Set((session?.flags || []).map(f => f.segmentId));
 // Keep the newest line in view while listening, without moving the whole page.
 useEffect(() => { const el = list.current; if (el && listening) el.scrollTop = el.scrollHeight; }, [segments.length, listening]);
 if (!segments.length) return null;
 return (
  <Card className="rounded-3xl">
   <CardHeader className="pb-2">
    <CardTitle className="text-2xl">What was heard</CardTitle>
    <p className="text-sm text-muted-foreground">Caller on the left, you on the right. Grey lines: Guardian is not sure who spoke, and still checks them in full.</p>
   </CardHeader>
   <CardContent>
    <ol ref={list} role="log" aria-label="Conversation so far" className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1 lg:max-h-[32rem]">
     {segments.map(seg => {
      const who = speakerLabel(seg), kind = who?.kind || 'none';
      return (
       <li key={seg.id} className={cn('flex max-w-[85%] flex-col gap-1', SIDE[kind])}>
        <div className="flex items-center gap-2">
         {who && <Badge variant={kind}>{who.text}</Badge>}
         <time className="text-xs text-muted-foreground" dateTime={new Date(seg.at).toISOString()}>{new Date(seg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        </div>
        <p lang={session.language} className={cn('rounded-3xl border-2 px-4 py-2.5 text-lg leading-snug', BUBBLE[kind], flagged.has(seg.id) && 'ring-[3px] ring-lamp-careful ring-offset-2')}>
         {seg.text}
         {flagged.has(seg.id) && <span className="sr-only"> (a warning is based on this)</span>}
        </p>
       </li>
      );
     })}
    </ol>
   </CardContent>
  </Card>
 );
}
