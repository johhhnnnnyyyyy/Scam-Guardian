# Progress — current MVP snapshot, 31 October 2026

Scam Guardian is a **working local, synthetic-data MVP**, not a deployed or validated real-call safety product. All 16 items in the owner's brief have a local UI/engine implementation or provider adapter. [Feature audit](docs/FEATURE_AUDIT.md) separates each implemented path from its remaining device or service gate. The three bank, community-radar and telecom ideas remain roadmap items.

## Verified in this workspace

| Layer | Result | Limit |
|---|---|---|
| Local tests | `npm test`: 38/38 passed | Node tests and local HTTP/WebSocket mocks; no browser/device run |
| Detector evaluation | `npm run evaluate`: 50/50 authored scam scripts red; 0/50 authored benign scripts amber/red | Tuned development text, not held-out or acoustic accuracy |
| Regression probes | `node scripts/audit-features.js`: 7/7 passed | Focused negation, wording and entity probes |
| Real Gnani calls on synthetic speech | Prisma v3 REST/realtime and Timbre REST/SSE returned usable responses | One/few clips per path; no acoustic phone capture or p95 latency |
| Local HTTP integration with real provider | Upload → verdict → evidence → reason-only family projection → streamed warning → drill passed | Node transport only; no browser playback or real push |

The provider checks included one direct-TTS English, Hindi and Tamil STT/detector example. The first English REST attempt returned HTTP 504; a retry passed. The server now normalizes Gnani's unknown-length provider WAV headers and splits a validated 60-second upload into ≤29-second REST chunks because the current provider limit is 30 seconds. Detailed single-run observations and repeat commands are in [provider verification](docs/PROVIDER_VERIFICATION.md). These results do not estimate scam-detection accuracy.

Documentation sync verification on 31 October: `npm run evaluate` returned the 50/50 and 0/50 results above; `node scripts/audit-features.js` passed 7/7; `npm test` passed 38/38 when local loopback binding was permitted. The sandboxed first `npm test` attempt could not run three HTTP/WebSocket test files because binding was denied; this was an environment restriction, and the permitted local-only rerun passed. No browser automation was used.

## What is implemented

- Senior UI: consent and language choice, three-state evidence-backed meter, bounded transcript, full-viewport red alert, vibration request, fixed localized spoken warnings, Stop/Clear, evidence and reporting-draft downloads, family-code-word cue and ten-minute cooling-off advice.
- Capture and analysis: companion-device microphone via 1024-byte PCM frames and WebSocket proxy; synthetic text demo; ≤60-second audio upload including ffmpeg conversion; rolling evidence, deterministic tactics/combination rules, optional evidence-validated LLM, session isolation and visible provider failure.
- Family: expiring/revocable reason-only pairing, foreground view and shared volatile timeline, optional Web Push adapter, code-word setup, one-use QR/link setup, and opt-in voice-clone adapter. The synthetic Timbre practice call is implemented.
- Data protection in this MVP: server-side API key, bounded volatile session/profile state, no app-side audio persistence, no transcript/audio in family projection, and explicit export. Provider data handling is a separate review item.

## Still open before public or real-user use

1. Physical second-device/speakerphone tests: noisy Hindi, Hinglish and Tamil WER, false alerts, missed speech, end-to-end warning timing, and split-boundary transcription quality. No same-phone call-capture guarantee.
2. Manual browser/device verification of microphone permissions, warning/drill playback, Web Push delivery, QR setup, vibration, layout, contrast and senior accessibility. Browser automation was not run because the owner prohibited browser control.
3. Voice cloning with a real, consented family sample and verification of quality and revocation. Optional LLM is only mock-tested unless separately configured.
4. HTTPS deployment, durable production identity and account recovery, abuse controls, operational monitoring, provider-retention review, recording/privacy/legal review and current contest-terms check. A localhost family link works only on the same host. No public deployment, family message, real call, demo video or contest submission occurred.
5. Rotate the Gnani key before public use: it was found in `.env.example`, removed from that template and moved to ignored `.env` with mode 0600, but it appeared in tool output. No Git repository exists here, so no history was available to inspect.

The app cannot end cellular calls, block payments, establish caller identity or submit an official complaint. “Safe” means no warning detected in analyzed speech, never a verified caller. See [evaluation protocol](docs/EVALUATION.md) for the remaining measurements and [README](README.md) for run commands.

## Dated history (superseded status)

- **25–26 October:** Initial docs and local vertical slice. At the 26 October audit, 3 features were implemented locally, 7 partial and 6 missing; 23 tests passed and seven detector/entity probes failed. Those counts describe that earlier checkout only.
- **30 October:** Implemented the missing local feature paths, fixed all seven probes, added Web Push, Timbre SSE, compressed uploads, consented voice enrollment, code word, timeline, QR setup, practice call and cooling-off prompt. At that point 35 tests passed. Provider/device paths were still unverified.
- **31 October:** Owner-supplied Gnani key enabled credentialed synthetic checks above; provider WAV and current Prisma v3/30-second contract fixes brought the suite to 38 passing tests. No browser control was used.
