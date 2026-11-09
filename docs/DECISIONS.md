# Decisions and open proposals

## Implementation decisions made under build authorization
- Web companion + Node backend, as permitted by the brief. Preserve all capture-mode descriptions; same-phone remains experimental.
- Start with deterministic detection and an optional LLM adapter. Without LLM credentials show rules-only status.
- Standard warnings now prefer Timbre SSE with REST fallback; synthetic provider requests passed, browser/device playback is unverified.
- Family sharing now includes an opt-in Web Push adapter alongside foreground polling; real OS delivery is unverified.
- Retain transcripts in server memory until clear/delete/TTL/process restart; Stop ends capture but preserves the evidence. Browser-rendered transcripts remain until cleared or the page is closed. Explicit evidence downloads persist on the user's device.

These are implementation choices within the owner's existing brief, not approval of the product-direction proposals below. See FEATURE_AUDIT.md for the full-scope status.

## Owner decisions pending (do not silently implement as product changes)
1. Replace the label Safe with No warning detected. Rationale: safer uncertainty communication. Current build preserves Safe with a permanent qualification.
2. Promote companion-device capture above same-phone capture in product positioning. Current build simply discloses the verified platform constraint.
3. Choose practice drill over voice cloning for the challenge stretch goal. The current code includes local adapters for both, while this prioritization proposal remains pending.
4. Choose the primary two demo languages after native review and actual acoustic results.

## Stress test of the idea
Strong mechanism: interruption at the moment pressure is applied, supported by exact evidence. Weakest link: capture and transcription, not classifier sophistication. Quoted scam education, negation, both speakers in one transcript, sarcasm, adversarial instructions, silence and delayed provider segments all undermine naive keyword scoring. Language support is not detection-quality evidence. A family alert is useful only if consented, delivered, and noticed; a push adapter is useful only after actual background delivery is verified.

The supplied loss statistic is excluded from demo claims until an authoritative matching date/category source is verified. No interpretation of Indian recording law is settled by these documents. Legal/privacy review remains a real-user gate, not a claim of compliance.

## Implementation update — 30 October 2026

The owner asked to build the complete listed feature set and fix the audited gaps. The local implementation now includes opt-in Web Push, SSE warning transport, family voice enrollment, code-word setup, shared timeline, paired setup QR, an acoustic practice adapter and a cooling-off advisory. This implements the existing brief; it does **not** approve the four product-direction proposals above. Synthetic Prisma/Timbre provider paths passed on 31 October; actual browser/device delivery, production authentication, legal review and roadmap integrations remain separate gates.

## Implementation update — 9 November 2026 (owner-requested batch 1 of the feature roadmap)

Owner-requested and therefore authorized: a **separate family (Guardian) login** and the first roadmap batch of detection fixes.

- Family members now create their own account (username + passphrase, scrypt) from the senior's invite link. The invite links an account; it is not a login. Family APIs accept only the Guardian cookie, never the senior's profile token or the invite. The senior can list and remove linked accounts.
- Detection: secret-code demands (OTP, CVV, UPI PIN, password, card details) stay danger alone; negation is scoped to its own clause and unpunctuated speech is split before a new request; vocabulary, spoken amounts, family relations and code-mixed noun/verb pairs were added; evidence is an append-only ledger; quotes are the matching clause; the optional AI classifier runs after the rule verdict and cannot create danger without rule corroboration; speech in an uncovered script is marked `unknown_language` instead of reading as Safe.

Choices made inside that authorization that the owner should review (pending owner decision, easy to change):
5. A bare Aadhaar/PAN/identity-document request with no other pressure is **Be careful**, not Hang up (roadmap O-4). This drops two authored scam fixtures from red to amber.
6. Proposal: after the senior revokes a session's sharing, let a linked family account keep seeing the past reason-only timeline. **Current build does not**: family accounts see reasons only from shared sessions and only while one is shared, matching the pre-login behaviour.
7. One family account links to one senior at a time; a senior can have up to five linked accounts.
8. Family accounts are in-memory with no recovery; durable identity remains a release gate. A senior profile with a linked family account is kept for 30 idle days instead of one hour. Set `SECURE_COOKIES=1` (or an https `PUBLIC_ORIGIN`) behind TLS so the family cookie is marked Secure.
9. A family member still configures the code word and enrolls their own voice from their account (unchanged PRD B9/B10 flow); the senior separately opts in to hear the trusted voice.
10. "Card details" stays a secret-code request (danger alone); "card number" is an identity request (careful alone). The AI classifier may complete a combination (for example authority + secrecy + payment) but a model-only secret-code or digital-arrest flag cannot decide danger without the same tactic from the rules.

## Implementation update — 9 November 2026 (roadmap batch 2: streaming resilience, language registry, hardening)

Authorized by the owner ("proceed to the next section"). Design and sources: the batch 2 design report. Values below are judgement unless marked; each numbered item is a **pending owner decision** that is easy to change in config.

