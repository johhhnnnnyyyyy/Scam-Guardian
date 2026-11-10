import { channelFeatures, MIN_VOICED_MS } from './acoustics.js';

// Caller-vs-senior attribution for a 1-to-1 call heard on speakerphone by a companion device (owner decision 24).
//
// The costly mistake is calling the SCAMMER "senior": that would weaken a real warning. So:
//  • "senior" needs BOTH acoustic tests to agree (voice matches the enrollment AND the voice is full-band, i.e. live
//    in the room) and no contradiction from the words or the LLM. This is the strict intersection.
//  • "caller" needs the phone-line channel plus a voice that does not match, or one acoustic test plus agreement of
//    the words/LLM. A wideband call (no channel cue) therefore leans on the voice print and the words.
//  • A voice that matches the senior but arrives through the phone line is a possible cloned or replayed voice: it is
//    never "senior"; it is "unsure" and marked spoofSuspect.
//  • Everything else is "unsure", and unsure speech is scored exactly as before attribution existed.
// The words and the LLM give a provisional hint (shown to the senior as "probably the caller") but can never make a
// turn "senior" on their own. Thresholds are uncalibrated starting points; see docs/DECISIONS.md 24.

export const CHANNEL = { phoneDropDb: 12, liveDropDb: 5, edgeRiseDb: 15, typicalNbEdgeDb: 10, typicalWbEdgeDb: 2 }; // dB, uncalibrated
// "phone" needs BOTH weaker highs and a cliff at a phone band edge that is edgeRiseDb steeper than in the senior's own
// enrollment. A senior facing the phone (away from this device) loses highs smoothly, with no cliff, so that alone is
// never phone evidence. Enrollments saved before edges were measured fall back to a typical speech slope.

// Narrowband calls lose 3.6–7.6 kHz; wideband (VoLTE) calls keep that but lose 7.1–7.8 kHz. "live" needs both
// bands present at the level of the senior's own enrolled live voice.
export function cliff(turn, enrolled, which) {
 const edge = turn?.[`${which}EdgeDb`];
 if (edge == null) return false;
 const base = enrolled?.[`${which}EdgeDb`] ?? (which === 'nb' ? CHANNEL.typicalNbEdgeDb : CHANNEL.typicalWbEdgeDb);
 return edge - base >= CHANNEL.edgeRiseDb;
}

export function channelVote(turn, enrolled) {
 if (turn.highBandDb === null || enrolled?.highBandDb == null) return 'unknown';
 const highDrop = enrolled.highBandDb - turn.highBandDb;
 const topDrop = turn.topBandDb != null && enrolled.topBandDb != null ? enrolled.topBandDb - turn.topBandDb : null;
 if ((highDrop >= CHANNEL.phoneDropDb && cliff(turn, enrolled, 'nb')) || (topDrop !== null && topDrop >= CHANNEL.phoneDropDb && cliff(turn, enrolled, 'wb'))) return 'phone';
 if (highDrop <= CHANNEL.liveDropDb && (topDrop === null ? true : topDrop <= CHANNEL.liveDropDb)) return topDrop === null ? 'unknown' : 'live';
 return 'unknown';
}

// Text cue from the engine's dialogue acts: a direct demand at "you" is the caller's; narration of what someone else
// said ("he told me…") or a short reply is the senior's. Capped: a coached senior can repeat a demand.
export function textVote({ act, flags = [] } = {}) {
 if (act === 'demand' && flags.some(f => f.grade !== 'weak')) return 'caller';
 if (act === 'reported' || act === 'narration') return 'senior';
 return 'unknown';
}

// Turn-taking (decision 24): on a 1-to-1 call, the turn after one that was CERTAINLY the senior is probably the
// caller. Only a high-confidence previous turn counts, and it can only ever point at "caller".
const turnVote = previous => previous?.confidence === 'high' && previous.speaker === 'senior' ? 'caller' : 'unknown';

export function decide({ voice = 'unknown', channel = 'unknown', text = 'unknown', llm = 'unknown', previous = null, voicedMs = 0 }) {
 const acoustic = voicedMs >= MIN_VOICED_MS;
 const v = acoustic ? voice : 'unknown', c = acoustic ? channel : 'unknown';
 const words = text !== 'unknown' ? text : llm; // the transcript-based signals share their errors: one vote between them
 const contradicts = side => (text !== 'unknown' && text !== side) || (llm !== 'unknown' && llm !== side);
 const hint = words === 'unknown' ? null : words;
 if (v === 'match' && c === 'phone') return { speaker: 'unsure', confidence: 'low', spoofSuspect: true, hint, basis: 'voice matches the senior but came through the phone line' };
 if (v === 'match' && c === 'live' && !contradicts('senior')) return { speaker: 'senior', confidence: 'high', hint, basis: 'voice match + live channel' };
 if (c === 'phone' && v === 'nonmatch') return { speaker: 'caller', confidence: 'high', hint, basis: 'phone channel + different voice' };
 if (c === 'phone' && v === 'unknown' && words === 'caller') return { speaker: 'caller', confidence: 'medium', hint, basis: 'phone channel + words' };
 if (c === 'phone' && v === 'unknown' && turnVote(previous) === 'caller' && !contradicts('caller')) return { speaker: 'caller', confidence: 'medium', hint, basis: 'phone channel + turn-taking' };
 if (v === 'nonmatch' && c !== 'live' && words === 'caller') return { speaker: 'caller', confidence: 'medium', hint, basis: 'different voice + words' };
 if (v === 'nonmatch' && c !== 'live' && turnVote(previous) === 'caller' && !contradicts('caller')) return { speaker: 'caller', confidence: 'medium', hint, basis: 'different voice + turn-taking' };
 return { speaker: 'unsure', confidence: 'low', hint, basis: acoustic ? 'signals disagree or are inconclusive' : 'turn too short for voice evidence' };
}

