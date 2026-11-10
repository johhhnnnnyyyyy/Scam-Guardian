// Calls made with the family member's own session cookie (separate from the senior's device credential).
export async function familyApi(path, method = 'GET', body, headers = {}) {
 const r = await fetch(path, { method, credentials: 'same-origin', headers: { ...headers, ...(body && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined });
 if (!r.ok) { const d = await r.json().catch(() => ({})); const e = Error(d.error || 'Request failed.'); e.status = r.status; throw e; }
 return r;
}
export const b64ToBytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
