# Test plan

How Scam Guardian is tested, what each layer proves, and what is still not covered. Use synthetic or consented speech only.

## Quick reference

| Command | What it does | Needs |
|---|---|---|
| `npm run test:all` | Builds the interface, runs all unit/integration tests and the accuracy report, starts a temporary server and runs the end-to-end smoke test against it. Prints a PASS/FAIL summary. | Node 22, `npm ci` |
| `npm test` | 158 unit and integration tests (about 25 s). | — |
| `npm run evaluate` (`-- --heldout`) | Text detection accuracy with Wilson intervals; `--heldout` adds the blind set. | — |
| `npm run test:smoke` (`-- <url>`) | 25 black-box checks against a **running** server or your HTTPS tunnel. Add `--live` to open a real speech WebSocket. | A running server |
| `npm run test:live -- --enroll my-voice.m4a` | Real speech path: enrolls your voice, streams a scam call (Gnani practice call or `--call file`) in real time through the live WebSocket, prints each transcribed line with its speaker label and the final warning. | `GNANI_API_KEY`, ffmpeg, about 12 s recording of your voice |

For repeated smoke runs, start the server with `LIMIT_SESSION_CREATE=200/3600` (default limit is 20 new sessions per hour per client). `test:all` does this for its temporary server.

## Layers

```
            Manual (phones, rooms, older adults)       real devices and testers
          Live speech path (Gnani, real audio)          scripts/live-audio.mjs
        End-to-end HTTP (running server/tunnel)          scripts/smoke.mjs
      Integration (in-process server, WebSocket, API)    tests/*.test.js
    Unit (engine, packs, attribution, UI logic, render)  tests/*.test.js + npm run evaluate
```

| Area | Type | Where | Covered | Gaps |
|---|---|---|---|---|
| Scam rules, negation, advice, dialogue acts, weighted score | Unit + accuracy set | `tests/engine*`, `tests/acts-families`, `npm run evaluate` | Development sets, four languages, code-mixed | Blind accuracy is much lower than development (see EVALUATION.md); needs a fresh blind round 3 and the production LLM |
| Language packs (en, hi, ta, ml) | Unit | `tests/languages`, `tests/malayalam` | Script + romanised forms, normalisation | Native-speaker review |
| Caller vs senior attribution | Unit on synthetic signals | `tests/attribution` | Decision table, clone guard, tuning guardrails | **Real speakerphone audio** (manual §2) and threshold calibration |
| LLM layer | Unit with mocks | `tests/guardian`, `tests/features` | Payload, roles can only veto "senior", cannot decide danger alone | Real model latency and accuracy |
| Live bridge and stream rotation | Integration with fake Gnani | `tests/live`, `tests/stream` | Reconnects, gaps, 13-min rotation, backpressure | Real network drops (manual §3) |
| HTTP API, family accounts, setup, push, data rights | Integration | `tests/api`, `tests/guardian`, `tests/batch6`, `tests/persist` | Auth separation, reason-only family view, export/erase, persistence | Push delivery to a real phone |
| Security | Integration | `tests/hardening`, `scripts/smoke.mjs` | Origin/Host checks, rate limits, CSP and headers, size limits, `/assets` path traversal | External security review |
| Interface logic and rendering | Unit + server-side render | `tests/ui`, `tests/ui-render` | Status card never calm when not checking, warnings never hidden, every state has icon + words, labelled controls, responsive classes | **Seeing it on real screens** (browser automation is not allowed in this project), contrast in sunlight, TalkBack |
| Whole system through the public API | End-to-end | `scripts/smoke.mjs` | Pages and assets, headers, consent, detection in all 4 languages (scam and genuine), enrollment gate, family pairing/login/reason-only/labels, export, evidence, erase | Microphone and audio playback |
| Real speech | End-to-end with Gnani | `scripts/live-audio.mjs` | Enrollment, STT, speaker labels, time to "Hang up now" | Room acoustics and real phone lines |

## Coverage targets before a pilot

- `npm run test:all`: all green on the demo machine.
- `scripts/live-audio.mjs`: "Hang up now" for the practice call in all four languages, **0 caller lines labelled "YOU"**.
- Manual §2: 0 caller turns labelled "You" across all conditions (release blocker).
- Blind text set (fresh round): report "Hang up" and "at least Be careful" rates with intervals, rules + production LLM.
- Accessibility: the §6 checklist passed with at least two older adults per language.

## Reading failures

- Smoke `403 … host not allowed`: the URL's host is missing from `ALLOWED_HOSTS`, or `PUBLIC_ORIGIN` is not that exact URL. Fix `.env` and restart.
- Smoke page `503`: the interface was not built; `npm start` builds it, `npm run serve` does not.
- Smoke `429`: rate limit; restart the server with `LIMIT_SESSION_CREATE=200/3600` for testing.
- Live `409`: the voice was not enrolled (the script does this; check the `--enroll` file is your own voice, 10+ s, normal volume).
