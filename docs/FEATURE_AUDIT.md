# Full feature audit — 31 October 2026

This is the current implementation audit against the owner's original sixteen features. Synthetic Prisma/Timbre cloud paths have been exercised, but **those checks do not establish browser playback, push delivery, speakerphone accuracy, or real-call safety**. The earlier 26 October audit is superseded. The seven reproduced detector/entity defects are now regression-tested and all seven diagnostic probes pass.

| # | Feature | Current status and evidence | Remaining validation or limit |
|---|---|---|---|
| 1 | Calm three-state meter | Implemented locally: safe/careful/danger, latched escalation, distinct idle/error states and qualified Safe wording | Visual and senior-usability review |
| 2 | Tactic detectors | Implemented locally: authority, threat, urgency, secrecy, payment, credential, remote access, camera, impossible claims and family emergency; exact transcript evidence | No proof of personal-account ownership; independent acoustic false-positive testing |
| 3 | Combination escalation | Implemented locally across recent segments, with stale evidence excluded and monotonic risk | Held-out audio evaluation |
| 4 | Hard rules and entities | Implemented locally: deterministic impossible claims; amounts, UPI-like IDs and numeric identifiers in evidence; seven audit defects fixed | Extracted account/UPI identities remain unverified; ASR error sensitivity |
| 5 | Spoken intervention | Implemented adapters: localized fixed Timbre warning, SSE chunk transport and Web Audio PCM scheduling; REST fallback; explicit failure | Synthetic Gnani REST/SSE calls passed; browser playback, full latency distribution and voice quality remain unverified |
| 6 | Large visual alert | Implemented: fixed full-viewport danger overlay, large action, text labels, vibration request and phone-end guidance | Accessibility/contrast/vibration on actual devices unverified; cannot end cellular call |
| 7 | Code-mixed multilingual | Profile language retained locally, localized warnings/consent/cues, Hindi/Hinglish/Tamil and romanized Tamil rules | One direct-TTS Hindi and Tamil clip each passed through Prisma v3 and detector; noisy speaker-captured WER and native review absent |
| 8 | Instant family push | Implemented: opt-in service worker/Web Push subscription, expiring pair token, reason-only payload, revoke and failure status; foreground polling remains | Real browser push delivery, notification timing, secure remote deployment unverified; disabled without VAPID env |
| 9 | Trusted voice | Implemented adapter: explicit family sample consent, 5–30 s check, Gnani embedding request, separate senior opt-in, fixed labeled message, revoke | Real voice clone inference, quality and consent UX unverified; embedding kept only in volatile profile memory |
| 10 | Family code word | Implemented: family enters a word and confirms direct sharing; app discards the word, remembers configuration and prompts on family-emergency claim | Family must convey word out of band; no caller identity verification |
| 11 | Family timeline | Implemented: bounded reason-only events, same shared event list in family and senior view, volatile profile memory | No durable account or cross-restart history |
| 12 | Remote setup | Implemented: paired family generates 10-minute QR/link; senior confirms language and cloud consent, with voice-language choice where Web Speech is available | Requires an existing pairing and reachable HTTPS origin; device/browser speech recognition unverified |
| 13 | Evidence pack | Implemented: explicit JSON export, timestamps, flagged transcript segments, tactics and unverified entities | Arrival timestamps are not audio offsets; no independent transcription audit |
| 14 | Reporting handoff | Implemented: explicit draft download, 1930 and official portal links, no automatic submission | User must verify details and submit separately |
| 15 | Scam fire-drill | Implemented adapter: explicit synthetic TTS practice call, end-practice control and elapsed-time feedback; real Gnani drill WAV returned | Browser/device playback unverified; not a live call |
| 16 | Cooling-off prompt | Implemented: recent payment + amount activates a ten-minute advisory and trusted-contact prompt | Advisory only; no payment blocking or bank integration |

## Capture and architecture

- Companion-device microphone WebSocket, 16-bit mono PCM frames, provider proxy, 60-second evidence window and optional evidence-grounded LLM are implemented. A synthetic clip produced one real Prisma v3 realtime transcript. Physical companion/same-phone speaker mode remains **unverified**.
- Voice-note upload accepts WAV, MP3, OGG, M4A, WebM, FLAC and AAC, converts compressed files with ffmpeg, checks ≤60 seconds and ≤12 MB, then sends ≤29-second PCM WAV chunks to Prisma REST. Direct WhatsApp share-target integration is not implemented; users can choose/download a note for upload.
- Synthetic text demos and evaluation fixtures work. An acoustic demo rig and real noisy-phone measurements have **not** been run.
- Installable PWA manifest and service worker exist. Background listening is not promised; the service worker handles push only.
- Community scam-script radar, bank/UPI payment friction and telecom call forwarding remain roadmap items from the original brief. No partnership or telecom access exists.

## Verification actually performed

- `npm test`: 38/38 passed after the Prisma v3 and provider-WAV fixes.
- `npm run evaluate`: 50/50 authored scam scripts red; 0/50 authored benign scripts amber/red. These are development fixtures, **not held-out accuracy evidence**.
- `node scripts/audit-features.js`: 7/7 targeted probes pass: benign substring false alarms, negated arrest, countdown, romanized Tamil OTP, decimal amount and email/UPI distinction.
- No browser control or `test:browser` was run, per owner instruction. Static UI control-contract and source checks are used; visual, accessibility and physical-device verification remain unperformed.
- Credentialed synthetic Gnani STT/TTS calls were performed on 31 October 2026; no Web Push delivery, family message, public deployment or real call was performed. See [PROVIDER_VERIFICATION.md](PROVIDER_VERIFICATION.md).

Before any real-user trial or challenge performance claim: run speaker-captured Hindi/Hinglish/Tamil clean/noisy audio slices, WER, warning timing and false alarms; review the consent and recording-law implications; test on seniors' devices with native speakers. A passing synthetic provider test cannot close those external gates.
