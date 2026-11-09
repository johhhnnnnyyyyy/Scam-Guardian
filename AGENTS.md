# Working on Scam Guardian

Read PRD.md before changing product behavior; DESIGN.md before UI work; docs/API.md before provider work; PROGRESS.md before choosing the next task. CONTEXT.md defines domain terms.

Preserve the senior-first scam-call guardian described in PRD.md. Record proposed product changes in docs/DECISIONS.md as pending owner decision; proceed with independent authorized work. Never treat proposals as approved.

Keep synthetic demo, local integration, provider verification, device testing, and public release distinct. API keys belong only in server environment variables. Every warning must have transcript evidence. Silence, disconnection, or missing configuration must never look like a successful safety assessment.

Run npm test after changing detection or API behavior. For UI/session changes, use source-level UI-state and transport checks. Record commands and actual results in PROGRESS.md. Test negation, split utterances, session isolation, failure recovery, and malicious input. Update docs when contracts change.

The owner explicitly prohibits browser control and inbuilt browser use. Do not run browser automation, including test:browser. Record visual/device verification as unperformed until the owner performs manual checks.

Keep user audio and transcripts in bounded volatile memory; export only on explicit action. Use synthetic data in fixtures and demos. Never log bodies or provider credentials. Do not send family messages or publish externally during development.

Current status (31 October 2026): all 16 brief items have local implementations or provider adapters. Synthetic credentialed Prisma and Timbre paths have passed; browser/device audio, real Web Push, consented voice cloning and real-user safety remain unverified. Use docs/FEATURE_AUDIT.md for per-feature status and PROGRESS.md for current gates; do not promote an adapter to a deployed-feature claim.
