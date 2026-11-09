# API contracts

Current local implementation, checked 31 October 2026. Credentialed synthetic Prisma and Timbre checks are recorded in [PROVIDER_VERIFICATION.md](PROVIDER_VERIFICATION.md). Browser/device delivery is separate. Keys remain server-side.

## Gnani adapters

- Prisma realtime: `wss://api.vachana.ai/stt/v3/stream` with `x-api-key-id`, `model=prisma-v3.0`, `language_code`, `format`, `x-sample-rate`, signed little-endian mono PCM in exact 1024-byte frames. Wait for `connected`; use `transcript.text` and `segment_id`. Disconnect/error fails visibly.
- Prisma REST: `POST https://api.vachana.ai/stt/v3`, multipart `audio_file`, `model=prisma-v3.0`, `language_code` and `format`; transcript string in JSON. English uses `en-IN`/`verbatim`; Hindi/Tamil use language+English hints and `codemix`. The server validates and converts uploaded voice notes to ≤60-second PCM WAV, then sends chunks of ≤29 seconds because the provider REST limit is 30 seconds.
- Timbre REST: `POST https://api.vachana.ai/api/v1/tts/inference`, model `timbre-v2.5`, language, voice and WAV `audio_config`; binary WAV result. Gnani may use unknown-length RIFF/data sentinels; the server repairs and validates the received WAV. Curated fixed warning text only.
- Timbre SSE: `POST https://api.vachana.ai/api/v1/tts/sse` with the same curated text and audio config. Server parses `chunk` audio base64 events, forwards them as same-origin SSE, and the browser schedules PCM chunks with Web Audio. A premature stream is an error. The REST path remains fallback.
- Voice clone: `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings` with a consented 5–30-second sample; then `POST .../tts/inference` with `model=vachana-vc-v1` and returned `speaker_embedding`. Embedding stays in volatile memory and is deleted on revoke/session end. The message identifies itself as a Guardian message.

Environment: `GNANI_API_KEY`; optional `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`; optional push `ENABLE_PUSH`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; optional remote link `PUBLIC_ORIGIN`, `ALLOWED_HOSTS`. Missing provider configuration returns unavailable, never a fabricated verdict.

## Same-origin local routes

| Route | Contract |
|---|---|
| `POST /api/sessions` | `{language, mode, consent:true, profileToken?}` → `{id,profileToken}`. Modes: demo, live, upload, text. Profile token is an opaque local capability. |
| `GET/DELETE /api/sessions/:id` | Read state or delete it; deletion revokes associated pairing and voice embedding. |
| `POST /api/sessions/:id/segments` | Synthetic/text only `{text}` ≤2,000 characters. |
| `WS /api/listen?session=ID&rate=16000` | Binary 1024-byte PCM → ready/snapshot/error. |
| `POST /api/sessions/:id/upload` | Raw bounded WAV, MP3, OGG, M4A, WebM, FLAC, AAC body; ffmpeg conversion then Prisma REST. |
| `POST /api/sessions/:id/warning-stream` | Same-origin SSE audio chunks and complete/error for standard Timbre voice. |
| `POST /api/sessions/:id/warning` | Binary WAV for standard or consented cloned warning. |
| `POST /api/sessions/:id/trusted-voice` | `{consent:boolean}` senior choice. |
| `POST /api/sessions/:id/drill` | Synthetic spoken practice call WAV; demo mode only. |
| `POST/DELETE /api/sessions/:id/pair` | Senior explicit family consent; random short-lived token; revoke. |
| `GET /api/family` | Bearer pair token → risk, tactic labels, shared timeline and statuses; no transcript/audio. |
| `POST/DELETE /api/family/push` | Bearer token; Web Push subscription with endpoint allowlist and keys; unsubscribe. |
| `GET /api/push-key` | Public VAPID key only when push explicitly enabled. |
| `POST /api/family/voice`, `DELETE` | Bearer token, `X-Voice-Consent:true`, bounded sample; enrollment/revocation. |
| `POST /api/family/codeword` | Bearer token, `{word,confirmedOffline:true}`; word validated then discarded, only configured flag retained. |
| `POST /api/family/setup` | Bearer token, `{language}` → one-use 10-minute setup link and QR. |
| `GET/POST /api/setup/:token` | Suggested language; senior confirms language and processing consent to bind local profile. |
| `GET /api/timeline` | Bearer profile token → same reason-only events visible to senior. |
| `GET /api/sessions/:id/evidence` | Explicit JSON evidence export with timestamps, exact supporting lines and unverified entities. |

Session/pair IDs are temporary capabilities, not production authentication. Sessions expire after 15 minutes; profiles and timeline after one hour of inactivity or process restart; timeline retains at most 30 events. Input audio is never persisted by the app. HTTP errors are bounded and sanitized; 400 invalid, 403 consent/origin, 404 missing/expired, 409 incompatible stream mode, 413 size, 429 capacity, 502 provider, 503 missing credentials. Only recognized push-provider hosts are accepted as subscription endpoints. No public deployment, automatic family message or complaint submission was performed. Credentialed synthetic provider results are documented separately; do not infer physical-call or browser performance.
