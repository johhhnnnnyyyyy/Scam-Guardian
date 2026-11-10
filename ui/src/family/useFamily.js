import { useCallback, useEffect, useRef, useState } from 'react';
import { familyState } from '@/lib/family-state.js';
import { familyApi } from './api.js';

// The link from the senior's device carries a one-time invite in the URL hash. It links an account; it is not a login.
const invite = /^[a-f0-9]{64}$/.test(location.hash.slice(1)) ? location.hash.slice(1) : null;

export function useFamily() {
 const [phase, setPhase] = useState('loading'); // loading | auth | in
 const [authMessage, setAuthMessage] = useState('');
 const [username, setUsername] = useState('');
 const [data, setData] = useState(null);
 const [view, setView] = useState({ risk: 'idle', title: 'Connecting…', message: 'Checking this private link.' });
 const [error, setError] = useState(null);
 const stopped = useRef(true);
 const timer = useRef(null);

 const showAuth = useCallback((message = '') => {
  stopped.current = true; clearTimeout(timer.current); setPhase('auth');
  setAuthMessage(message || (invite ? '' : 'Sign in with your family account. To create one, open the private link from your family member’s device.'));
 }, []);

 const poll = useCallback(async () => {
  if (stopped.current) return;
  try {
   const d = await (await familyApi('/api/family')).json();
   setData(d); setError(null);
   if (!d.sharing) setView(d.standing
    ? { risk: 'idle', title: 'No call right now', message: 'Sharing is on. When your family member uses Guardian on a call, any warning appears here straight away.' }
    : { risk: 'idle', title: 'Not sharing right now', message: 'Your family member has switched sharing off. Ask them to switch it on in their Family tab.' });
   else setView(familyState(d));
  } catch (e) {
   if (e.status === 401) { showAuth('Your sign-in expired. Please sign in again.'); return; }
   setView({ risk: 'error', title: 'Updates are unavailable', message: e.message }); setError(e.message);
   if (e.status === 403) { stopped.current = true; return; }
  }
  if (!stopped.current) timer.current = setTimeout(poll, 2000);
 }, [showAuth]);

 const enter = useCallback(name => {
  setUsername(name); setPhase('in');
  if (invite) history.replaceState(null, '', '/family');
  stopped.current = false; poll();
 }, [poll]);

 useEffect(() => {
  (async () => {
   try {
    const me = await (await familyApi('/api/guardians/me')).json();
    if (invite) { showAuth(`Signed in as ${me.username}. Sign in again to link this invite to your account.`); setUsername(me.username); return; }
    if (!me.linked) { showAuth('Your account is not linked to anyone. Open the private link from your family member’s device.'); return; }
    enter(me.username);
   } catch { showAuth(); }
  })();
  const hide = () => { stopped.current = true; clearTimeout(timer.current); };
  window.addEventListener('pagehide', hide);
  return () => { hide(); window.removeEventListener('pagehide', hide); };
 }, [enter, showAuth]);

 const authenticate = async (path, name, passphrase) => {
  try {
   if (!name.trim() || !passphrase) throw Error('Enter your username and passphrase.');
   const d = await (await familyApi(path, 'POST', { username: name.trim(), passphrase, ...(invite ? { invite } : {}) })).json();
   if (!d.linked) { showAuth('Signed in, but not linked to anyone yet. Open the private link from your family member’s device.'); return; }
   enter(d.username);
  } catch (e) { setAuthMessage(e.message); }
 };

 return {
  phase, authMessage, username, data, view, error, hasInvite: !!invite,
  login: (n, p) => authenticate('/api/guardians/login', n, p),
  register: (n, p) => authenticate('/api/guardians/register', n, p),
  logout: async () => { try { await familyApi('/api/guardians/logout', 'POST'); } catch { /* signed out anyway */ } showAuth('Signed out.'); },
  deleteAccount: async () => { try { await familyApi('/api/guardians/me', 'DELETE'); showAuth('Your family account was deleted.'); } catch (e) { showAuth(e.message || 'Could not delete. Please retry.'); } },
  prefillName: setUsername,
 };
}
