// Batch 6: shared timeline rendering with outcome labels. The senior (device credential) and a linked family member
// (session cookie) can mark each warning; labels are calibration data and never change a live alert.
export const OUTCOMES = [['scam', 'It was a scam'], ['not_scam', 'Not a scam'], ['was_family', 'It was family'], ['unsure', 'Not sure']];
const outcomeText = Object.fromEntries(OUTCOMES);
export function renderTimeline(list, items, { label } = {}) {
 if (!items?.length) { const li = document.createElement('li'); li.textContent = 'No warnings yet.'; list.replaceChildren(li); return; }
 list.replaceChildren(...items.slice().reverse().map(event => {
  const li = document.createElement('li');
  const text = document.createElement('span');
  text.textContent = `${new Date(event.at).toLocaleString()} · ${event.risk === 'danger' ? 'Hang up now' : event.uncertain ? 'Be careful (close to a scam pattern)' : 'Be careful'} · ${event.reasons.join(', ')}`;
  li.append(text);
  if (event.outcome) {
   const done = document.createElement('span'); done.className = 'outcome'; done.textContent = ` · Marked: ${outcomeText[event.outcome.label] || event.outcome.label} (${event.outcome.by})`;
   li.append(done);
  } else if (label && event.id) {
   const group = document.createElement('div'); group.className = 'outcome-buttons'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'What was this call?');
   for (const [value, title] of OUTCOMES) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary small-button'; b.textContent = title;
    b.onclick = async () => { group.querySelectorAll('button').forEach(x => { x.disabled = true; }); try { await label(event.id, value); } catch { group.querySelectorAll('button').forEach(x => { x.disabled = false; }); } };
    group.append(b);
   }
   li.append(group);
  }
  return li;
 }));
}