11. Rate limits and the daily provider-call cap (`src/limits.js` `DEFAULT_LIMITS`; 500 paid provider calls per process per day, in memory, resets on restart). A full limiter table fails closed. `TRUST_PROXY_HOPS` defaults to 0, so proxy headers are ignored unless configured.
12. Session expiry slides: 5 minutes idle (audio frames and session actions count, GET polling does not) with a 60-minute absolute cap (`sessionIdleMs`, `sessionCapMs`). An open microphone on a quiet line keeps monitoring up to the cap. Family invites live as long as the session.
13. Live reconnect: up to 5 attempts with full-jitter backoff, a 5-second audio buffer replayed at up to 2× real time, audio already sent to a dropped connection is not re-sent, lost audio is recorded as `gaps` and disclosed. Lossless recovery is not possible because Gnani documents no resume. A 2-second reconnect is not promised.
14. Upstream rotation before Gnani's 15-minute connection limit at 13 minutes (hard 14.5), sequential with a `commit`, never overlapping (Gnani's concurrency cap is unpublished).
15. While the spoken warning plays, the browser pauses the microphone; the server sends silence upstream for up to 20 seconds to keep the audio clock aligned and shows "paused". Upstream billing for that silence is unknown.
16. Setup links now require a 6-digit code shown on the senior's device and approved from the signed-in family account that created the link; five wrong codes burn the link; a new device credential (stored only as a SHA-256 hash) is issued once and is revocable per device; device credentials expire after 30 idle days or 90 days. The senior's internal profile id is never sent to any client.
17. Evaluation: results are k/n with Wilson 95% intervals; a slice is "claimable" only with at least 30 scams and 30 benign items; held-out share 30% by group hash. No independent held-out set exists yet; it must be written after rules are frozen by someone who did not tune them, and native-reviewed. The new twins are development hard negatives.
18. Language registry: English, Hindi, Tamil `supported`; Bengali, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi `planned` (Gnani transcribes them, the detector has no rules, sessions show partly/not covered); Odia `not_offered`. Word lists need native review. Dakshina-derived data is not shipped pending a licence decision (CC BY-SA).

Unverified vendor facts that need an owner-permitted live test: whether `x-idle-timeout-sec: 900` keeps a silent stream open; whether `processing` and `transcript` pair first-in-first-out; whether `segment_id` prefixes change per connection; tolerance for 2× catch-up replay.

## Implementation update — 9 November 2026 (roadmap batch 3: language packs, dialogue acts, scam families, pre-rendered warnings)

Authorized by the owner ("proceed to the next section"). Research: the batch 3 design report. Each numbered item is a **pending owner decision**.

19. Detection rules now live in data-only language packs (`src/packs/en.js`, `hi.js`, `ta.js`) and run as a union over every clause, so code-mixed speech matches whichever pack each word belongs to. Adding a language means adding a pack plus warning copy and a voice. Some literals remain in `engine.js` (amount grammar, own-payment exception, remote-tool and TRAI checks); per-language warning and drill copy still live in `providers.js`/`server.js`.
20. Dialogue acts (B-5): each clause is `advice`, `reported`, `demand`, `narration`, `question` or `other`. Reported and narrated tactics are kept as **weak** evidence: shown in the ledger, excluded from family reasons, unable to escalate alone; two different weak tactics give "Be careful". A quoted request aimed at the listener ("the bank said share the OTP") stays **strong** — a senior recounting a real call may therefore see "Hang up"; the copy should name the reported frame (UI work pending). Unclassified (`other`) clauses stay strong, as before. A weak pretext (family emergency, authority, threat, prize, investment bait, secrecy, urgency, camera) becomes decisive once the same window holds a strong ask (payment, secret code, app/remote, identity, advance fee).
21. An English authority needs a claim ("this is", "I am from", "connecting you to", "… officer/department/calling"); a bare institution name ("customs duty", "CBI and police do not arrest…") no longer counts.
22. New tactics and danger combinations for eleven scam families (B-1, `DANGER_RULES` in `engine.js`), including source-backed contradictions: TRAI does not call about disconnection (TRAI PR 22/2025); a UPI PIN or QR scan is never needed to receive money (NPCI); "safe/verification account" and bail by phone. Also judgement additions beyond the notes: advance fees, shaming/extortion threats, remote + threat, family emergency + secrecy, investment bait + deposit. Tier-B "never" claims (bank OTP, KBC fee, electricity) are used only as advice cues. The I4C "no video-call arrest" rule rests on a news report.
23. Pre-rendered warnings (B-12): standard-voice warning audio is cached per language and risk on first use (`X-Warning-Source: cache|provider`), served without a paid call, and used as a fallback when the speech service fails — including, disclosed via `X-Warning-Fallback: standard-voice-cache`, when a cloned-voice warning fails. Cloned-voice audio is never cached. `PREWARM_WARNINGS=1` renders the six clips at startup (counted against the daily cap; off by default). The cache key does not yet include a copy/voice version; Gnani's terms on reusing generated speech have not been read (owner).

Measured on development data (the rules were tuned on it): scam-family set 59/59 at the expected level and 0/24 look-alikes alarmed; before tuning it was 15/59 and 5/24. Not done: ordered "ask after pretext" scoring and an UNCERTAIN tier (B-4/B-8), separate CLAIM/THREAT acts, per-pack native sign-off fields, an independent held-out set.
