# Progress — current MVP snapshot, 31 October 2026

## Update — 9 November 2026: roadmap batch 3 (language packs, dialogue acts, scam families, pre-rendered warnings)

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `npm test` | 88/88 passed (was 80) |
| Tuning fixtures | `npm run evaluate` | scams red 48/50 (95% CI 86.5–98.9%); benign amber/red 0/50 (0.0–7.1%) |
| Benign twins | `npm run evaluate` | red 0/30 (0.0–11.4%); amber or red 3/30 (3.5–25.6%), down from 8/30 |
| Scam-family set (new, development) | `npm run evaluate` | 59/59 at expected level (93.9–100%); look-alikes 0/24 (0.0–13.8%). Before tuning: 15/59 and 5/24 |
| Regression probes | `node scripts/audit-features.js` | 7/7 passed |

All numbers are on development data the rules were tuned on; there is still no independent held-out set. No browser, device or live provider call was used.

Done: rules moved into data-only language packs; dialogue-act layer with strong/weak evidence; eleven scam families with official contradiction features; authority now requires a claim; cached, pre-renderable warning audio with outage fallback. Fixed along the way: "bataya" (told) and "भेजा" (sent) no longer count as requests; "फोन" no longer reads as a negation; advisories such as "TRAI does not call…" and "UPI PIN is not required…" stay calm. After the safety review: a narrated or reported pretext ("Mom, I had an accident") counts as soon as the same window holds a strong ask; demands aimed at "me/us" after a narration word, Tamil "கொடு" and Hindi "bhejo/डालो" escalate; "aapka" no longer reads as an APK.

## Update — 9 November 2026: roadmap batch 2 (streaming resilience, language registry, request hardening)

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `npm test` | 80/80 passed (was 61) |
| Tuning fixtures | `npm run evaluate` | scams red 48/50 (95% CI 86.5–98.9%); benign amber/red 0/50 (0.0–7.1%) |
| Benign twins (new, development hard negatives) | `npm run evaluate` | red 0/30 (0.0–11.4%); amber or red 8/30 (14.2–44.4%) — mostly narration and reported speech; needs the dialogue-act layer (B-5) |
| Regression probes | `node scripts/audit-features.js` | 7/7 passed |

No browser, device, live Gnani call or real audio was used. Streaming behaviour is tested against a fake upstream socket; every vendor timing assumption is listed as unverified in docs/DECISIONS.md.

Done in this batch:
- **Resilient live listening (F-11, F-12, F-13, B-11):** reconnects after upstream drops (5 attempts, full-jitter backoff), replays up to 5 s of held audio at ≤2× real time, records lost audio as gaps, rotates before Gnani's 15-minute limit with a commit, treats single-utterance errors as recoverable, sets `x-idle-timeout-sec: 900`, finalises the last utterance on Stop. Health states `connecting`/`listening`/`reconnecting`/`stt_degraded`/`paused`/`stt_down`/`stopped`; the senior and family views only show a calm "no warning" while actually listening. Segments are timed from an audio clock; empty segment ids no longer collide. Sessions now expire after 5 idle minutes with a 60-minute cap.
- **Request hardening (F-15, F-16, F-17):** Origin required on all writes and WebSocket upgrades; per-client and per-session token-bucket limits with `Retry-After` and reason codes; a fixed daily cap on paid provider calls; setup links now need a code approved by the family account and issue a separate, hashed, revocable device credential once. The senior's internal profile id is never sent to a client.
- **Languages and evaluation (B-3, B-21, F-19):** a registry of Gnani's ten STT languages (English, Hindi, Tamil supported; seven planned; Odia not offered by Gnani); a word-level tagger that drives coverage (romanised Bengali/Telugu/… and Marathi show partly covered) and never gates rules; Wilson intervals and k/n reporting; group-hash held-out split tooling; 30 benign twins.

Not done (next batches): moving detection rules into data-only language packs; dialogue acts and slot scoring (B-4, B-5); scam-family expansion (B-1); pre-rendered warnings (B-12); an independent, native-reviewed held-out set; live tests of the unverified Gnani behaviours.

## Update — 9 November 2026: roadmap batch 1 (detection fixes + separate family login)

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `npm test` | 61/61 passed (was 38) |
| Detector evaluation | `npm run evaluate` | 48/50 authored scam scripts red; 0/50 benign amber/red. The two ambers are bare Aadhaar/PAN requests, now **Be careful** by design (pending owner decision 5) |
| Regression probes | `node scripts/audit-features.js` | 7/7 passed |

Still tuned development text, not held-out or acoustic accuracy. No browser, device, push or provider call was run for this batch.

Done in this batch:
- **Separate family login.** Family members create their own account (username + scrypt-hashed passphrase) from the senior's invite link, then use an HttpOnly, SameSite=Strict cookie. The invite and the senior's profile token are not logins. Lockout after 5 failures per username and client (20 per username), bounded memory, concurrent-registration safe, same-origin checks on cookie writes. The senior lists and removes linked accounts. Family accounts see reasons only from shared sessions and only while one is shared.
- **Fixed:** an enrolled family voice was stored on the pairing record but read from the profile, so the cloned warning never played. It is now stored on the profile.
- **Detection (roadmap F-01–F-10, F-14, F-20, F-29, B-2, partial B-3/B-11):** secret-code vs identity split; clause-scoped negation that survives unpunctuated speech; missing authority/secrecy/camera vocabulary; spoken amounts; wider family relations; code-mixed noun/verb pairing across scripts; normalisation (nukta, zero-width, Indic digits, spelled-out letters); append-only evidence ledger; clause-level quotes; coverage state (`unknown_language`/`partial`) that latches and never renders as Safe; AI classifier moved off the warning path, budgeted, and unable to decide danger alone; session projection hides the profile token.

Next batches (dependency order from the roadmap): held-out split and benign twins (F-19); STT reconnect, sliding expiry and audio clock (F-11–F-13); Origin on all writes and rate limits (F-15–F-17); health states (rest of B-11); word-level language ID and language packs (B-3, B-21); scam-family coverage (B-1); slot scoring and dialogue acts (B-4, B-5); pre-rendered warnings (B-12). Hindi/Tamil coverage-notice wording needs native review.

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
5. Rotate the Gnani key before public use: it was found in `.env.example`, removed from that template and moved to ignored `.env` with mode 0600, but it appeared in tool output. Rotation is still owner-only and outstanding.

The app cannot end cellular calls, block payments, establish caller identity or submit an official complaint. “Safe” means no warning detected in analyzed speech, never a verified caller. See [evaluation protocol](docs/EVALUATION.md) for the remaining measurements and [README](README.md) for run commands.

## Dated history (superseded status)

- **25–26 October:** Initial docs and local vertical slice. At the 26 October audit, 3 features were implemented locally, 7 partial and 6 missing; 23 tests passed and seven detector/entity probes failed. Those counts describe that earlier checkout only.
- **30 October:** Implemented the missing local feature paths, fixed all seven probes, added Web Push, Timbre SSE, compressed uploads, consented voice enrollment, code word, timeline, QR setup, practice call and cooling-off prompt. At that point 35 tests passed. Provider/device paths were still unverified.
- **31 October:** Owner-supplied Gnani key enabled credentialed synthetic checks above; provider WAV and current Prisma v3/30-second contract fixes brought the suite to 38 passing tests. No browser control was used.
