import { useState } from 'react';
import { Bell, BellOff, KeyRound, Link2, Mic, LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckRow } from '@/components/CheckRow.jsx';
import { LANGUAGES } from '@/lib/copy.js';
import { familyApi, b64ToBytes } from './api.js';

function useStatus() { const [msg, setMsg] = useState(''); return [msg, setMsg]; }

function Push({ f }) {
 const [msg, setMsg] = useStatus();
 const enable = async () => {
  try {
   const { publicKey } = await (await fetch('/api/push-key')).json();
   if (!publicKey) throw Error('The server is not set up for phone alerts.');
   if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw Error('This browser cannot receive alerts while closed.');
   if (await Notification.requestPermission() !== 'granted') throw Error('Notifications were not allowed on this device.');
   const reg = await navigator.serviceWorker.ready;
   const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
   await familyApi('/api/family/push', 'POST', { subscription });
   setMsg('Subscribed. Delivery needs a reachable secure site and your browser’s push service.');
  } catch (e) { setMsg(e.message); }
 };
 const disable = async () => { try { await familyApi('/api/family/push', 'DELETE'); const reg = await navigator.serviceWorker.ready; await (await reg.pushManager.getSubscription())?.unsubscribe(); setMsg('Phone alerts are off.'); } catch (e) { setMsg(e.message); } };
 return (
  <Card>
   <CardHeader><CardTitle>Phone alerts</CardTitle><CardDescription>Get a short warning on this device even when this page is closed. Needs your permission and a secure (https) connection.</CardDescription></CardHeader>
   <CardContent className="space-y-3">
    <Button size="lg" className="w-full" onClick={enable}><Bell />Turn on alerts</Button>
    <Button size="lg" variant="outline" className="w-full" onClick={disable}><BellOff />Turn off alerts</Button>
    <p role="status" className="text-base">{msg || f.data?.pushStatus || 'Alerts are not on.'}</p>
   </CardContent>
  </Card>
 );
}

function CodeWord({ f }) {
 const [word, setWord] = useState('');
 const [msg, setMsg] = useStatus();
 const save = async () => { try { await familyApi('/api/family/codeword', 'POST', { confirmedOffline: true, word }); setWord(''); setMsg('Code word confirmed. The word itself is not stored.'); } catch (e) { setMsg(e.message); } };
 return (
  <Card>
   <CardHeader><CardTitle>Family code word</CardTitle><CardDescription>Pick a private word and tell it to your family member in person or by a call you trust. Guardian only remembers that you set one; the word is discarded.</CardDescription></CardHeader>
   <CardContent className="space-y-3">
    <Label htmlFor="codeword-input">Private code word</Label>
    <Input id="codeword-input" type="password" minLength={6} maxLength={40} autoComplete="off" value={word} onChange={e => setWord(e.target.value)} />
    <Button size="lg" className="w-full" onClick={save}><KeyRound />We shared this word privately</Button>
    <p role="status" className="text-base">{msg || (f.data?.codeWordConfigured ? 'Code word confirmed. The word itself is not stored.' : 'Not set.')}</p>
   </CardContent>
  </Card>
 );
}

