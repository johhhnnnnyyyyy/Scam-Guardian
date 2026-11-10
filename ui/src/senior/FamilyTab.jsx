import { useState } from 'react';
import { Copy, Check, Users, ExternalLink, ShieldOff, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckRow } from '@/components/CheckRow.jsx';
import { Timeline } from '@/components/Timeline.jsx';

export function FamilyTab({ state, a }) {
 const [copied, setCopied] = useState(false);
 const { family, guardians } = state;
 const copy = async () => { try { await navigator.clipboard.writeText(family.link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); } };
 return (
  <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
   <div className="space-y-4">
   <Card>
    <CardHeader>
     <CardTitle className="flex items-center gap-3"><HeartHandshake className="size-6 text-primary" aria-hidden="true" />A trusted person, within reach</CardTitle>
     <CardDescription>Share only the <em>reasons</em> for a warning with a family member. They never receive your audio or what was said.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
     {family.sharing && (
      <p className="flex items-start gap-3 rounded-2xl border-2 border-lamp-safe bg-safe p-4 text-base text-safe-foreground"><Check className="mt-0.5 size-6 shrink-0" aria-hidden="true" /><span><strong>Sharing is on for every call.</strong> Linked family members see a warning and its reasons as it happens. Nothing else is shared.</span></p>
     )}
     {!family.link ? (
      <>
       {!family.sharing && <CheckRow checked={family.consent} onChange={a.setFamilyConsent}>Yes, let my family member see warnings from all my calls, until I switch this off.</CheckRow>}
       {family.sharing && <CheckRow checked={family.consent} onChange={a.setFamilyConsent}>Make a new invite link for another family member.</CheckRow>}
       <Button size="lg" className="w-full" onClick={a.pair} disabled={state.busy}><Users />{family.sharing ? 'Create a new invite link' : 'Create family link'}</Button>
       <p className="text-sm text-muted-foreground">You can do this any time; no call needs to be running.</p>
      </>
     ) : (
      <>
       <Label htmlFor="pair-link">Private invite link. It works for 24 hours, for signing up once.</Label>
       <Input id="pair-link" readOnly value={family.link} onFocus={e => e.target.select()} />
       <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy link'}</Button>
        <Button size="lg" variant="outline" asChild><a href={family.link} target="_blank" rel="noopener"><ExternalLink />Open family view</a></Button>
       </div>
      </>
     )}
     {family.sharing && <Button size="lg" variant="outline" className="w-full" onClick={a.revoke}><ShieldOff />Stop sharing with family</Button>}
     <p role="status" className="text-sm text-muted-foreground">{family.status}</p>
    </CardContent>
   </Card>

   <Card>
    <CardHeader><CardTitle>Family accounts linked to you</CardTitle></CardHeader>
    <CardContent className="space-y-3">
     {guardians.length === 0 ? <p className="text-base text-muted-foreground">No one yet.</p> : (
      <ul className="space-y-3">
       {guardians.map(g => (
        <li key={g.username} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 p-4">
         <div><p className="text-lg font-semibold">{g.username}</p><p className="text-sm text-muted-foreground">Phone alerts: {g.pushStatus}</p></div>
         <Button variant="outline" size="sm" onClick={() => a.removeGuardian(g.username)}>Remove</Button>
        </li>
       ))}
      </ul>
     )}
     <Button variant="ghost" size="sm" onClick={a.refreshGuardians}>Refresh list</Button>
     <CheckRow checked={state.trustedVoice} onChange={a.setTrustedVoice}>Use my family member’s own voice for warnings, if they recorded it.</CheckRow>
    </CardContent>
   </Card>

   </div>
   <Card>
    <CardHeader>
     <CardTitle>Recent warnings</CardTitle>
     <CardDescription>You and your family member see the same list. Marking what each call really was helps tune Guardian; it never hides a warning.</CardDescription>
    </CardHeader>
    <CardContent><Timeline items={state.timeline} onLabel={a.labelOutcome} /></CardContent>
   </Card>
  </div>
 );
}
