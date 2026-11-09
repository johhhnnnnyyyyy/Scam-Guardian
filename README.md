# Scam Guardian

A senior-first scam-call research MVP for the Gnani Great Indian AI Internship Challenge. All 16 brief items have local implementations or provider adapters; synthetic Prisma/Timbre calls have passed. It identifies pressure tactics in speech/transcripts, shows evidence-backed warnings, and can share short reasons with a consented family member. [Full feature status](docs/FEATURE_AUDIT.md) separates this from unverified browser/device behavior and public release readiness.

## Run locally

Requires Node.js 22+ and ffmpeg for compressed voice notes. From this directory:

```sh
npm ci
cp -n .env.example .env
npm start
```

Open `http://127.0.0.1:3000` yourself. Read the consent, select a language and run a synthetic text demo. The text demo, rule engine, evidence export and reason-only family view need no Gnani key. Browser control/automation is prohibited by the owner.

To exercise actual synthetic audio, add `GNANI_API_KEY` to `.env` and restart. Live capture streams microphone PCM to Prisma through the server; place the browser on a companion device beside a phone on speaker. Upload accepts synthetic WAV, MP3, OGG, M4A, WebM, FLAC or AAC up to 60 seconds and 12 MB. Timbre warnings use SSE streaming with Web Audio playback and REST fallback. Voice cloning and an acoustic fire-drill also require Gnani access. Provider contracts are documented in [docs/API.md](docs/API.md); actual synthetic Prisma and Timbre calls have now been verified; browser playback remains unverified. See [provider verification](docs/PROVIDER_VERIFICATION.md).

Keep the key only in ignored `.env`, never `.env.example`. A key was found in the example template on 31 October, moved to `.env`, and removed from the template. Rotate that key before public use.

Optional LLM classification uses `LLM_API_KEY`, `LLM_BASE_URL` and `LLM_MODEL` for a compatible JSON chat-completions service. Without them, rules remain active. The model must cite exact transcript text for each accepted flag. This sends recent transcript excerpts to that separate provider.

For Web Push, generate a VAPID keypair using your push service tooling, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:your-address` and `ENABLE_PUSH=1`, then restart. The family member opts in from the family view. Push is off by default and has not been delivered to a real device in this workspace. A remote family device needs a secured HTTPS origin, a reachable server, `PUBLIC_ORIGIN=https://your-host` and `ALLOWED_HOSTS=your-host`; this prototype lacks production account identity and is **not ready for public hosting**. The local `127.0.0.1` link is only reachable on that machine.

## Verify without browser control

```sh
npm test
npm run evaluate
node scripts/audit-features.js
node --check public/app.js
node --check public/family.js
```

`npm test` uses Node and local HTTP/WebSocket mocks; it includes UI control contracts without launching a browser. `evaluate` uses 100 authored development text cases, not real-call accuracy. No `npm run test:browser` was run because browser control is prohibited by the owner. See [PROGRESS.md](PROGRESS.md) and [provider verification](docs/PROVIDER_VERIFICATION.md) for actual command results and remaining validation gates.

## Safety and limits

This app cannot capture every same-phone call or end a cellular call. Silence or disconnection never means a caller is safe. No input audio is stored by default; the transcript and voice embedding live in bounded process memory, and a download occurs only when you choose it. Family alerts contain tactic labels, not transcript quotes or raw audio. The family code word is discarded after setup. Provider retention is separate. Evidence and reporting drafts are unverified aids, not official complaints. Use synthetic material for the challenge; do not record real callers without appropriate review.

Read [PRD.md](PRD.md), [DESIGN.md](DESIGN.md), [CONTEXT.md](CONTEXT.md), [docs/API.md](docs/API.md), [docs/DECISIONS.md](docs/DECISIONS.md) and [PROGRESS.md](PROGRESS.md) before making product changes.
