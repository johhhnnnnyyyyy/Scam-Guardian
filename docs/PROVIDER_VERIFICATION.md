# Credentialed Gnani verification — 31 October 2026

Only authored synthetic speech was used. The server-side key was never sent to the browser or printed by verification scripts. Generated audio and reports are under ignored `artifacts/`; these are direct TTS clips, **not** speaker-captured calls. No browser control, physical device, family notification, real caller audio, voice clone enrollment or public deployment was used.

| Check | Result |
|---|---|
| Timbre REST synthetic generation | Passed after repairing Gnani's streaming WAV length sentinels (`RIFF` and `data` both `0xffffffff`). One English synthetic clip generated. |
| Prisma REST, English clip | Passed on retry: 4.16-second clip, WER 0 against its authored reference, danger verdict, 450 ms REST wall time on successful attempt. First attempt returned HTTP 504; it was not counted as success. |
| Prisma v3 code-mixed REST configuration | Passed with `model=prisma-v3.0`, `format=codemix`, and `hi-IN,en-IN` language hints. |
| Timbre REST warning | Passed: 4.8-second English WAV, 1,295 ms total request. |
| Timbre SSE warning | Passed: 105 chunks, 110,933 decoded samples, first chunk 419 ms, complete 958 ms in one direct check. Local-server end-to-end check received 142 chunks and 162,133 samples in a separate run. Playback on an actual browser/device remains unverified. |
| Prisma realtime | Passed with one fictional clip; after selecting v3 and correct `language_code`/`format` headers, the provider connected and returned one transcript. Ready at 418 ms, provider-reported transcript latency 384 ms, total elapsed 3,548 ms from connection start in that one run. This is not warning latency and not a p95 estimate. |
| Hindi synthetic TTS → Prisma v3 REST → detector | Passed for one authored direct-TTS clip: 5.33-second audio, 668 ms REST wall time, WER 0.143, danger verdict. |
| Tamil synthetic TTS → Prisma v3 REST → detector | Passed for one authored direct-TTS clip: 6.76-second audio, 622 ms REST wall time, WER 0, danger verdict. |
| Local HTTP end-to-end route | Passed with one English synthetic upload: danger verdict, three flags, one evidence segment, three family tactic reasons, no transcript in family projection, streamed warning chunks and 7.47-second practice WAV. |

The single-clip WERs are diagnostic examples, not accuracy estimates. The 60-second upload contract is preserved by splitting validated PCM WAV into ≤29-second chunks before Prisma REST; Gnani's current REST limit is 30 seconds. Split-boundary transcription quality is unmeasured. A 504 may still occur; the app surfaces the provider error and the user may retry.

## Reproducible commands

```sh
npm test
npm run evaluate
node scripts/audit-features.js
node --env-file=.env scripts/audio-benchmark.js generate 1
node --env-file=.env scripts/audio-benchmark.js score artifacts/audio/manifest.json
node --env-file=.env scripts/provider-smoke.js warning
node --env-file=.env scripts/provider-smoke.js stream
node --env-file=.env scripts/provider-smoke.js realtime
node --env-file=.env scripts/provider-smoke.js languages
node --env-file=.env scripts/end-to-end-smoke.js
```

The last seven commands make credentialed provider calls and consume credits. They require `GNANI_API_KEY` in ignored `.env`. They print status/metrics, not secrets or transcript bodies. The synthetic generator stores a clip under ignored `artifacts/audio/`.

## Remaining gates

A real consented family voice sample is needed to verify cloning. Web Push needs VAPID configuration, an opted-in family device and a reachable HTTPS deployment; no message was sent during development. Browser audio playback, microphone permission, speakerphone/second-device acoustics, noisy Hindi/Hinglish/Tamil WER, native-language review and senior accessibility tests remain unperformed under the owner's no-browser-control instruction. No real-user safety performance claim is supported yet.
