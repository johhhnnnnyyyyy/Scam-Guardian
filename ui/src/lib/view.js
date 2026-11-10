import { copy } from './demos.js';
import { healthCopy, coverageCopy, uncertainCopy } from './copy.js';

// What the big status card shows for a session snapshot. A calm "No warning detected" is only shown when the speech
// service is really listening and the language is covered; otherwise the card says what is not being checked.
export function panelFor(s) {
 const c = copy[s.language];
 let risk = s.risk;
 let title = c[s.risk];
 let message = s.risk === 'careful' && s.uncertain ? (uncertainCopy[s.language] || uncertainCopy['en-IN']) : c[s.risk + 'Text'];
 if (s.risk === 'safe' && s.coverage && s.coverage !== 'supported') {
  const cc = coverageCopy[s.language] || coverageCopy['en-IN'];
  risk = 'idle'; title = cc[s.coverage].title; message = cc[s.coverage].text;
 }
 if (s.mode === 'live' && s.health && !['listening', 'idle'].includes(s.health.stt) && s.risk === 'safe') {
  risk = 'idle'; title = healthCopy[s.health.stt]?.title || 'Not checking right now'; message = healthCopy[s.health.stt]?.text || '';
 }
 return { risk, title, message, lang: s.language };
}

export function engineStatus(s) {
 const gapSeconds = s.gaps?.length ? s.gaps.reduce((a, g) => a + g.endMs - g.startMs, 0) / 1000 : 0;
 return `${s.classifier} · AI classifier: ${s.llmStatus}${s.coverage && s.coverage !== 'supported' ? ` · language coverage: ${s.coverage === 'partial' ? 'partial' : 'not covered'}` : ''}${s.health?.stt && s.mode === 'live' ? ` · speech: ${s.health.stt.replace('_', ' ')}` : ''}${gapSeconds ? ` · ${gapSeconds.toFixed(1)} s of audio not checked` : ''}`;
}
