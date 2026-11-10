# STT audio clarity research (Scam Guardian)

Date: 2026-11-10. Read-only research. No tests, browsers or git pushes were run. Claims are marked as **Source** (cited) or **Inference** (my reasoning). Items I could not verify are listed at the end.

## Summary: recommendations ranked by expected impact and effort

1. **Verify what the browser actually applied, then fix the physical signal.** Read `track.getSettings()` on the real device; check peak level and clipping; move the capture device closer to the phone speaker and lower the speakerphone volume if it distorts. Impact likely high, effort low.
2. **Keep the raw capture path.** Do not add denoise or AGC by default. Vendor guidance and a 2025 study both point the same way (see section 3). Effort none.
3. **Revisit `x-max-speech-s: 10`.** It force-closes segments every 10 s. Gnani documents a range up to 120 s. Impact unknown, effort one value, needs an owner-approved A/B.
4. **Check the end-of-call flush.** Gnani recommends about 1 s of trailing silence, or a `commit` frame. Our `stop` message is not documented as a flush. Effort low.
5. **Benchmark before changing the stack.** Run a WER comparison on recorded speakerphone clips (needs owner approval), covering current settings, mixing with the raw signal, and mild enhancement.
6. **Second engine for Malayalam as a benchmark, not a default.** Sarvam `saaras:v4` and Google Chirp list `ml-IN`. Effort medium to high. Evidence so far is documentation only.
7. **Enhancers (RNNoise, DeepFilterNet, WebRTC APM) only if step 5 shows a gain.** Effort medium.
8. **Native 48 kHz capture to avoid browser resampling.** Low evidence, low to medium impact. Test only if step 5 is run.

## 1. Gnani's documented requirements

**Our current send path (local code).** Mono, `getUserMedia` `channelCount:1`, `echoCancellation:false`, `noiseSuppression:false`, `autoGainControl:false` (ui/src/lib/capture.js:8). `AudioContext({sampleRate:16000})` with the real `context.sampleRate` passed to the server (capture.js:9, 11). A worklet converts float to Int16 in 512-sample frames (public/pcm-worklet.js), giving 1024-byte frames. No gain, filter or DC removal. Headers (src/providers.js:65): `model=prisma-v3.0`; `language_code` `en-IN` or `<lang>,en-IN`; `format` `verbatim` for English, `codemix` otherwise; `x-min-silence-ms=400`; `x-max-speech-s=10`; `x-vad-threshold` not set (default 0.7).

**Gnani's requirements (official docs).**
- Raw PCM signed 16-bit little-endian mono. `x-sample-rate` accepts 8000, 16000, 44100 or 48000, default 16000, and must match the actual source rate. Frames are exactly 1024 bytes, sent at real-time cadence. Source: https://docs.gnani.ai/api/STT/stt-websocket
- VAD: default `x-vad-threshold` 0.7. Gnani suggests 0.45–0.55 for a clean headset, 0.6–0.7 for an open office or laptop mic, 0.65–0.75 for telephony. `x-max-speech-s` is disabled by default with a range of 5–120. A `{"type":"commit"}` frame closes the open utterance. The last sentence is only transcribed after silence, and Gnani recommends about one second of trailing silence. Source: https://docs.gnani.ai/api/STT/stt-websocket
- Gain and noise: the page gives no guidance on gain, normalisation or noise. Source: https://docs.gnani.ai/api/STT/stt-websocket
- Languages: `ml-IN` is listed. Multi-language codes are hints, not locks. `codemix` is v3.0 only and keeps English in Latin script. The page does not say `ml-IN` supports `codemix`, nor that romanised Tanglish or Manglish is handled. Source: https://docs.gnani.ai/api/STT/stt-websocket and https://docs.gnani.ai/api/STT/speech-to-text
- **Inference:** `format` changes output script, not acoustics. Romanised output may need `transliterate` (v3.0 only, per the speech-to-text page), but that does not fix bad audio.
- The Prisma model page (Hugging Face) claims "telephony-grade audio (8kHz, PSTN)" and robustness to "ambient noise". These are marketing claims with no test conditions. It also uses a different model ID in code samples (`gnani-ai/vachana`). Source: https://huggingface.co/gnani-ai/gnani

## 2. Browser capture settings

- The W3C constraint definitions are booleans, and MDN describes a bare value as best effort: "the user agent will do its best to match once all more stringent constraints have been applied." Our bare `false` values are therefore not guaranteed. Source: https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
- `track.getSettings()` returns the values the browser actually selected. Read it to confirm processing is off. Source: https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings
- Chrome treats hardware suppression separately. Per Chrome's note, without `echoCancellation` set, Chrome "will not touch hardware noise suppression". That experiment is limited to macOS. **Inference:** our `noiseSuppression:false` may not disable hardware suppression on some devices. Source: https://developer.chrome.com/blog/disabling-hardware-noise-suppression/
- For ASR input, Google's guidance: "All noise reduction processing should be disabled", "Don't use automatic gain control (AGC)", and "Avoid audio clipping." Source: https://docs.cloud.google.com/speech-to-text/docs/v1/best-practices-provide-speech-data. This is Google's guidance, not Gnani's.
- Trade-off: decision 24 keeps the signal raw to preserve the phone-line signature for speaker attribution. Any enhancement may also affect attribution, so re-check that feature too.

