import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createGuardian } from './guardian.js';

export function useGuardian() {
 const guardian = useMemo(() => createGuardian(), []);
 useEffect(() => guardian.init(), [guardian]);
 const state = useSyncExternalStore(guardian.subscribe, guardian.getState, guardian.getState);
 return [state, guardian.actions];
}
