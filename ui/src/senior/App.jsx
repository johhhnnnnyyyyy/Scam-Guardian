import { useState } from 'react';
import { House, Users, Menu } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertOverlay } from '@/components/ui/alert-overlay';
import { Header, CONTAINER } from '@/components/Header.jsx';
import { BottomNav, TopNav } from '@/components/BottomNav.jsx';
import { LANGUAGES } from '@/lib/copy.js';
import { useGuardian } from './useGuardian.js';
import { HomeTab } from './HomeTab.jsx';
import { FamilyTab } from './FamilyTab.jsx';
import { MoreTab } from './MoreTab.jsx';

const TABS = [{ value: 'home', label: 'Home', Icon: House }, { value: 'family', label: 'Family', Icon: Users }, { value: 'more', label: 'More', Icon: Menu }];

export function App() {
 const [state, guardian] = useGuardian();
 const [tab, setTab] = useState('home');
 // The voice-recording card lives on Home, so asking to record from More must take the person there.
 const a = { ...guardian, openEnroll: () => { guardian.openEnroll(); setTab('home'); window.scrollTo?.({ top: 0 }); } };
 return (
  <Tabs value={tab} onValueChange={setTab} className="min-h-screen">
   <Header nav={<TopNav items={TABS} />}>
    <Select aria-label="Language" value={state.language} onChange={e => a.setLanguage(e.target.value)} disabled={state.busy} className="min-h-10 w-auto max-w-[9.5rem] py-1.5 text-sm sm:max-w-[14rem]">
     {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
    </Select>
   </Header>
   <main className={`${CONTAINER} pb-24 pt-4 sm:pt-6 md:pb-12`}>
    <TabsContent value="home"><HomeTab state={state} a={a} /></TabsContent>
    <TabsContent value="family"><FamilyTab state={state} a={a} /></TabsContent>
    <TabsContent value="more"><MoreTab state={state} a={a} /></TabsContent>
   </main>
   <BottomNav items={TABS} />
   <AlertOverlay open={!!state.urgent} onClose={a.closeUrgent} labelledBy="urgent-title" describedBy="urgent-copy">
    <p className="text-sm font-extrabold uppercase tracking-widest">Guardian warning</p>
    <h2 id="urgent-title" lang={state.urgent?.lang} className="my-3 text-4xl font-extrabold leading-none sm:text-5xl">{state.urgent?.title}</h2>
    <p id="urgent-copy" lang={state.urgent?.lang} className="mx-auto my-3 text-lg leading-snug sm:text-xl">{state.urgent?.text}</p>
    <Button data-autofocus variant="destructive" size="xl" className="mt-5 whitespace-normal" onClick={a.hangup}>I will end the call on my phone</Button>
    <Button variant="outline" size="lg" className="mt-3 w-full" onClick={a.closeUrgent}>Keep viewing details</Button>
   </AlertOverlay>
  </Tabs>
 );
}
