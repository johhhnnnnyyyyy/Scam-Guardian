# Scam Guardian — product requirements

Status: owner requirements preserved; local MVP implementation mapped as of 31 October 2026. Implementation choices are agent-selected; substantive proposed changes remain pending in docs/DECISIONS.md.

Feature audit, 31 October 2026: this document describes requirements, not a claim of device safety. [docs/FEATURE_AUDIT.md](docs/FEATURE_AUDIT.md) maps every original feature to current code and gaps; [credentialed synthetic provider checks](docs/PROVIDER_VERIFICATION.md) are separate from physiacal speakerphone validation. Prototype substitutions do not reduce the owner's requested scope.

## Purpose
Help seniors recognize pressure tactics during suspicious Hindi, Hinglish, Tamil, and English conversations, pause before sharing secrets or transferring money, and reach a trusted family member. The family member helps without gaining a surveillance feed. Target: Gnani Great Indian AI Internship Challenge.

## Experience
The senior selects a language, understands cloud processing, and explicitly starts a session. Companion-device microphone capture, experimental same-phone speaker capture, and short synthetic audio upload feed Prisma STT. A rolling transcript produces evidence-backed tactic flags. Three risk levels (Safe, Be careful, Hang up now) remain the requested model; Safe is always qualified as no detected warning, never verified caller identity. Before any speech, show Waiting for speech. Failed capture is unavailable, never green.

Warnings use calm localized Timbre speech, prominent text, and optional device vibration. A Hang up instruction tells the senior to use their phone's call controls. A web app cannot end a cellular call. The family view receives reasons only after explicit pairing and sharing consent. Evidence is available for user-controlled download.

## Requirements and acceptance
| ID | Priority | Requirement | Acceptance |
|---|---|---|---|
| A1 | P0 | Three-state calm risk meter | Stable escalation; no score in senior UI; idle and failed states distinct |
| A2 | P0 | Explainable tactics | Authority, threats, urgency, secrecy, payment, OTP/identity, APK/screen sharing, camera; exact quotes attached |
| A3 | P0 | Combination escalation | Authority + secrecy + payment escalates across recent segments; expired evidence cannot combine |
| A4 | P0 | Hard claims and entities | Arrest-by-video and payment-to-avoid-arrest patterns; negated advice tested; extracted entities labeled unverified |
| A5 | P0 | Spoken intervention | Fixed Hindi/Tamil/English warnings; errors visible; no silent browser-voice substitution for Timbre |
| A6 | P0 | Full-screen accessible alert | Full-screen color, non-color labels, vibration, large hang-up guidance control; physical-device/accessibility verification. Full-viewport overlay implemented locally; device review pending |
| A7 | P0 | Code-mixed multilingual processing and profile | Profile language selection; actual Hindi/Hinglish/Tamil/Tanglish STT and detector validation. Local profile and scripted rules exist; acoustic validation remains open |
| B8 | P0 | Instant family push alert | Explicit opt-in; concise reasons without audio; background push and truthful delivery status. Push adapter exists; actual background delivery remains unverified |
| B9 | P1 | Trusted-voice warning | Explicit family-member consent for 5–30 s voice sample, cloning, clearly labeled Guardian message and revocation. Local adapter exists; real provider/device check pending |
| B10 | P1 | Family code word | Family defines secret; emergency impersonation triggers prompt to ask for it. Code-word setup and evidence-triggered prompt implemented locally |
| B11 | P1 | Family timeline | Flagged-call history and reasons; senior sees the same shared information. Bounded shared timeline implemented locally |
| B12 | P1 | Remote setup | Family setup link/QR and senior voice-driven language choice. Paired setup QR/link implemented; device speech and remote HTTPS deployment unverified |
| C13 | P0 | Evidence pack | Session timestamps, flagged quotes, tactics, unverified entities, provenance, limits; JSON download |
| C14 | P1 | Reporting handoff | User-reviewed draft and official portal/1930 link; never claim report submitted |
| C15 | P1 | Acoustic practice drill | With consent, play a synthetic scam call and let the senior practise hanging up. Acoustic TTS drill adapter implemented; real playback unverified |
| C16 | P2 | Cooling-off prompt | Payment words plus amount trigger a ten-minute pause and trusted-family contact prompt; advice only, never a bank/payment block. Ten-minute advisory implemented locally; no bank block |

## Scope and boundaries
The local vertical slice and Prisma/Timbre provider adapters have been exercised with owner-supplied credentials and synthetic speech. Production identity/account recovery, verified push delivery, community radar, call forwarding, and banking integrations remain later milestones. The cloning adapter still needs a consented family sample and device validation. Optional LLM tactic classification must be evidence-validated and fail back to rules; prompt injection in transcripts is untrusted data.

Milestone scheduling is an implementation sequence, not owner approval to downgrade P0 push, streaming speech or other original requirements. The local push, streaming-warning and acoustic-drill paths require browser/device verification before being called delivered end to end; provider-only synthetic TTS has passed.

Do not assume a personal-account payment is always fraud. Detection supports a protective action, not a legal accusation. No raw audio is stored by the app. Provider processing/retention is separate and must be reviewed before real-user trials. Contest examples contain synthetic data only.

## Evaluation
Target dataset: 50 distinct scam + 50 benign scripts, balanced across intended demo languages, held-out wording and speakers, clean and speaker-captured noise conditions. Report sensitivity at payment request, benign false alerts, time to first warning, missed-warning rate, WER, language slices, and sample counts. Proposed gates: ≥90% scam recall at payment, ≤5% benign red alerts, p95 warning ≤3 s after decisive utterance; targets are not measured results. Never substitute transcript-fixture accuracy for acoustic performance. No winning or safety guarantees.

## Release gates
Actual Gnani STT/TTS success, noisy second-device recordings, native language review, senior usability sessions, privacy/legal review, contest terms recheck, and an honestly labeled public demo. No real call recording or legal compliance claim until reviewed.
