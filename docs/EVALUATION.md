# Evaluation and demo protocol

## Development text run

Corpus: fixtures/calls.js, 50 synthetic scam + 50 benign scripts. English 30+30, Hindi/Hinglish 10+10, Tamil 10+10. No real identifiers. Run `npm run evaluate` for machine-readable per-case results in artifacts/text-evaluation.json.

Initial run: 48/50 scam cases red; 0/50 benign red or amber. The two misses were an inflected English arrest threat and a Hindi secrecy instruction incorrectly treated as advice. Regression tests reproduced both. After fixing those paths: 50/50 scam red, 0/50 benign red/amber. These are development-fixture results; tuning on the corpus prevents claiming held-out accuracy. Native reviewers must check Hindi/Tamil wording and code mixing.

## Cloud audio preparation

With credentials configured, explicitly generate a small sample first:

```sh
node --env-file=.env scripts/audio-benchmark.js generate 1
node --env-file=.env scripts/audio-benchmark.js score artifacts/audio/manifest.json
```

Generation uses Timbre v2.5 and writes WAV files plus provenance. Score sends clips to Prisma REST, computes whitespace-word WER, final risk and REST wall time. One English synthetic clip was generated and scored on 31 October 2026; see [PROVIDER_VERIFICATION.md](PROVIDER_VERIFICATION.md). This is not a held-out or speaker-captured benchmark. Larger generation consumes credits; review one clip before generating all 100. Direct TTS audio is not speaker-captured audio.

## Physical rig

1. Use separate playback and listening devices. Record device/browser/OS, distance, volume, room noise, language, voice, model and date. Use only synthetic speech.
2. Play held-out scam and benign scripts, shuffled so the operator cannot tune on the current case. Include negation, education, legitimate authority, both speakers, background TV, silence, soft speech, code mixing and packet loss.
3. Save a consented synthetic speaker-capture WAV outside the app and a manifest mapping each path to the reference. Capture quality must be inspected before scoring.
4. For live timing, annotate decisive utterance end, payment-request onset, warning visible, warning audio start and family receipt from synchronized recordings. Report p50/p95, misses and exact denominators. REST latency is not this metric.
5. Report per-language scam recall at payment, benign amber/red rate, warning latency, WER, provider failures and missed speech. WER tokenization is NFC/lowercase/punctuation removal/whitespace; Indic morphological errors and code mixing need qualitative review too.

Proposed gates: ≥90% scam recall by payment, ≤5% benign red alerts, p95 ≤3 seconds from decisive utterance end to warning. None has been validated acoustically. Keep developmental and held-out samples separate.

## Manual interface checks (no agent browser control)

Senior: consent off/on, language selection, red and benign demos, stop/clear, missing key, denied mic, unplugged mic, silence, slow network, warning playback failure, export. Family: no speech, red reasons without quotes, stopped session, expiry, revoke. Check keyboard focus, 200% zoom, narrow phone layout, contrast, native-script legibility and no overflow. Actual senior usability review remains open.

## 60-second submission storyboard

0–10 s: show two devices and label synthetic input. 10–25 s: play the reviewed scam, explain exact authority/secrecy/payment evidence. 25–40 s: show localized warning and the consented family view; state whether push was actually delivered or the foreground page was used. 40–50 s: show evidence and reporting draft marked not submitted. 50–60 s: show measured results with sample counts and limits. Use no unverified loss statistic, staged provider result, or claim that this app ended a phone call.

Public video, social post and contest submission require a genuine Gnani run and owner-controlled publication. None has been posted by the agent.
