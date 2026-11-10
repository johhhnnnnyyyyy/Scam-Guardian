import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Owner decision 8: family accounts, senior profiles and device credentials survive a restart when DATA_DIR is set.
// Live sessions, transcripts and audio are NEVER written to disk. The file holds secrets (passphrase hashes, device
// credential hashes, the senior's voiceprint), so it is written owner-only (0600) and atomically (temp file + rename).
// Without DATA_DIR everything stays in memory, as before.
const SCHEMA = 1;
const replacer = (_k, v) => (v && v.type === 'Buffer' && Array.isArray(v.data) ? { $buf: Buffer.from(v.data).toString('base64') } : v);
const reviver = (_k, v) => (v && typeof v === 'object' && typeof v.$buf === 'string' && Object.keys(v).length === 1 ? Buffer.from(v.$buf, 'base64') : v);

export function createSnapshotStore(dir) {
 if (!dir) return null;
 mkdirSync(dir, { recursive: true, mode: 0o700 });
 const file = join(dir, 'state.json');
 let last = '';
 return {
  file,
  load() {
   if (!existsSync(file)) return null;
   const raw = readFileSync(file, 'utf8');
   const data = JSON.parse(raw, reviver);
   if (data.schema !== SCHEMA) throw new Error(`Unsupported state file schema ${data.schema} in ${file}`);
   last = raw;
   return data;
  },
  // Writes only when the content changed. Returns true when a write happened.
  save(state) {
   const raw = JSON.stringify({ schema: SCHEMA, savedAt: new Date().toISOString(), ...state }, replacer);
   const body = raw.replace(/"savedAt":"[^"]*",/, '');
   if (body === last.replace(/"savedAt":"[^"]*",/, '')) return false;
   const tmp = `${file}.tmp`;
   writeFileSync(tmp, raw, { mode: 0o600 });
   renameSync(tmp, file);
   last = raw;
   return true;
  },
 };
}
