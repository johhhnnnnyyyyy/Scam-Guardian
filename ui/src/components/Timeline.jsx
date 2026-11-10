import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OUTCOMES, outcomeText, riskText } from '@/lib/outcomes.js';

// Reason-only warning history. Marking what a call really was is calibration data and never hides a warning.
function Outcome({ event, onLabel }) {
 const [busy, setBusy] = useState(false);
 const [failed, setFailed] = useState(false);
 if (event.outcome) return <p className="mt-2 text-sm text-muted-foreground">Marked: {outcomeText[event.outcome.label] || event.outcome.label} ({event.outcome.by})</p>;
 if (!onLabel || !event.id) return null;
 const mark = async value => { setBusy(true); setFailed(false); try { await onLabel(event.id, value); } catch { setFailed(true); setBusy(false); } };
 return (
  <div className="mt-3">
   <p className="mb-2 text-sm font-semibold">What was this call?</p>
   <div role="group" aria-label="What was this call?" className="flex flex-wrap gap-2">
    {OUTCOMES.map(([value, title]) => <Button key={value} variant="outline" size="sm" disabled={busy} onClick={() => mark(value)}>{title}</Button>)}
   </div>
   {failed && <p role="alert" className="mt-2 text-sm text-destructive">Could not save. Please try again.</p>}
  </div>
 );
}

export function Timeline({ items, onLabel }) {
 if (!items?.length) return <p className="text-base text-muted-foreground">No warnings yet.</p>;
 return (
  <ol className="space-y-3">
   {items.slice().reverse().map((event, i) => (
    <li key={event.id || i} className="rounded-xl border-2 bg-card p-4">
     <div className="flex flex-wrap items-center gap-2">
      <Badge variant={event.risk === 'danger' ? 'caller' : 'outline'}>{riskText(event)}</Badge>
      <time className="text-sm text-muted-foreground" dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleString()}</time>
     </div>
     {event.reasons?.length > 0 && <p className="mt-2 text-base">{event.reasons.join(', ')}</p>}
     <Outcome event={event} onLabel={onLabel} />
    </li>
   ))}
  </ol>
 );
}
