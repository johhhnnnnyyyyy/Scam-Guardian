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
| `GET/DELETE /api/sessions/:id` | Read state (projection without the profile token or internal fields) or delete it; deletion revokes associated pairing and voice embedding. Snapshots carry `coverage`: `supported`, `partial` or `unknown_language`. |
| `POST /api/sessions/:id/segments` | Synthetic/text only `{text}` ≤2,000 characters. |
| `WS /api/listen?session=ID&rate=16000` | Binary 1024-byte PCM → ready/snapshot/error. |
| `POST /api/sessions/:id/upload` | Raw bounded WAV, MP3, OGG, M4A, WebM, FLAC, AAC body; ffmpeg conversion then Prisma REST. |
| `POST /api/sessions/:id/warning-stream` | Same-origin SSE audio chunks and complete/error for standard Timbre voice. |
| `POST /api/sessions/:id/warning` | Binary WAV for standard or consented cloned warning. |
| `POST /api/sessions/:id/trusted-voice` | `{consent:boolean}` senior choice. |
| `POST /api/sessions/:id/drill` | Synthetic spoken practice call WAV; demo mode only. |
| `POST/DELETE /api/sessions/:id/pair` | Senior explicit family consent for this session → random invite token (expires with the session); revoke stops live sharing. The invite links a family account; it is not a login. |
| `POST /api/guardians/register` · `POST /api/guardians/login` · `POST /api/guardians/logout` · `GET /api/guardians/me` | Separate family (Guardian) login. Register needs `{username,passphrase,invite}`; login takes `{username,passphrase,invite?}` (an invite re-links the account). Passphrase 10–128 chars, scrypt-hashed. Session in an `HttpOnly; SameSite=Strict` cookie (12 h). Five failed logins per username and client lock it for 15 minutes. Cookie writes require a same-origin `Origin` header. |
| `GET /api/profile/guardians` · `DELETE /api/profile/guardians/:username` | Senior (Bearer profile token) lists or removes linked family accounts. |
| `GET /api/family` | Guardian cookie → `{sharing,...}`. While a session is shared: risk, coverage, tactic labels and statuses; otherwise `sharing:false` with the shared reason timeline only. Never transcript/audio. 401 signed out; 403 when the senior removed the link. |
| `POST/DELETE /api/family/push` | Guardian cookie; Web Push subscription stored on the family account (endpoint allowlist and keys); unsubscribe. |
| `GET /api/push-key` | Public VAPID key only when push explicitly enabled. |
| `POST /api/family/voice`, `DELETE` | Guardian cookie, `X-Voice-Consent:true`, bounded sample, needs an active shared session; embedding stored on the senior profile and deleted when the last session ends. |
| `POST /api/family/codeword` | Guardian cookie, `{word,confirmedOffline:true}`; word validated then discarded, only configured flag retained. |
| `POST /api/family/setup` | Guardian cookie, `{language}` → one-use 10-minute setup link and QR. |
| `GET/POST /api/setup/:token` | Suggested language; senior confirms language and processing consent to bind local profile. |
| `GET /api/timeline` | Bearer profile token → same reason-only events visible to senior. |
| `GET /api/sessions/:id/evidence` | Explicit JSON evidence export with timestamps, exact supporting lines and unverified entities. |

Session IDs and invites are temporary capabilities, not production authentication. Family accounts are a separate login but live in process memory (idle accounts removed after 30 days; restart clears them); there is no account recovery yet. Sessions expire after 15 minutes; profiles and timeline after one hour of inactivity (30 days when a family account is linked) or process restart; timeline retains at most 30 events. Input audio is never persisted by the app. HTTP errors are bounded and sanitized; 400 invalid, 403 consent/origin, 404 missing/expired, 409 incompatible stream mode, 413 size, 429 capacity, 502 provider, 503 missing credentials. Only recognized push-provider hosts are accepted as subscription endpoints. No public deployment, automatic family message or complaint submission was performed. Credentialed synthetic provider results are documented separately; do not infer physical-call or browser performance.

## Batch 2 contract changes (9 November 2026)

- **Origin**: every non-GET/HEAD request and every WebSocket upgrade must carry an `Origin` equal to this host (or `PUBLIC_ORIGIN`); missing or `null` → 403.
- **Limits**: 429 responses carry `Retry-After` and `{error, reason}` where `reason` is `client_rate_limit`, `session_budget`, `profile_budget`, `daily_cost_cap` or `limiter_full`.
- **Senior credential**: `POST /api/sessions` accepts `{deviceToken}` and returns `{id, deviceToken?}`: a new device credential only when a new profile was created. `DELETE /api/profile/device` revokes the presented credential. `GET /api/languages` lists the registry.
- **Setup**: `GET /api/setup/:token` → `{language}`; `POST /api/setup/:token/claim {language, consent:true}` → `{claimId, code}`; family `POST /api/family/setup/approve {code}`; `POST /api/setup/:token/complete {claimId}` → 409 until approved, then `{deviceToken, language}` once. The old one-step `POST /api/setup/:token` returns 405.
- **Expiry**: `expiresAt` slides with activity (idle 5 min, cap 60 min by default) instead of a fixed 15 minutes.
- **Live socket** (`/api/listen`): server messages `ready`, `snapshot`, `health {state, reason, attempt, text, gaps}`, `session_ending {at}`, `error` (final). Client may send `{type:"pause"|"resume"|"stop"}` text frames besides 1024-byte PCM frames. Health states: `connecting`, `listening`, `reconnecting`, `stt_degraded` (reasons `utterance_errors`, `catching_up`, `mic_silent`), `paused`, `stt_down`, `stopped`. Upstream drops reconnect automatically; only credential rejection, exhausted retries or expiry end listening. Snapshots carry `health {stt, tts, llm}`, `clock` (`audio` for live) and `gaps [{startMs,endMs}]`; live segments carry `timing {clock, estimated, audioStartMs, audioEndMs}`.
- **Upstream**: the server now sends `x-idle-timeout-sec: 900` and `x-api-request-id: <session>-c<connection>`.
- **Evidence pack**: schema 3 adds `clock` and `gaps`.

## Batch 3 contract changes (9 November 2026)

- Flags now carry `act` (`advice`, `reported`, `demand`, `narration`, `question`, `other`) and `grade` (`strong` or `weak`). Weak flags never decide risk alone and are omitted from family `reasons`. New tactics: `advance_fee`, `prize`, `investment_bait`, `extortion` (labels in `tacticLabels`).
- Warning responses carry `X-Warning-Source: cache|provider` and, on fallback after a provider failure, `X-Warning-Fallback: cache|standard-voice-cache`.
- `PREWARM_WARNINGS=1` pre-renders the standard warnings at startup.