// Per-user tuning (batch 5). Guardrails:
//  • Only turns that were already HIGH-confidence teach anything; unsure and medium turns never do.
//  • The senior print moves slowly (TUNE.alpha) and never further than the verifier's maxDrift from the enrollment.
//    Past that, tuning stops and the profile asks for a fresh recording (needsReenroll) instead of drifting.
//  • Tuning never changes thresholds or the decision table: "senior" still needs both acoustic tests to agree, so a
//    scammer who talks for a long time cannot teach the app that their voice is the senior's.
//  • The per-call caller print is built only from high-confidence caller turns, lives only for this call, and can
//    only turn an "unknown" voice result into "nonmatch" (helping a caller label), never into "match".
//  • The learned phone-loudspeaker level (per device) can only relax the "phone" test within a fixed floor.
export const TUNE = { alpha: 0.05, minVoicedMs: 2000, callerAudioMs: 8000, phoneAlpha: 0.2, phoneNearDb: 4, phoneFloorDropDb: 8, callerMarginScore: 3 };

// One attributor per live session. `enrollment` = { print, channel, tuned?, phoneChannel? } on the senior's profile;
// tuning updates it in place so it persists with the profile (DATA_DIR) — measurements only, never audio.
export function createAttributor({ verifier, enrollment, rate }) {
 let callerAudio = [], callerSamples = 0, callerPrint = null, previous = null; // previous = the last turn's label, for turn-taking
 const channelOf = ch => {
  const base = channelVote(ch, enrollment?.channel);
  const learned = enrollment?.phoneChannel;
  if (base !== 'unknown' || !learned || ch.highBandDb === null || enrollment?.channel?.highBandDb == null) return base;
  const drop = enrollment.channel.highBandDb - ch.highBandDb;
  return Math.abs(ch.highBandDb - learned.highBandDb) <= TUNE.phoneNearDb && drop >= TUNE.phoneFloorDropDb && (cliff(ch, enrollment.channel, 'nb') || cliff(ch, enrollment.channel, 'wb')) ? 'phone' : base;
 };
 return {
  async attribute(pcm, { act, flags, llmRole } = {}) {
   const started = performance.now();
   const ch = pcm?.length ? channelFeatures(pcm, rate) : { voicedMs: 0, highBandDb: null };
   const print = enrollment?.tuned || enrollment?.print;
   const voice = enrollment && ch.voicedMs >= MIN_VOICED_MS ? await verifier.score(print, pcm, rate) : { score: null, decision: 'unknown' };
   let voiceDecision = voice.decision, callerMatch = false;
   // The caller print counts only if it fits this turn clearly better than the senior's own print does; otherwise it
   // may have been learned from the wrong audio, and would spread one early mistake to every later line.
   if (voiceDecision === 'unknown' && callerPrint && ch.voicedMs >= MIN_VOICED_MS) { const c = await verifier.score(callerPrint, pcm, rate); if (c.decision === 'match' && (voice.score === null || c.score - voice.score >= TUNE.callerMarginScore)) { voiceDecision = 'nonmatch'; callerMatch = true; } }
   const channel = channelOf(ch), text = textVote({ act, flags });
   const result = decide({ voice: voiceDecision, channel, text, llm: llmRole || 'unknown', previous, voicedMs: ch.voicedMs });
   const before = previous; previous = { speaker: result.speaker, confidence: result.confidence };
   // Learn only from turns that were already certain.
   if (result.confidence === 'high' && ch.voicedMs >= TUNE.minVoicedMs && enrollment) {
    if (result.speaker === 'senior' && !enrollment.needsReenroll) {
     const next = await verifier.adapt(print, pcm, rate, TUNE.alpha);
     if (verifier.drift(enrollment.print, next) <= verifier.maxDrift) { enrollment.tuned = next; enrollment.tunedTurns = (enrollment.tunedTurns || 0) + 1; }
     else enrollment.needsReenroll = true;
    }
    if (result.speaker === 'caller') {
     const prev = enrollment.phoneChannel;
     enrollment.phoneChannel = { highBandDb: prev ? (1 - TUNE.phoneAlpha) * prev.highBandDb + TUNE.phoneAlpha * ch.highBandDb : ch.highBandDb };
     if (callerSamples < (TUNE.callerAudioMs / 1000) * rate) {
      callerAudio.push(Int16Array.from(pcm)); callerSamples += pcm.length;
      const all = new Int16Array(callerSamples); let o = 0; for (const a of callerAudio) { all.set(a, o); o += a.length; }
      callerPrint = (await verifier.enroll(all, rate)) || callerPrint;
     }
    }
   }
   return { ...result, evidence: { voice: voiceDecision, voiceScore: voice.score === null ? null : Math.round(voice.score * 100) / 100, callerMatch, tuned: !!enrollment?.tuned, channel, highBandDb: ch.highBandDb === null ? null : Math.round(ch.highBandDb * 10) / 10, topBandDb: ch.topBandDb == null ? null : Math.round(ch.topBandDb * 10) / 10, voicedMs: Math.round(ch.voicedMs), text, llm: llmRole || 'unknown', previous: before }, ms: Math.round((performance.now() - started) * 10) / 10 };
  },
 };
}
