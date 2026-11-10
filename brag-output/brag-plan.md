# Scam Guardian — launch video plan

**What it is:** A companion device that sits next to an elderly parent's phone during a speakerphone call. It listens, spots scam tactics, and says "Hang up now" before any money moves.
**Who it's for:** Seniors in India who are home alone when "officials" call, and their children at work.
**What sets it apart:** It warns *during* the call, in English, Hindi, Tamil and Malayalam. Every warning quotes the words it is based on. Family get the reasons only, never audio.
**Most striking claim:** "There is no such thing as 'digital arrest' under Indian law" (I4C advisory, 6 Mar 2025), yet over ₹3,000 crore has been lost to it (Supreme Court of India observation, as reported).
**Hook:** A ringing phone in an empty, dark home. "The children are at work."
**Share caption:** see share-copy.txt.

## Angle
A short film in two halves. The first half is cold and dark: the scam call as an elderly parent hears it. The second half is warm limestone, the app's real look: the same call, now with a guardian listening. The turn comes at the reveal.

## Tone, music, identity
- **Tone:** cinematic. Big serif type, slow build, hard dip to black at the reveal.
- **Length:** 60 s (requested by the owner), landscape 1920×1080, 30 fps.
- **Music:** 96 BPM, 4/4, so one bar = 2.5 s and the whole video is exactly 24 bars. D minor (the call) → F major (the guardian), resolving on F add9 in the last bar. Low pad and pulse; the phone ring is pitched to the key (A/F) and sits on the beat grid. Every cut lands on a bar line.
- **Identity, taken from `ui/src/index.css`:** limestone #f2efe6, card #fbfaf6, ink #1e2430, indigo #26346b; signal lamps green #2e6a43, turmeric #c98a1b, sindoor red #b42318; danger panel #f8dad5 / #7a1a12. Fonts: Literata (headings), Atkinson Hyperlegible (body), Noto for Indic scripts. Icons are lucide (shield-check, mic, triangle/octagon alert, phone-off, bell), as used in the app. Logo: `public/icon.svg`.

## Honesty rules (from AGENTS.md / README)
- The scam call is the app's own synthetic demo script (`ui/src/lib/demos.js`), labelled **"Synthetic demo call"** on screen.
- No claim that it is validated on real calls or "stops all scams". "No warning detected" is never shown as "safe".
- The app cannot end a call. The copy is "End the call on your phone" (the app's own wording).
- No real names, numbers or personal data. The family view is labelled "Amma", a generic stand-in.

## Storyboard (24 bars = 60.0 s)
| # | Time | Bars | Scene |
|---|---|---|---|
| 1 | 0.0–5.0 | 2 | **Hook.** Dark navy room. A phone card glows: "Unknown number · Incoming call". It pulses with each ring. Type in: "3:40 pm. The children are at work." then "The phone rings." |
| 2 | 5.0–15.0 | 4 | **The call.** Caller lines type in one by one (demo script): CBI parcel → "Do not tell your family. Keep your camera on." → "You are under digital arrest. Transfer money…". Red vignette grows. Tag: Synthetic demo call. |
| 3 | 15.0–22.5 | 3 | **The cost.** Counter rolls up to "₹3,000+ crore" in sindoor red, then "lost to 'digital arrest' scams in India." Small source line. Then: "There is no such thing as 'digital arrest' in Indian law." |
| 4 | 22.5–27.5 | 2 | **Reveal.** Dip to black, then limestone opens. Logo and "Scam Guardian". "A calm guardian that listens beside the call." |
| 5 | 27.5–35.0 | 3 | **Setup.** The app's three steps appear one by one (HomeTab copy). Status card: idle → "Listening" with a breathing green lamp and mic icon. |
| 6 | 35.0–42.5 | 3 | **It hears it.** The real Conversation UI: caller bubbles arrive with turmeric rings on flagged lines; tactic badges (Authority · Secrecy · Camera · Payment). Status card turns "Be careful." |
| 7 | 42.5–47.5 | 2 | **Hang up now.** Full-screen danger overlay, the app's exact copy, octagon icon, and the button "I will end the call on my phone". Hindi line: "अभी कॉल काट दें।" |
| 8 | 47.5–52.5 | 2 | **Family.** The family view's "Recent warnings" timeline gains a "Hang up now" entry listing only the tactic labels. Copy: "Your family sees why. Reasons only. Never the audio, never the words." (No push notification is shown, because real push delivery is still unverified.) Language row: English · हिन्दी · தமிழ் · മലയാളം. |
| 9 | 52.5–60.0 | 3 | **Outro / poster.** Logo + "Scam Guardian". "So no parent faces that call alone." Footer: "Already scammed? Call 1930 · cybercrime.gov.in". |

Readability check: the longest read line (scene 2, line 3, 11 words ≈ 3.3 s) has a full bar plus of settled time; the stat lines have ≥2.5 s each.

Poster / frame 0: the "Hang up now." overlay at 45.0 s.
