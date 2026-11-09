# Implementation plan

Binding specification: ../PRD.md. Agent-selected implementation: ../DESIGN.md.

- [x] Detection/session contract: regression tests, deterministic engine and bounded store.
- [x] Provider/API contract: mocked contract tests, local WebSocket transport, Gnani adapters and optional grounded LLM.
- [x] Senior and family surfaces: synthetic demo, consent, capture, upload, evidence and revoke implemented; browser verification remains uncompleted under owner prohibition.
- [x] Local verification and handoff: code-level UI state, unit/HTTP/WebSocket checks; review fixes; reproducible text evaluation and setup docs.

Current gate status is tracked in ../PROGRESS.md. Completing this local implementation plan is not a claim of browser/device verification, real-user safety, public deployment or roadmap integrations; synthetic credentialed Prisma/Timbre verification is recorded in PROVIDER_VERIFICATION.md.

Shared interfaces: session snapshot consumed by API/UI; risk severity enum consumed by warnings; exact evidence shape consumed by family redaction/export. Family projection must never reuse full snapshots. Provider failures are transport status, never a lower risk level.