## 3. Enhancement options

- **RNNoise (Xiph):** BSD-3-Clause, operates on 16-bit mono PCM at 48 kHz, recommends AVX2 builds. No latency or ASR claims. Source: https://github.com/xiph/rnnoise. Chromium ships a copy under third_party. Source: https://chromium.googlesource.com/chromium/src/+/refs/tags/90.0.4403.4/third_party/rnnoise/README.chromium
- **DeepFilterNet:** MIT or Apache-2.0. The `deep-filter` binary supports 48 kHz WAV only. Ships as a Rust binary, Python package or LADSPA plugin, not a browser library. No real-time factor given. Source: https://github.com/Rikorose/DeepFilterNet
- **WebRTC APM (wrapped by LiveKit):** on/off noise suppression, high-pass filter and AGC. Frames must be exactly 10 ms, so our 32 ms frames would need re-framing. No ASR guidance. Source: https://docs.livekit.io/reference/python/livekit/rtc/apm.html
- **Evidence against denoising before a cloud ASR:**
  - EkaCare (Dec 2025): MetricGAN+ enhancement raised semWER in all 40 configurations tested, mean +7.83 points, across Whisper large-v3, Parakeet, Gemini Flash 2.0 and Parrotlet-a. One enhancer, medical domain. Source: https://arxiv.org/pdf/2512.17562
  - Ochiai et al.: single-channel enhancement "do[es] not necessarily contribute to improving the ASR performance". Artifact errors cause most of the degradation. Interpolating enhanced and observed signals (weight 0.4–0.5) improved WER. Enhancement helped only when the ASR was trained on enhanced speech. Source: https://arxiv.org/html/2404.14860v1
- **Inference:** no sourced evidence that an off-the-shelf denoiser helps Gnani. If we test one, include the 0.4–0.5 mix as a cheap variant. No CPU or latency numbers were found.

## 4. Resampling and bit depth

- Gnani accepts 8, 16, 44.1 and 48 kHz natively and says it resamples 44.1 and 48 kHz internally. Source: https://docs.gnani.ai/api/STT/stt-websocket
- Google: "Capture audio with a sampling rate of 16,000 Hz or higher... However, avoid re-sampling." Source: https://docs.cloud.google.com/speech-to-text/docs/v1/best-practices-provide-speech-data
- Our `AudioContext({sampleRate:16000})` makes the browser resample from the mic rate (usually 48 kHz). I did not find an official statement on Chrome's resampler quality.
- **Clipping:** the worklet clamps to ±1 and does no headroom check. A loud speakerphone can clip at capture, which Google specifically warns against. Source for the warning: Google link above.
- **8 kHz telephony:** MDN says 8,000 samples per second is "adequate for comprehensible albeit imperfect" speech. Source: https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings. Google cites 8 kHz for telephony. Source: Google link above. **Inference:** capturing at 16 kHz adds no information beyond the phone's band, and upsampling would not help. No change needed for that alone.

## 5. Practical alternatives

- **Placement:** Google advises positioning the microphone "as close as possible to the person that is speaking", especially with background noise. Source: Google best-practices link above.
- **Direct call-audio capture (wired or line-in):** no source found on feasibility or consent for this platform. Not researched further.
- **Sarvam:** the WebSocket page is marked Legacy. It accepts `sample_rate` 8000 or 16000 and `input_audio_codec` `pcm_s16le`. `ml-IN` is supported. `saaras:v4` covers 22 Indic languages plus English, with a `codemix` mode and `keyterms` (up to 50, saaras:v4 only). Source: https://docs.sarvam.ai/api-reference/speech-to-text/transcribe/ws
- **Google Chirp:** `ml-IN` is listed for `chirp_2` (asia-southeast1, europe-west4) and `chirp_3` (eu only). The table has no streaming or code-switching column. Source: https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages
- **AI4Bharat IndicConformer 600M multilingual:** includes Malayalam. Expects 16 kHz mono. MIT licence. Gated access on Hugging Face. No noise or code-mix statements. Source: https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual

## Could not verify

- Gnani's own WER, benchmarks or noise test conditions. The "10–20% lower WER" claim names no benchmark. Source: https://huggingface.co/gnani-ai/gnani
- Whether `ml-IN` with `codemix` is supported, and how Gnani handles Tanglish or Manglish.
- Chrome's resampler quality, and whether `noiseSuppression:false` disables hardware suppression on Windows or Android.
- The normative W3C text on ideal versus exact. The W3C page fetch was truncated before the constraint definitions. The MDN quote is the source used. https://www.w3.org/TR/mediacapture-streams/
- The Google audio-quality page failed to fetch. The RNNoise README fetch also failed, so its frame size comes only from search metadata.
- Any enhancement latency or CPU figures.
- Whether the 10 s segment cap hurts accuracy in practice.
- Whether our `stop` message flushes the final utterance on the server.
- Sarvam and Google streaming sample-rate or chunk guidance beyond what is listed above.