function SetupDevice() {
 const [language, setLanguage] = useState('en-IN');
 const [result, setResult] = useState(null);
 const [code, setCode] = useState('');
 const [msg, setMsg] = useStatus();
 const create = async () => { try { setResult(await (await familyApi('/api/family/setup', 'POST', { language })).json()); setMsg(''); } catch (e) { setMsg(e.message); } };
 const approve = async () => { try { await familyApi('/api/family/setup/approve', 'POST', { code: code.trim() }); setCode(''); setMsg('Approved. Their device will finish setting up by itself.'); } catch (e) { setMsg(e.message); } };
 return (
  <Card>
   <CardHeader><CardTitle>Set up their device from here</CardTitle><CardDescription>Choose their language, then send them the link. When they open it, their screen shows a 6-digit code. Type that code here to approve their device.</CardDescription></CardHeader>
   <CardContent className="space-y-3">
    <Label htmlFor="setup-language">Their language</Label>
    <Select id="setup-language" value={language} onChange={e => setLanguage(e.target.value)}>{LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</Select>
    <Button size="lg" className="w-full" onClick={create}><Link2 />Create a 10-minute setup link</Button>
    {result && (
     <div className="space-y-3">
      <Label htmlFor="setup-link">Setup link</Label>
      <Input id="setup-link" readOnly value={result.link} onFocus={e => e.target.select()} />
      <img src={result.qr} alt="QR code for the setup link" className="mx-auto w-56 rounded-lg border-2 bg-white p-2" />
     </div>
    )}
    <Label htmlFor="setup-code">Code shown on their screen</Label>
    <Input id="setup-code" inputMode="numeric" maxLength={6} autoComplete="off" value={code} onChange={e => setCode(e.target.value)} />
    <Button size="lg" variant="outline" className="w-full" onClick={approve}>Approve their device</Button>
    {msg && <p role="status" className="text-base">{msg}</p>}
   </CardContent>
  </Card>
 );
}

function FamiliarVoice() {
 const [consent, setConsent] = useState(false);
 const [file, setFile] = useState(null);
 const [msg, setMsg] = useStatus();
 const enroll = async () => {
  try {
   if (!consent) throw Error('Read and tick the voice consent first.');
   if (!file) throw Error('Choose your own WAV voice sample.');
   await (await familyApi('/api/family/voice', 'POST', file, { 'Content-Type': file.type || 'audio/wav', 'X-Voice-Consent': 'true' })).json();
   setMsg('Voice saved for this temporary session. Your family member must also agree before hearing it.');
  } catch (e) { setMsg(e.message); }
 };
 const revoke = async () => { try { await familyApi('/api/family/voice', 'DELETE'); setMsg('Voice removed.'); } catch (e) { setMsg(e.message); } };
 return (
  <Card>
   <CardHeader><CardTitle>Your voice for their warnings (optional)</CardTitle><CardDescription>Record only your own voice, with your agreement. A clean WAV file of 5 to 30 seconds goes to Gnani to make a voice measurement. Your family member separately chooses whether to hear it.</CardDescription></CardHeader>
   <CardContent className="space-y-3">
    <CheckRow checked={consent} onChange={setConsent}>I agree that this sample is used for Guardian warnings.</CheckRow>
    <Input type="file" accept=".wav,audio/wav" aria-label="Your voice sample (WAV)" onChange={e => setFile(e.target.files?.[0] || null)} />
    <Button size="lg" className="w-full" onClick={enroll}><Mic />Save my voice</Button>
    <Button size="lg" variant="outline" className="w-full" onClick={revoke}>Remove my voice</Button>
    <p role="status" className="text-base">{msg || 'No family voice saved.'}</p>
   </CardContent>
  </Card>
 );
}

export function SettingsTab({ f }) {
 const [confirm, setConfirm] = useState(false);
 return (
  <div className="grid gap-4 md:grid-cols-2 md:items-start lg:gap-6">
   <Push f={f} />
   <CodeWord f={f} />
   <SetupDevice />
   <FamiliarVoice />
   <Card>
    <CardHeader><CardTitle>Your account</CardTitle></CardHeader>
    <CardContent className="space-y-3">
     <Button size="lg" variant="outline" className="w-full" onClick={f.logout}><LogOut />Sign out</Button>
     {!confirm ? (
      <Button size="lg" variant="outline" className="w-full text-destructive" onClick={() => setConfirm(true)}><Trash2 />Delete my family account</Button>
     ) : (
      <div className="space-y-3 rounded-xl border-2 border-destructive p-4">
       <p className="text-base font-semibold">Delete your family account? You will stop receiving warnings.</p>
       <Button size="lg" variant="destructive" className="w-full" onClick={f.deleteAccount}>Yes, delete my account</Button>
       <Button size="lg" variant="outline" className="w-full" onClick={() => setConfirm(false)}>No, keep it</Button>
      </div>
     )}
    </CardContent>
   </Card>
  </div>
 );
}
