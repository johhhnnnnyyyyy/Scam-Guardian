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
