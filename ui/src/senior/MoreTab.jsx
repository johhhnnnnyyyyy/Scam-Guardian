import { useState } from 'react';
import { Phone, Download, Trash2, FileText, Upload, Play, Square, Lock, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceStatus } from '@/components/VoiceStatus.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function MoreTab({ state, a }) {
 const [scenario, setScenario] = useState('arrest');
 const [text, setText] = useState('');
 const [file, setFile] = useState(null);
 const [erase, setErase] = useState('');
 const canExport = !!state.session?.segments?.length;
 return (
  <div className="grid gap-4 lg:grid-cols-5 lg:items-start lg:gap-6">
   <Card className="border-2 border-destructive bg-danger text-danger-foreground lg:col-span-2">
    <CardContent className="space-y-3 pt-4 sm:pt-5">
     <h2 className="text-xl font-bold">Already sent money?</h2>
     <p className="text-base">Call the national cyber-crime helpline straight away. The sooner you call, the better the chance of stopping the payment.</p>
     <Button size="xl" variant="destructive" asChild><a href="tel:1930"><Phone />Call 1930</a></Button>
     <p className="text-sm">Or report at <a className="font-semibold underline" href="https://cybercrime.gov.in/" target="_blank" rel="noopener noreferrer">cybercrime.gov.in</a>. A suspicious call where no money was lost can be reported on Sanchar Saathi (Chakshu).</p>
    </CardContent>
   </Card>

   <Accordion type="single" collapsible className="space-y-3 lg:col-span-3">
    <AccordionItem value="try">
     <AccordionTrigger>Try it safely</AccordionTrigger>
     <AccordionContent>
      <p className="text-sm text-muted-foreground">These use made-up conversations. They do not use the microphone.</p>
      <div className="space-y-3">
       <Label htmlFor="scenario">Practice conversation</Label>
       <Select id="scenario" value={scenario} onChange={e => setScenario(e.target.value)}>
        <option value="arrest">“Digital arrest” pressure call</option>
        <option value="kyc">Fake bank KYC request</option>
        <option value="benign">A genuine delivery update</option>
       </Select>
       <Button size="lg" className="w-full" onClick={() => a.demo(scenario)} disabled={state.busy}><Play />Play this conversation</Button>
      </div>
      <div className="space-y-3 border-t pt-4">
       <Label htmlFor="practice-call">Practice hanging up</Label>
       <p className="text-sm text-muted-foreground">A made-up call plays. Press End as soon as you hear pressure. Needs the speech service.</p>
       <div id="practice-call" className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" size="lg" onClick={a.drillStart} disabled={state.busy || state.drill.playing}><Play />Play practice call</Button>
        <Button size="lg" variant="destructive" onClick={a.drillHangup} disabled={!state.drill.playing}><Square />End practice call</Button>
       </div>
       <p role="status" className="text-base">{state.drill.result}</p>
      </div>
      <div className="space-y-3 border-t pt-4">
       <Label htmlFor="text-input">Check some text</Label>
       <Textarea id="text-input" value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="For example: I am a police officer. Do not tell your family. Transfer money now." />
       <Button variant="outline" size="lg" className="w-full" onClick={() => a.analyzeText(text)} disabled={state.busy}>Check this text</Button>
      </div>
      <div className="space-y-3 border-t pt-4">
       <Label htmlFor="audio-file">Check a voice note</Label>
       <p className="text-sm text-muted-foreground">Up to 60 seconds. It is processed in the cloud and not saved by this app.</p>
       <Input id="audio-file" type="file" accept=".wav,.mp3,.ogg,.m4a,.webm,.flac,.aac,audio/*" onChange={e => setFile(e.target.files?.[0] || null)} />
       <Button variant="outline" size="lg" className="w-full" onClick={() => a.upload(file)} disabled={state.busy || !file}><Upload />Check this recording</Button>
      </div>
     </AccordionContent>
    </AccordionItem>

    <AccordionItem value="evidence">
     <AccordionTrigger>Keep the details</AccordionTrigger>
     <AccordionContent>
      <p className="text-base">Download a record of this call to keep, or a draft you can review before reporting. Nothing is ever reported automatically.</p>
      <Button variant="outline" size="lg" className="w-full" onClick={a.exportEvidence} disabled={!canExport}><Download />Download call record</Button>
      <Button variant="outline" size="lg" className="w-full" onClick={a.reportDraft} disabled={!canExport}><FileText />Download reporting draft</Button>
      {!canExport && <p className="text-sm text-muted-foreground">Available after a call has been checked.</p>}
     </AccordionContent>
    </AccordionItem>

    <AccordionItem value="data">
     <AccordionTrigger>Your information</AccordionTrigger>
     <AccordionContent>
      <p className="text-base">Guardian keeps your warning list, your settings and a measurement of your voice. It never keeps recordings or what was said.</p>
      <VoiceStatus saved={state.enroll.saved} />
      <Button variant="outline" size="lg" className="w-full" onClick={a.exportData}><Download />Download my information</Button>
      {state.enroll.open === false && <Button variant="outline" size="lg" className="w-full" onClick={a.openEnroll}><Mic />{state.enroll.saved ? 'Record my voice again' : 'Record my voice'}</Button>}
      <div className="space-y-3 rounded-xl border-2 border-destructive p-4">
       <Label htmlFor="erase-confirm">To delete everything, type DELETE</Label>
       <Input id="erase-confirm" value={erase} onChange={e => setErase(e.target.value)} autoComplete="off" />
       <Button variant="destructive" size="lg" className="w-full" onClick={() => { a.eraseData(erase); setErase(''); }}><Trash2 />Delete everything</Button>
       <p className="text-sm">This removes your warnings, settings and voice measurement, and unlinks your family accounts.</p>
      </div>
     </AccordionContent>
    </AccordionItem>

    <AccordionItem value="about">
     <AccordionTrigger>About and privacy</AccordionTrigger>
     <AccordionContent>
      <p className="flex gap-3 text-base"><Lock className="mt-1 size-6 shrink-0" aria-hidden="true" />Nothing you say is saved. What was heard stays in temporary memory for up to 15 minutes and you can clear it at any time.</p>
      <Button variant="outline" size="lg" className="w-full" asChild><a href="/privacy">Read the privacy notice</a></Button>
      <p className="text-sm text-muted-foreground">Research prototype. Use made-up or agreed test speech only. It cannot end a phone call, stop a payment or identify a caller.</p>
      <p className="text-xs text-muted-foreground">{state.providerStatus}</p>
     </AccordionContent>
    </AccordionItem>
   </Accordion>
  </div>
 );
}
