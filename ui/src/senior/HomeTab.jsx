import { Mic, Square, Volume2, PhoneOff, Info, X, Clock, KeyRound, Users } from 'lucide-react';
import { StatusCard } from '@/components/StatusCard.jsx';
import { CheckRow } from '@/components/CheckRow.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LANGUAGES, consentCopy, extraCopy } from '@/lib/copy.js';
import { Conversation } from '@/components/Conversation.jsx';
import { VoiceStatus } from '@/components/VoiceStatus.jsx';

const ENROLL_PROMPT = [
 'My name is … and I live in … Today I am setting up Scam Guardian on this device. I will never share my OTP, PIN or password with anyone who calls me, even if they say they are from my bank or the police.',
 'Every morning I like to take a walk and have a cup of tea. After that I read the newspaper, and sometimes I call my family to hear how everyone is doing.',
 'If anything sounds strange on the phone, I will stop, take a breath, and talk to someone I trust before I do anything at all. I am in no hurry, and nobody can make me hurry.',
];

function RemoteSetup({ state, a }) {
 return (
  <Card className="border-2 border-primary">
   <CardHeader>
    <CardTitle>A family member is helping you set up</CardTitle>
    <CardDescription>They chose a language for you. Check it in the menu at the top, tick the box below, then confirm on this device.</CardDescription>
   </CardHeader>
   <CardContent className="space-y-4">
    <Button variant="outline" onClick={a.chooseLanguageByVoice}><Mic />Say my language</Button>
    <Button onClick={a.confirmSetup} disabled={!state.consent || !!state.setup.code}>Confirm language and agreement</Button>
    {state.setup.code && <p className="text-center text-4xl font-bold tracking-[0.3em] tabular-nums" aria-live="polite">{state.setup.code}</p>}
    {state.setup.status && <p role="status" className="text-base text-muted-foreground">{state.setup.status}</p>}
   </CardContent>
  </Card>
 );
}

function EnrollCard({ state, a }) {
 const e = state.enroll;
 return (
  <Card className="border-2 border-primary">
   <CardHeader>
    <CardTitle>Record your voice once</CardTitle>
    <CardDescription>So Guardian can tell your voice from the caller’s. Sit where you usually sit during calls, with this device where it will stay, and read this aloud in your normal voice. Recording lasts 30 seconds, so take your time and pause whenever you like. If you reach the end, just read it again.</CardDescription>
   </CardHeader>
   <CardContent className="space-y-4">
    <VoiceStatus saved={e.saved} />
    <div className="space-y-3 rounded-xl bg-secondary p-4 text-lg leading-relaxed">{ENROLL_PROMPT.map(p => <p key={p}>{p}</p>)}</div>
    <CheckRow checked={e.consent} onChange={a.setEnrollConsent}>I am 18 or older. I agree that Guardian keeps a measurement of my voice (not the recording) to tell my voice from the caller’s. I can delete it any time.</CheckRow>
    <Button size="lg" onClick={a.enrollVoice} disabled={e.busy}><Mic />{e.busy ? 'Recording… keep reading' : 'Record my voice'}</Button>
    {e.busy && <Progress value={Math.round(e.progress * 100)} aria-label="Recording progress" />}
    {e.status && <p role="status" aria-live="polite" className="text-base font-semibold">{e.status}</p>}
   </CardContent>
  </Card>
 );
}

