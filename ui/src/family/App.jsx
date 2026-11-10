import { useState } from 'react';
import { Activity, History, Settings, LogIn, UserPlus } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Header, CONTAINER } from '@/components/Header.jsx';
import { BottomNav, TopNav } from '@/components/BottomNav.jsx';
import { StatusCard } from '@/components/StatusCard.jsx';
import { Timeline } from '@/components/Timeline.jsx';
import { useFamily } from './useFamily.js';
import { familyApi } from './api.js';
import { SettingsTab } from './SettingsTab.jsx';

const TABS = [{ value: 'live', label: 'Live', Icon: Activity }, { value: 'history', label: 'History', Icon: History }, { value: 'settings', label: 'Settings', Icon: Settings }];

function SignIn({ f }) {
 const [name, setName] = useState(f.username);
 const [pass, setPass] = useState('');
 return (
  <Card>
   <CardHeader>
    <CardTitle>Family sign-in</CardTitle>
    {f.hasInvite && <CardDescription>You were invited to look out for a family member. Create your own family account, or sign in to an existing one to link it. Your login is separate from theirs.</CardDescription>}
   </CardHeader>
   <CardContent className="space-y-4">
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); f.login(name, pass); setPass(''); }}>
     <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" value={name} onChange={e => setName(e.target.value)} autoComplete="username" maxLength={32} autoCapitalize="none" spellCheck={false} /></div>
     <div className="space-y-2"><Label htmlFor="passphrase">Passphrase · at least 10 characters</Label><Input id="passphrase" type="password" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" maxLength={128} /></div>
     <Button type="submit" size="lg" className="w-full"><LogIn />Sign in</Button>
     {f.hasInvite && <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => { f.register(name, pass); setPass(''); }}><UserPlus />Create family account</Button>}
    </form>
    {f.authMessage && <p role="status" className="text-base">{f.authMessage}</p>}
   </CardContent>
  </Card>
 );
}

function Live({ f }) {
 const d = f.data, reasons = d?.sharing ? d.reasons || [] : [];
 return (
  <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
   <div className="space-y-3">
   <StatusCard panel={{ ...f.view, lang: d?.language }} />
   {d?.sharing && (
    <p className="text-sm text-muted-foreground">
     {d.mode === 'demo' || d.mode === 'text' ? 'Practice conversation. ' : ''}Last speech: {d.updatedAt ? new Date(d.updatedAt).toLocaleTimeString() : '—'}. {d.status === 'stopped' ? 'Listening has stopped.' : ''}
    </p>
   )}
   </div>
   <div className="space-y-4">
   <Card>
    <CardHeader><CardTitle>Reasons for the warning</CardTitle></CardHeader>
    <CardContent className="space-y-3">
     {reasons.length ? <ul className="list-disc space-y-1 pl-6 text-lg">{reasons.map(r => <li key={r}>{r}</li>)}</ul> : <p className="text-base text-muted-foreground">No warning reasons right now.</p>}
     <p className="text-sm text-muted-foreground">You receive the names of the tactics only. No audio, no words from the call, no account details and no secret codes are shared.</p>
    </CardContent>
   </Card>
   <Alert variant="info"><AlertDescription>Contact your family member on a number you already trust. A warning can be wrong: stay calm and help them check.</AlertDescription></Alert>
   </div>
  </div>
 );
}

export function App() {
 const f = useFamily();
 return (
  <Tabs defaultValue="live" className="min-h-screen">
   <Header nav={f.phase === 'in' ? <TopNav items={TABS} /> : null}>{f.phase === 'in' && <span className="truncate text-sm text-muted-foreground"><span className="max-sm:sr-only">Signed in as </span><strong>{f.username}</strong></span>}</Header>
   <main className={`${CONTAINER} pb-24 pt-4 sm:pt-6 md:pb-12`}>
    {f.phase === 'loading' && <p role="status" className="text-lg">Loading…</p>}
    {f.phase === 'auth' && <div className="mx-auto max-w-md"><SignIn f={f} /></div>}
    {f.phase === 'in' && (
     <>
      <TabsContent value="live"><Live f={f} /></TabsContent>
      <TabsContent value="history">
       <Card className="mx-auto max-w-3xl">
        <CardHeader><CardTitle>Previous warnings</CardTitle><CardDescription>Tell Guardian what each call really was. It helps tune warnings and never hides one.</CardDescription></CardHeader>
        <CardContent><Timeline items={f.data?.timeline} onLabel={async (eventId, label) => { await familyApi('/api/family/timeline/label', 'POST', { eventId, label }); }} /></CardContent>
       </Card>
      </TabsContent>
      <TabsContent value="settings"><SettingsTab f={f} /></TabsContent>
     </>
    )}
    <p className="mt-8 text-sm text-muted-foreground">Live status appears only while your family member shares a call. They can remove your account at any time. <a className="underline" href="/privacy">Privacy</a></p>
   </main>
   {f.phase === 'in' && <BottomNav items={TABS} />}
  </Tabs>
 );
}
