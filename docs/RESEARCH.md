# Verified sources and interpretation

Checked 2026-10-25. Favor current /api Gnani docs over older /vachana pages, which disagree on supported languages/models.

- [Official challenge](https://www.gnani.ai/internship): deadline November 10, 2026 11:59 PM IST; eligible enrolled Indian students 18+, solo/two; genuine Gnani use, public LinkedIn/X demo and nominated links. Synthetic data only; misleading demos and artificial engagement prohibited. Registration terms must be rechecked at submission. No submission is made by this build.
- [STT realtime](https://docs.gnani.ai/api/STT/stt-websocket): actual transport contract and ready/transcript/error events. Published provider latency is not end-to-end application latency.
- [STT REST](https://docs.gnani.ai/api/STT/speech-to-text), [TTS REST](https://docs.gnani.ai/api/TTS/tts-inference), [voices](https://docs.gnani.ai/api/TTS/available-voices): adapter contracts.
- [Android audio input sharing](https://developer.android.com/media/platform/sharing-audio-input): call priority and privileged capture rules mean ordinary same-device mic capture may return silence. Speakerphone is not a guaranteed workaround. Companion capture is a separate physical device.
- [I4C advisory, 6 March 2025](https://cybercrime.gov.in/webform/theme/resources/advisories/ADVISORYTAU-ADV-003DigitalArrest06.03.2025.pdf): no concept of digital arrest under Indian laws; verify requests, speak to relatives before transferring, report cyber fraud via 1930/portal.
- [MHA/PIB advisory](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2020570): parcel accusation, authority impersonation, video confinement and money demands are documented tactics.
- [ws upstream](https://github.com/websockets/ws/blob/master/doc/ws.md), consulted via Context7: upgrade handling, headers, maxPayload and connection lifecycle.

Not verified: supplied aggregate loss figure; legal consent requirements for a specific real deployment; broad code-mixed detection accuracy; external LLM eligibility beyond genuine Gnani use requirement. Keep these as questions, not claims.

## Provider contract recheck — 31 October 2026

Current [Gnani REST STT](https://docs.gnani.ai/api/STT/speech-to-text) limits each clip to 30 seconds; the app splits its 60-second upload into ≤29-second pieces. Current [Prisma realtime docs](https://docs.gnani.ai/api/STT/stt-websocket) use `model=prisma-v3.0`, `language_code` and `format`, including code-mixed output and comma-separated language hints. Current [Timbre SSE docs](https://docs.gnani.ai/api/TTS/tts-sse) specify base64 `audio` chunks and a final `complete` event. A credentialed Timbre REST response used `0xffffffff` for WAV lengths, so the app repairs only provider-returned headers before validation. See [provider verification](PROVIDER_VERIFICATION.md) for actual synthetic results.