export function HomeTab({ state, a }) {
 const { panel, session, listening, busy, consent } = state;
 const risk = session?.risk;
 const transcript = session?.segments || [];
 const reasons = [...new Set((session?.flags || []).map(f => f.label))];
 const c = extraCopy[session?.language || state.language];
 return (
  <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
   {/* Left: what to know and what to press. Pinned on large screens so it never scrolls away during a call. */}
   <div className="space-y-5 lg:sticky lg:top-24 lg:col-span-5">
    {state.notice && (
     <Alert variant="info" className="flex items-start justify-between gap-3">
      <Info aria-hidden="true" />
      <AlertDescription className="flex-1">{state.notice}</AlertDescription>
      <button type="button" onClick={a.clearNotice} aria-label="Dismiss message" className="-m-2 grid size-10 shrink-0 place-items-center rounded-lg hover:bg-accent"><X className="size-5" /></button>
     </Alert>
    )}
    {state.setup.active && <RemoteSetup state={state} a={a} />}

    <StatusCard panel={panel} listening={listening} connection={state.connection}>
     {risk === 'danger' && <Button variant="destructive" size="lg" className="mt-5 w-full whitespace-normal" onClick={a.hangup}><PhoneOff />I will end the call on my phone</Button>}
     {risk && risk !== 'safe' && <Button variant="outline" size="lg" className="mt-3 w-full" onClick={a.playWarning}><Volume2 />Play spoken warning</Button>}
     {state.voiceStatus && <p className="mt-3 text-sm">{state.voiceStatus}</p>}
    </StatusCard>

    {listening ? (
     <Button size="xl" variant="outline" className="border-[3px]" onClick={a.stop}><Square />Stop listening</Button>
    ) : (
     <div className="space-y-4">
      <div className="space-y-2">
       {!consent && <h2 className="text-xl font-semibold">Before we start</h2>}
       <CheckRow checked={consent} onChange={a.setConsent}><span lang={state.language}>{consentCopy[state.language]}</span></CheckRow>
       <Button variant="link" onClick={a.readConsentAloud}><Volume2 />Read this aloud</Button>
      </div>
      <Button size="xl" onClick={a.listen} disabled={busy || !consent}><Mic />Start listening</Button>
      {!consent && <p className="text-center text-base text-muted-foreground">Tick the box above, then press Start listening.</p>}
     </div>
    )}
   </div>

   {/* Right: the conversation and what it means. */}
   <div className="space-y-5 lg:col-span-7">
    {state.enroll.open && <EnrollCard state={state} a={a} />}

    <Conversation session={session} listening={listening} />
    {state.engineStatus && transcript.length > 0 && <p className="text-xs text-muted-foreground">{state.engineStatus}</p>}

    {session?.askCodeWord && <Alert variant="info"><KeyRound aria-hidden="true" /><AlertTitle>Ask for the family code word</AlertTitle><AlertDescription lang={session.language}>{c.code}</AlertDescription></Alert>}
    {session?.coolingOffUntil && <Alert variant="careful"><Clock aria-hidden="true" /><AlertTitle>Pause before paying</AlertTitle><AlertDescription lang={session.language}>{c.pause} {new Date(session.coolingOffUntil).toLocaleTimeString()}.</AlertDescription></Alert>}

    {reasons.length > 0 && (
     <Accordion type="multiple" className="space-y-3" defaultValue={['why']}>
      <AccordionItem value="why">
       <AccordionTrigger>Why this warning?</AccordionTrigger>
       <AccordionContent>
        <ul className="list-disc space-y-1 pl-6 text-base">{reasons.map(r => <li key={r}>{r}</li>)}</ul>
        <p className="text-sm text-muted-foreground">These are clues in the conversation, not proof of who is calling.</p>
       </AccordionContent>
      </AccordionItem>
     </Accordion>
    )}

    {!session && !state.enroll.open && (
     <section aria-labelledby="how" className="rounded-3xl border border-dashed border-[#bdb6a4] p-5 sm:p-7">
      <h2 id="how" className="text-2xl font-semibold">How it works</h2>
      <ol className="mt-4 space-y-4 text-lg">
       {[<>Put this device next to your phone.</>, <>Press <strong>Start listening</strong>.</>, <>Take the call on speaker.</>, <>If this screen says <strong>Hang up now</strong>, end the call on your phone.</>].map((step, i) => (
        <li key={i} className="flex items-start gap-4"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-serif text-lg font-semibold text-primary-foreground">{i + 1}</span><span className="pt-1">{step}</span></li>
       ))}
      </ol>
      <p className="mt-5 text-base text-muted-foreground">Guardian can miss scams, and it cannot end a call for you. A calm screen never proves the caller is genuine.</p>
     </section>
    )}
    {session && !listening && <Button variant="ghost" onClick={a.clear} disabled={busy} className="w-full">Clear this session</Button>}
   </div>
  </div>
 );
}
