import { CircleCheck, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

// Is a voice measurement already saved? Guardian never keeps the recording, only a measurement of the voice, so the
// words say exactly that. `saved` is null while unknown (nothing is shown), false when none, or { at } when saved.
export function VoiceStatus({ saved, className }) {
 if (saved === null || saved === undefined) return null;
 const when = saved?.at ? new Date(saved.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
 return (
  <p role="status" data-voice-saved={saved ? 'yes' : 'no'} className={cn('flex items-start gap-3 rounded-xl border-2 p-3 text-base', saved ? 'border-[#2f6f4f] bg-[#e1eedd] text-[#1b4a37]' : 'border-border bg-muted text-foreground', className)}>
   {saved ? <CircleCheck className="mt-0.5 size-6 shrink-0" aria-hidden="true" /> : <CircleDashed className="mt-0.5 size-6 shrink-0" aria-hidden="true" />}
   <span>
    <strong>{saved ? 'Your voice is saved' : 'No voice saved yet'}</strong>
    {saved ? <>{when ? ` (recorded ${when})` : ''}. Guardian keeps only a measurement of your voice, not the recording.</> : <>. Nothing of your voice is stored. No recording is ever kept.</>}
   </span>
  </p>
 );
}
