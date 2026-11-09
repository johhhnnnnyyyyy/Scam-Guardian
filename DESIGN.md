# Design and architecture

## Product surface
Operate mode: a calm listening companion in a bright home, readable at arm's length. Warm ivory canvas, dark forest text, restrained teal actions, amber/red only for risk. Large human-readable headings and controls; system font for reliable Indic fallback. No decorative charts or numerical scam score. One central listening panel, a clearly labeled transcript beneath, and a quieter family/evidence side panel. Mobile stacks the primary action first. Reduced-motion preference respected.

Status words accompany color. Idle, listening, processing, disconnected, and risk are independent. A transcript is visible only in the senior session. Family receives a short list of tactic names, never exact sensitive snippets. Consent is inline and unchecked. Every demo carries a synthetic label.

## Implementation choice
Node.js ES modules + ws backend, browser ES modules and CSS. Avoid a build chain for a small prototype; node:test checks contracts and source-level UI states. The repository contains a Playwright script, but the owner's prohibition on browser control means it is not run. This design cannot control cellular calls or guarantee background listening.

## Flow
Browser AudioWorklet → signed 16-bit mono PCM, 512 samples/frame → same-origin WebSocket → backend → Prisma. Browser sends actual AudioContext sample rate. Wait for provider connected before capture. Stop closes microphone tracks, worklet, sockets, and audio. Drop no stale audio silently: overload fails visibly. Warning playback temporarily suppresses capture to prevent self-detection, with a visible listening pause.

Prisma final segments → bounded session → 60 s rolling evidence → deterministic rules + optional evidence-validated LLM → monotonic risk within session → browser. Elevated risk stays latched until a new session; reasons for escalation persist. Raw transcript text is rendered as text, never HTML.

Provider adapters are injectable for tests. Missing keys produce explicit unavailable errors. Timbre SSE chunks are used for standard warnings with a REST WAV fallback. Both returned valid synthetic provider responses; browser/device playback is unverified. No application database. Pairing uses an unpredictable capability in the URL fragment; a short-lived family session receives reason-only polling and may opt into background Web Push. Expiry/revoke deletes access. Public hosting requires authentication, TLS and abuse controls beyond this local prototype.

## Data and lifecycle
Session: random ID, createdAt, language, mode/provenance, segments (id, text, at), risk, evidence, family share flag. 15 minute TTL; 200 transcript segments maximum; 2,000 characters per segment. Entire session disappears on deletion or process restart. Export creates a user-owned file; deleting app memory cannot delete downloads or provider records.

Trust boundaries: browser inputs validated; Origin and Host checked; keys only server-side; request sizes bounded; provider timeouts; no arbitrary upload URLs or callback destinations. LLM output cannot select tools, URLs or speech text. Warnings are curated templates.

## Extension implemented 30 October 2026

A bounded volatile profile links sequential sessions by an opaque browser-stored capability. Family pairing remains session-scoped and expires/revokes with that session. The profile retains at most 30 reason-only warning events for up to one hour of inactivity; the senior and paired family both read the same events. A family setup token is one-use and ten-minute, represented as a QR/link. The senior confirms language and cloud consent; browser speech recognition is an optional language-choice input, not a required gate. A local profile does not replace production identity.

Web Push is opt-in at both server configuration and family browser subscription. The service worker shows only a short tactic reason. Notifications contain the expiring family capability in encrypted Web Push payload data to reopen the paired view; production identity and secure hosting are still release gates. Push dispatch does not block transcript/risk delivery. The private family word is accepted during setup, then discarded; only a configured flag remains. The family must share the word directly. Family voice samples and embeddings remain volatile, require separate family and senior consent, and are removed on revoke/session end.

Compressed voice notes are decoded by ffmpeg under byte/time limits to 16 kHz mono PCM WAV before Prisma REST. Timbre SSE audio chunks are forwarded through the server to a Web Audio scheduler, with REST WAV fallback. The full-viewport danger overlay has large phone-end guidance; the app cannot end a cellular call. The acoustic drill uses a fixed synthetic script and reports practice hang-up time. Synthetic Prisma and Timbre provider flows were verified on 31 October 2026; physical/browser delivery remains unverified. REST upload clips longer than 30 seconds are split into ≤29-second PCM chunks to respect the provider limit. Prisma v3 uses explicit language hints and code-mixed formatting for Hindi/Tamil sessions.
