# Scam Guardian

A senior-first scam-call guardian built for the Gnani Great Indian AI Internship Challenge. A companion device (an old phone or tablet) sits next to the senior's phone during a call on speakerphone. It listens through Gnani's speech recognition, works out whether the caller or the senior is speaking, checks the conversation for scam tactics, and warns with a calm three-level signal (**No warning detected · Be careful · Hang up now**), a spoken warning, and optional reason-only alerts to family.

**MVP languages:** English, Hindi, Tamil and Malayalam, including code-mixed Hinglish, Tanglish and Manglish.

**Status:** a complete local MVP. Everything that can be checked without real phones and real people has been built and tested. What remains is manual testing on real phones and the release gates in [PROGRESS.md](PROGRESS.md). It is not yet validated on real calls.

## How it works

1. **Hearing the call:** browser microphone → server WebSocket → Gnani Prisma v3 realtime STT (code-mix mode), with reconnects, audio-gap tracking and 13-minute stream rotation.
2. **Who is speaking (compulsory voice enrollment):** each turn is labelled *You*, *Caller* or *Unsure* from two acoustic tests (a phone-line frequency signature, and a voice match to the senior's 12-second enrollment), with the words and the AI model as a capped third vote. "You" needs both acoustic tests to agree, and a voice that sounds like the senior but arrives through the phone line is never trusted. The senior's own words count as weak evidence.
3. **Scam detection:** data-only language packs (`src/packs/`) with clause splitting, negation and advice handling, dialogue acts (demand, reported, narration), precise scam patterns plus weighted evidence and an "uncertain" tier, and a compulsory evidence-grounded LLM that can confirm but never decide danger alone.
4. **Warnings and family:** a senior-first interface (three big tabs, one main button, a status card that never relies on colour alone), a large full-screen alert, spoken warnings (cached, streamed), family accounts with reason-only timeline and Web Push, code word, trusted voice, outcome labels, evidence export and a 1930 / cybercrime.gov.in reporting draft.

## Run locally

Requires Node.js 22+ and ffmpeg (for voice-note uploads).

```sh
npm ci
cp -n .env.example .env       # then add GNANI_API_KEY, LLM_API_KEY, LLM_MODEL
npm start                      # builds the interface, then serves http://127.0.0.1:3000
```

`npm start` builds the interface (React + Tailwind + shadcn/ui, source in `ui/`, output in `dist/`) before starting the server. Use `npm run serve` to start without rebuilding, and `npm run dev:ui` for live UI editing (it proxies the API on port 3000).

The server refuses to start without an LLM (owner decision 25). For local development without one, set `ALLOW_RULES_ONLY=1`. The text demos, rule engine, evidence export and family view need no Gnani key; live listening, uploads, spoken warnings, voice cloning and the practice drill do.

## Configuration

| Variable | Purpose |
|---|---|
| `GNANI_API_KEY` | Speech recognition and spoken warnings (server-side only). **Rotate the key that was exposed during development.** |
| `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` | Required LLM (OpenAI-compatible JSON chat completions). Sends recent transcript excerpts to that provider. |
| `ALLOW_RULES_ONLY=1` | Development only: start without an LLM. |
| `DATA_DIR` | Persist family accounts, senior profiles (incl. voice measurement) and device credentials to an owner-only `state.json`. Sessions, transcripts and audio are never written. |
| `PUBLIC_ORIGIN`, `ALLOWED_HOSTS`, `SECURE_COOKIES=1` | Required for any deployment beyond localhost (HTTPS origin, accepted Host headers, Secure cookies + HSTS). |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `ENABLE_PUSH=1` | Optional family Web Push. |
| `PROVIDER_DAILY_CAP`, `LIMIT_<RULE>=capacity[/seconds]` | Paid-call cap (default 500/day) and rate limits. |
| `METRICS_TOKEN` | Enables `GET /api/metrics` (JSON or `?format=prometheus`) — counters and latencies only, never content. |
| `VOICE_EMBEDDER=sherpa`, `VOICE_MODEL`, `VOICE_MATCH`, `VOICE_NONMATCH` | Optional neural voice print (see `src/voice/sherpa.js`); seniors re-record once after switching. |

## Docker

```sh
docker build -t scam-guardian .
docker run -p 3000:3000 -v sg-data:/data --env-file .env \
  -e PUBLIC_ORIGIN=https://guardian.example.in -e ALLOWED_HOSTS=guardian.example.in scam-guardian
```

Put it behind an HTTPS reverse proxy. The image runs as a non-root user, keeps state in `/data`, has a health check, and shuts down gracefully (state is written on SIGTERM).

## Verify

```sh
npm run test:all               # everything below in one go, plus an end-to-end smoke test on a temporary server
npm test                       # 158 unit and integration tests: engine, languages, attribution, live bridge, API, security, privacy, interface
npm run evaluate               # text evaluation with Wilson intervals; add -- --heldout for the blind set
npm run test:smoke -- https://your-tunnel.trycloudflare.com   # end-to-end checks against your running server or tunnel
npm run test:live -- --enroll my-voice.m4a                   # real speech path: enrollment + a streamed call through Gnani
```

The test plan is in [docs/TESTING.md](docs/TESTING.md). Results and their limits are in [docs/EVALUATION.md](docs/EVALUATION.md). In short: development sets look strong, but blind held-out sets show the rules alone catch roughly a third to a half of unseen scams. The compulsory LLM is the generalisation layer, and real-call accuracy is still unmeasured.

## Privacy and safety

No audio is stored. Transcripts live only in memory for the session (at most 60 minutes). Family alerts carry tactic labels, never quotes or audio. The senior can download or delete everything from the main screen; family members can delete their own accounts. The notice is at `/privacy`, and the compliance checklist is in [docs/COMPLIANCE.md](docs/COMPLIANCE.md). The app cannot end a cellular call, block payments or identify callers, and "No warning detected" never means a caller is verified. **Get legal advice on transcribing the remote caller before any pilot.**

Read [PRD.md](PRD.md), [DESIGN.md](DESIGN.md), [CONTEXT.md](CONTEXT.md), [docs/API.md](docs/API.md) and [docs/DECISIONS.md](docs/DECISIONS.md) before making product changes.
