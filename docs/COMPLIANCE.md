# Privacy and legal compliance checklist (India)

Prepared from public sources in November 2026 (research_notes/MVP compliance and accessibility/dpdp_compliance.md). **This is not legal advice.** Several points are unsettled and need counsel and a check of the Gazette before launch.

## Timeline

- DPDP Act 2023 and DPDP Rules 2025 (notified November 2025). The Board and institutional provisions are in force. The substantive obligations (notice, consent, rights, security, breach, retention) apply from **13 May 2027**, per the gazetted Rules. A January 2026 proposal to bring this forward was reported but not found notified; verify on egazette.gov.in.
- Until then, the IT Act s.43A and the SPDI Rules 2011 apply. These treat **biometric information as sensitive personal data**, so the senior's voice measurement is treated as sensitive now.

## What the MVP implements

| Obligation | Where in the product | Status |
|---|---|---|
| Itemised notice before consent | `/privacy` (notice version 2026-11-10); consent checkbox before demo, live listening and enrollment | Done; wording needs counsel review and translation |
| Specific, recorded consent | Consent records per purpose (`demo`, `live_listening`, `voice_enrollment`) with notice version and time, included in the export | Done |
| Withdrawal as easy as consent | Stop listening; delete voice measurement; **Delete everything**; family can delete their account | Done |
| Data minimisation | No audio stored; transcripts in memory only (at most 60 min); voice stored as derived numbers only; family sees reasons, not quotes | Done |
| Access / portability | **Download my data** (`GET /api/profile/export`) | Done |
| Erasure | `DELETE /api/profile`, `DELETE /api/guardians/me`, `DELETE /api/profile/enroll`; devices expire after 30 days idle / 90 days max | Done |
| Security safeguards | Hashed device credentials and passphrases (scrypt); HttpOnly SameSite cookies; Origin checks; rate limits; CSP, HSTS, Permissions-Policy; owner-only state file; no secrets or bodies in logs; privacy-safe metrics | Done (needs a security review before launch) |
| Children | Voice enrollment requires an 18+ confirmation | Done (self-declared) |
| Breach notification (Board: without delay, detailed report within 72 h; individuals: without delay; CERT-In: 6 h) | Organisational runbook needed | **To do (operator)** |
| Grievance redressal contact | Placeholder in `/privacy` | **To do (operator)** |
| Retention of logs (Rule 8(3): one year for some logs; scope unclear) | Metrics are counters only; no per-user logs kept | Needs counsel |
| Cross-border transfer | Gnani is in India; the LLM provider is configurable, so prefer an India-hosted model | Choose the provider before launch |

## Biggest open risk: the remote caller

The caller is not a user and does not consent. Telecommunications Act 2023 s.42 punishes unlawful interception (up to three years and ₹2 crore). Whether a participant's own assistant transcribing a call on speakerphone counts as "interception" is **unsettled**. No primary authority approving one-party consent for this use was found. Mitigations already in place: nothing about the caller is stored after the session; there is no caller identification; and the product is used only by the person receiving the call. **Get a written legal opinion before any pilot with real calls.**

## Reporting routes (shown in the app)

- Money lost or a cybercrime: call **1930** or report at **cybercrime.gov.in**.
- Suspected fraud call or SMS (no money lost): **Sanchar Saathi → Chakshu** (DoT).
