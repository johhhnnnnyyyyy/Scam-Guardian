# Progress — current MVP snapshot, 31 October 2026

## Update — 10 November 2026: roadmap batch 6 (final MVP build)

- **Blind evaluation:** two independent 120-call sets (en/hi/ta/ml, code-mixed) were written by helpers who never saw the rules. Rules alone on unseen wording: round 1 19/60 scams at Hang up (39/60 at ≥ careful); round 2, after fixes, 20/60 (31/60). With an LLM layer (estimate using a small model and the production prompt): 60/60 at ≥ careful, 0 false Hang up. Full table in docs/EVALUATION.md.
- **Detection:** new categories in all four languages (task/investment, deposit-to-unlock, loan-app and sextortion threats, code paraphrases, UPI PIN to receive), fewer single-signal false alarms, and fixes for romanised negation.
- **Product:** outcome labels for senior and family, data export and erasure, consent records, 18+ enrollment confirmation, privacy notice, family account deletion, Malayalam drill.
- **Operations:** security headers, privacy-safe metrics, graceful shutdown, Dockerfile with health check and non-root user, optional neural voice print (sherpa-onnx).
- **Docs:** README rewritten; (removed test document) (what's left: device, audio, accessibility, native-language and legal checks); docs/COMPLIANCE.md (DPDP / IT Act checklist).
- **Evidence:** 106/106 tests pass. Development sets unchanged (48/50 tuning, 59/59 families, 14/14 Malayalam; 0 benign red).

## Update — 9 November 2026: roadmap batch 5 (MVP languages, Malayalam, weighted scoring, per-user tuning)

- **MVP languages:** English, Hindi, Tamil and Malayalam, plus Hinglish, Tanglish and Manglish. Malayalam is now supported: a detection pack (Malayalam script and Manglish), chillu and digit normalisation, a demo, UI copy and warning text (all needing native review), and a 24-case development set: 14/14 scams at the expected level and 0/10 look-alikes alarmed (before tuning, 11/14 and 3/10).
- **Weighted scoring with an uncertain tier:** "Be careful" close to Hang up now says so, to both the senior and the family.
- **Per-user tuning** of caller-vs-senior attribution, with guardrails: certain turns only, capped drift, and never a looser rule for "You".
- **Pack data:** amounts, payment verbs, remote-tool names and "never calls" bodies moved out of the engine.
- **Evidence:** 101/101 tests pass. Text evaluation for English, Hindi and Tamil is unchanged (48/50 tuning scams red, 0/50 benign; 59/59 family cases, 0/24 look-alikes).

## Update — 9 November 2026: roadmap batch 4 (caller-vs-senior attribution, compulsory LLM, persistence)

- **Caller vs senior (decision 24).** Senior voice enrollment is now compulsory before live listening (about 12 s, read aloud; only a voice print and a channel level are kept). Each transcript turn is attributed from its own audio using two physical tests: phone-line channel (narrowband and VoLTE band edges) and voice match to the enrollment. Words and the LLM act as a capped third vote. A turn is labelled "senior" only when both acoustic tests agree; a senior-sounding voice that came through the phone is a suspected clone and is never labelled senior; everything else is "unsure", which is scored exactly as before. The senior's own words become weak evidence, so "No, I won't tell you the OTP" no longer adds to the warning. The browser now captures raw audio (no noise suppression or gain control) and shows You / Caller / Unsure labels.
- **LLM compulsory (decision 25).** The server will not start without an LLM unless `ALLOW_RULES_ONLY=1`. The LLM proposes roles and keeps a rolling call summary; it can confirm "caller" or veto "senior", never create "senior".
- **Decisions 1, 8, 11, 21:** "No warning detected" label; `DATA_DIR` file persistence for accounts, profiles and devices (never sessions or audio); env-configurable limits; bare institution names count as weak evidence.
- **Evidence:** 95/95 tests pass. Text evaluation unchanged (48/50 tuning scams red, 0/50 benign; 59/59 family cases, 0/24 look-alikes). Attribution is verified only on **synthetic** signals (under 200 ms per turn). Thresholds are uncalibrated and no real-audio accuracy is claimed; see docs/DECISIONS.md batch 4 notes and reports/Caller vs senior speaker attribution.md for the measurement plan.

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

Scam Guardian is a **working local, synthetic-data MVP**, not a deployed or validated real-call safety product. All 16 items in the owner's brief have a local UI/engine implementation or provider adapter. Feature audit separates each implemented path from its remaining device or service gate. The three bank, community-radar and telecom ideas remain roadmap items.

## Verified in this workspace

| Layer | Result | Limit |
|---|---|---|
| Local tests | `npm test`: 38/38 passed | Node tests and local HTTP/WebSocket mocks; no browser/device run |
| Detector evaluation | `npm run evaluate`: 50/50 authored scam scripts red; 0/50 authored benign scripts amber/red | Tuned development text, not held-out or acoustic accuracy |
| Regression probes | `node scripts/audit-features.js`: 7/7 passed | Focused negation, wording and entity probes |
| Real Gnani calls on synthetic speech | Prisma v3 REST/realtime and Timbre REST/SSE returned usable responses | One/few clips per path; no acoustic phone capture or p95 latency |
| Local HTTP integration with real provider | Upload → verdict → evidence → reason-only family projection → streamed warning → drill passed | Node transport only; no browser playback or real push |

The provider checks included one direct-TTS English, Hindi and Tamil STT/detector example. The first English REST attempt returned HTTP 504; a retry passed. The server now normalizes Gnani's unknown-length provider WAV headers and splits a validated 60-second upload into ≤29-second REST chunks because the current provider limit is 30 seconds. Detailed single-run observations and repeat commands are in provider verification. These results do not estimate scam-detection accuracy.

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

The app cannot end cellular calls, block payments, establish caller identity or submit an official complaint. “No warning detected” means no warning in analyzed speech, never a verified caller. See [evaluation protocol](docs/EVALUATION.md) for the remaining measurements and [README](README.md) for run commands.

## Dated history (superseded status)

- **25–26 October:** Initial docs and local vertical slice. At the 26 October audit, 3 features were implemented locally, 7 partial and 6 missing; 23 tests passed and seven detector/entity probes failed. Those counts describe that earlier checkout only.
- **30 October:** Implemented the missing local feature paths, fixed all seven probes, added Web Push, Timbre SSE, compressed uploads, consented voice enrollment, code word, timeline, QR setup, practice call and cooling-off prompt. At that point 35 tests passed. Provider/device paths were still unverified.
- **31 October:** Owner-supplied Gnani key enabled credentialed synthetic checks above; provider WAV and current Prisma v3/30-second contract fixes brought the suite to 38 passing tests. No browser control was used.
- **10 November (batch 7):** Rebuilt the interface with React + Tailwind + shadcn/ui for older users (see docs/DECISIONS.md, Batch 7). Server and APIs unchanged; 119 tests pass; not yet seen on a real screen. Interface text is English only (pending decision 29).
- **10 November (batch 7, later):** Normal text sizes and a responsive layout (phones, tablets, desktops) after owner feedback; added `scripts/test-all.sh`, `scripts/smoke.mjs` (25 end-to-end checks) and `scripts/live-audio.mjs` (real speech path) plus docs/TESTING.md. 120 tests pass.
- **10 November (batch 7c):** Role-play scripts for three testers ((removed test document)); fixed six detection misses they exposed (see DECISIONS, Batch 7c). 158 tests pass.
- **10 November (persona test):** Owner-authorised automated test: 48 blind calls by separate scammer and elderly agents in 7 language forms, synthetic voices, server run (all) and headless-browser run (12). 0/240 caller lines labelled You; scams 21/32 Hang up now, 30/32 at least Be careful; genuine 0/16 Hang up now. Speech recognition was a stand-in and there was no LLM. Fixed the first-run enrollment message. See (removed test document).

## 10 November 2026: speaker labels and live conversation view
- Added turn-taking to `decide()` (decision 24) test-first: 4 new tests in tests/attribution.test.js (phone + turn-taking, wideband voice + turn-taking, and safety guards: never "You", never alone, only after a certain senior turn, words can block it).
- Home now shows a live chat-style conversation (`ui/src/components/Conversation.jsx`) in place of the collapsed "What was heard" list.
- `npm test`: 160/161 pass. The one failure is F-12 (session idle timing), which also fails 4 times in 6 on the previous commit; it is a pre-existing timing flake (80 ms steps against a 150 ms limit), not caused by this change.
- Not verified: the conversation view on a real phone, and turn-taking accuracy on real calls (needs real recordings).

## 10 November 2026: lure-only lines no longer warn early (C24)
- Test-first: tests/lure-flow.test.js (real server, stand-in model that flags the bonus line as a prize). Red: Be careful after the lure. Green after the `LURE_ONLY` guard in `mergeGroundedFlags` (src/engine.js). Prompt in src/providers.js updated.
- Rules checked: lure-only lines stay safe in English, Hindi, Hinglish, Tamil, Tanglish, Malayalam, Manglish samples.
- `npm test`: 162/162 pass. Not verified: behaviour of the real Gemini model with the new prompt (re-run C24 manually).

## 10 November 2026: voice-saved indicator
- `/api/timeline` now also returns `enrolledAt` (time only, never the measurement). The recording card on Home and More → Your information show "Your voice is saved (recorded …)" or "No voice saved yet", and say that only a measurement is kept, never the recording.
- Tests: attribution test extended (enrolled false/null before, true/time after, no print in the response); render test for the three states. `npm test`: all pass except F-12, the known session-timing flake.
- Not verified: how it looks on a real phone.

## 10 November 2026 (afternoon): Malayalam, speaker labels, family link, interface, microphone check
- Malayalam/Manglish as speech recognition writes it (script loanwords, mixed Latin): src/loanwords.js + "പറഞ്ഞു താ" demand; tests/malayalam-asr.test.js (red 2/4 → green 4/4). Role-play check 37/37; blind Malayalam persona set unchanged (ml-02 still missed, pending 30).
- Speaker labels: "phone" now needs a band-edge cliff; caller print needs a 3-point margin. tests/attribution.test.js: turned-away senior never Caller (red → green), phone and VoLTE callers still Caller, poisoned caller print ignored (red → green).
- Persona rerun (48 calls, synthetic voices, oracle STT): caller lines You 0 (was 0), Caller 95/240 (was 70), senior lines Caller 0, You 166/204 (unchanged); scams 21/32 Hang up now, genuine 0/16 (unchanged).
- Family: link once, share every call (tests/family-standing.test.js, red → green). Interface: "warm and calm" redesign, self-hosted fonts. Microphone check (tests/mic-check.test.js).
- `npm test`: 176/176 pass.
- Not verified: the new look on any screen (no browser use without the owner's go-ahead); thresholds on real calls; whether the owner's "everything is Caller" is gone (re-record the voice first).
