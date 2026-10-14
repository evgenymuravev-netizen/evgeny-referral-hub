from common import row

PL = []
p = PL.append
SYS = "System"

E = "botim integration"
p(row("PL-01", "botim signed hand-off", E, "Integration", SYS, "Noor + botim", "MVP",
  "Noor receives a signed assertion from botim when the web-view opens.",
  ["Signed token (JWS) with botim user id, phone (UAE flag, verified date, device binding, SIM-change signal), email (verified, date), name, locale",
   "Short expiry, nonce, replay protection; key rotation", "Web-view bridge: close, open bank app links, return URL, share"],
  ["Contract and key exchange agreed with botim"],
  ["botim API spec"], ["CJ-06", "RF-66"],
  "BE, Integration", "L", "BOTIM-RELIANCE-SPEC.md",
  ["botim's field availability (SIM change, verification date)"]))
p(row("PL-02", "botim events webhook", E, "Integration", SYS, "Noor", "MVP",
  "Send funnel events to botim.",
  ["Events: impression, journey_started, accounts_connected, applied, funded; with variant, surface, timestamp", "No PII; retries; idempotency; schema version"],
  ["Only botim receives events"], ["botim endpoint"], ["botim analytics"],
  "BE", "S", "Journey event log"))
p(row("PL-03", "Noor web app (web-view and PWA)", E, "Tech enabler", SYS, "Noor", "MVP",
  "Front-end shell for the customer journey inside botim and standalone.",
  ["Responsive from 360px; EN/AR with RTL; light and dark", "Session handling inside the web-view; deep links; error and offline states",
   "Accessibility (WCAG 2.1 AA)", "Performance budget for first screen"],
  ["Design system from the prototype"], ["Design"], ["All CJ stories"],
  "FE", "L", "index.html prototype"))

E = "Data sources"
p(row("PL-04", "Open Finance account information (Al Tareq / Nebras)", E, "Integration", SYS, "Noor", "MVP",
  "Read accounts, balances, transactions and parties from UAE banks with the customer's consent.",
  ["TPP onboarding on the Al Tareq trust framework", "Consent create, authorise (redirect to bank app or web), token storage, refresh, revoke, expiry",
   "Data clusters: accounts, balances, transactions (12 months), standing orders, direct debits, parties", "Multi-bank; per-bank error handling; rate limits", "Card and loan accounts included"],
  ["One consent per bank today; multi-bank consent if Nebras supports it"],
  ["Licence or partner arrangement", "PL-05"], ["RF features", "CJ-12, CJ-13"],
  "BE, Integration", "XL", "Journey steps 4 and 5",
  ["Noor's regulatory route to AIS (own licence or via a licensed partner)"]))
p(row("PL-05", "Nebras certification and security testing", E, "Compliance", SYS, "Noor", "MVP",
  "Pass the Open Finance conformance and security certification.",
  ["Functional conformance tests", "Security certification (about 2 × USD 5k) plus a pen test", "Evidence pack"],
  ["Needed before production consent"], ["PL-04", "PL-25"], ["Certification"],
  "BE, Ops", "M", "Not in prototype"))
p(row("PL-06", "Transaction categorisation", E, "Tech enabler", SYS, "Noor", "MVP",
  "Categorise every transaction for features and insights.",
  ["Categories: salary, regular income, own transfer, card payment, loan repayment, rent and bills, groceries, transport, dining, airline, international transfer, other",
   "Rules plus model; EN and AR narratives; accuracy ≥ 90% on a labelled sample (to confirm)", "Destination country never stored for transfers"],
  ["Vendor or in-house; labelled dataset needed"], ["PL-04"], ["RF-01 to RF-24"],
  "Data, ML", "XL", "Journey insights",
  ["Build vs buy"]))
p(row("PL-07", "AECB report via the lender", E, "Integration", SYS, "Noor + Partner Bank", "MVP",
  "Pull the AECB consumer (and commercial for SME) report through the licensed lender acting for Noor.",
  ["Consent captured by Noor and passed with the request", "Report and score returned and parsed (RF-33)", "Timeout and retry; cost tracking per pull",
   "No AECB at pre-qualification"],
  ["Federal Law 6/2010; lender pulls on Noor's behalf (precedent with CBUAE approval)"],
  ["Partner Bank AECB membership"], ["RF-33"],
  "BE, Integration", "L", "MEETING-1008-SPEC.md §4",
  ["AECB score via Open Finance being explored with AECB", "Credit Passport vendor for home bureau files (Phase 2)"]))
p(row("PL-08", "UAE PASS identity and signature", E, "Integration", SYS, "Noor", "MVP",
  "Strong identity at final checks and digital signature where Noor signs.",
  ["OAuth login; name, EID number and nationality returned", "Required assurance level", "Digital signature service for documents (if Noor signs any)"],
  ["UAE PASS onboarding as a service provider"], ["UAE PASS onboarding"], ["CJ-20", "RF-12"],
  "BE, Integration", "M", "Journey step 9"))
p(row("PL-09", "Emirates ID OCR", E, "Integration", SYS, "Noor", "MVP",
  "Read the front and back of the Emirates ID.",
  ["Fields: names EN/AR, ID number, nationality, date of birth, expiry, employer, occupation", "Quality checks (glare, blur, crop)", "Images encrypted, kept in Noor"],
  ["Vendor SDK or in-house"], ["Vendor"], ["CJ-11", "RF-65"],
  "FE, Integration", "M", "Journey step 3·2",
  ["Liveness check needed?"]))
p(row("PL-10", "Digital-footprint vendor", E, "Integration", SYS, "Noor", "MVP",
  "Call the footprint vendor with email and phone.",
  ["Called after the terms are accepted", "Minimise at ingestion: store only the lane results and the vendor score", "Retention per PDPL"],
  ["Purpose: identity and security; credit overlay only when LIVE"], ["Vendor contract"], ["RF-62 to RF-64"],
  "BE, Integration", "M", "FOOTPRINT-SPEC.md"))
p(row("PL-31", "FX rates source", E, "Integration", SYS, "Noor", "Phase 2",
  "Daily FX rates to convert home-country statements to AED.",
  ["Daily rates for INR, PKR, EGP and later corridors", "Rate date stored with each conversion"],
  ["Prototype uses fixed demo rates"], ["Rates provider"], ["RF-55"],
  "BE", "S", "engine STATEMENT_FX"))

E = "Partner and payment integrations"
p(row("PL-11", "Outbound partner API and SFTP", E, "Integration", SYS, "Noor", "MVP",
  "Deliver memos to lenders.",
  ["REST with mTLS or OAuth, signed payloads, idempotency keys, retries", "SFTP with PGP, checksums, delivery reports", "Per-agreement schema versions"],
  ["Shared by LP-04 and LP-05"], ["LP-02"], ["LP-04", "LP-05"],
  "BE, Integration", "L", "Lender view API and SFTP tabs"))
p(row("PL-12", "Inbound partner callbacks", E, "Integration", SYS, "Noor", "MVP",
  "Receive lender decisions, execution events and loan status.",
  ["Authenticated webhooks; schema validation; idempotency", "Event order guard for execution steps"],
  ["Used by LP-06, LP-11, LP-13"], ["Partner"], ["Decision records"],
  "BE, Integration", "M", "engine recordEvent()"))
p(row("PL-13", "Repayment collection rails (via botim and the lender)", E, "Integration", SYS, "botim + Partner Bank", "MVP",
  "Direct debit mandate above AED 1,000; Al Tareq recurring payment at or below.",
  ["Noor supplies the best debit date and the method", "Status of the mandate or consent comes back as an event"],
  ["Repayments run by botim's loan flow; Noor applying for a payment-initiation licence"], ["LP-11"], ["Monitoring"],
  "Integration", "S", "Journey step 14",
  ["Noor's own PIS route later"]))
p(row("PL-14", "Notifications service", E, "Tech enabler", SYS, "Noor", "MVP",
  "Send messages on the customer's chosen channels.",
  ["Email, SMS, WhatsApp, push (via botim where possible)", "Templates EN/AR with versioning", "Respect preferences and quiet hours; delivery logs"],
  ["Vendors for SMS, WhatsApp, email"], ["Vendors"], ["CJ-08, CJ-10, CJ-28, CJ-33, UW-05"],
  "BE", "M", "Journey contact step"))

E = "Mizan core platform"
p(row("PL-15", "Decision engine service", E, "Tech enabler", SYS, "Noor", "MVP",
  "Run Mizan as a production service.",
  ["APIs: prequalify, decide, redecide, quote, creditMemo, reproduce", "Deterministic; engine version on every record", "Latency target for decide (excluding AECB)",
   "Port or reuse the prototype engine; carry over the selftest (1,946 checks) as regression"],
  ["Stateless service + stores (PL-16 to PL-19)"], ["PL-16", "PL-17"], ["All products"],
  "BE", "XL", "src/engine.js"))
p(row("PL-16", "Decision store and immutable audit log", E, "Tech enabler", SYS, "Noor", "MVP",
  "Store every decision with its inputs and versions, append-only.",
  ["Inputs snapshot, features, rules, score, limit, outcome, codes, policy and engine versions", "Hash-chained or WORM storage", "Retention and legal hold"],
  ["Basis for Reproduce and audit"], ["PL-27"], ["UW-10, UW-11, RP-18"],
  "BE", "L", "Decision log"))
p(row("PL-17", "Policy store with versioning and 4-eyes", E, "Tech enabler", SYS, "Noor", "MVP",
  "Back end for policy packs, the early-warning block, the reason-code library and sharing agreements.",
  ["Draft, approve, publish; bounds; history; diff", "Approver ≠ author enforced server-side"],
  ["Shared workflow for all governed objects"], ["PL-21"], ["RP-01 to RP-06, LP-02"],
  "BE", "L", "Policy console"))
p(row("PL-18", "Feature store", E, "Tech enabler", SYS, "Noor", "Phase 2",
  "Store computed features per application and refresh, with versioned definitions.",
  ["Point-in-time reads for training", "Feature definitions versioned with documentation"],
  ["Needed for RP-11"], ["PL-16"], ["RP-03, RP-11"],
  "Data", "L", "Not in prototype"))
p(row("PL-19", "Consent registry", E, "Tech enabler", SYS, "Noor", "MVP",
  "Record every consent with version, time and status.",
  ["Terms and privacy versions, AECB consent, Open Finance consent ids, owner consent (SME), contact channels, cooling-off waiver", "Revocation and history", "References for memos"],
  ["Evidence for regulators and partners"], ["PL-16"], ["CJ-07, CJ-30, LP-10"],
  "BE", "M", "Lender view consents"))
p(row("PL-20", "Document store", E, "Tech enabler", SYS, "Noor", "MVP",
  "Store EID images, statements and case files securely.",
  ["Encryption with managed keys", "Access by role, every access logged", "Retention and deletion jobs"],
  ["EID images never leave Noor"], ["PL-25"], ["CJ-11, CJ-35, UW-18"],
  "BE", "M", "JOURNEY-EID-SPEC.md"))
p(row("PL-21", "Back-office app shell (Mizan)", E, "Tech enabler", SYS, "Noor", "MVP",
  "Web app for staff and partners.",
  ["SSO, RBAC, tenant isolation for partners", "Screens: Workbench, Decision log, Policy console, Monitoring, Lender view", "Audit of views"],
  ["Roles from UW-21"], ["PL-25"], ["UW, LP, RP stories"],
  "FE, BE", "L", "Prototype screens"))
p(row("PL-22", "Engine regression suite in CI", E, "Tech enabler", SYS, "Noor", "MVP",
  "Keep the engine's behaviour fixed unless a change is intended.",
  ["Selftest checks and persona fingerprints run on every change", "Golden outputs per persona; diffs reviewed"],
  ["From engine.selftest.js and the acceptance suite"], ["PL-15"], ["Release safety"],
  "BE, QA", "M", "src/engine.selftest.js"))
p(row("PL-23", "Scheduler and background jobs", E, "Tech enabler", SYS, "Noor", "MVP",
  "Run time-based jobs.",
  ["Offer expiry, cooling-off timers, SLA timers, monthly refresh, early-warning scan, SFTP batch, retention jobs", "Idempotent and observable"],
  ["One scheduler for all jobs"], ["PL-15"], ["RF-98, RF-100, UW-09"],
  "BE", "M", "Not in prototype"))
p(row("PL-24", "Data warehouse and BI", E, "Tech enabler", SYS, "Noor", "MVP",
  "Analytics store for dashboards and experiments.",
  ["Pseudonymised decision and event data", "BI tool for RP-16, RP-17, LP-15, UW-20"],
  ["No raw transactions in BI"], ["PL-16"], ["Dashboards"],
  "Data", "L", "Not in prototype"))

E = "Security, privacy and operations"
p(row("PL-25", "Security baseline", E, "Tech enabler", SYS, "Noor", "MVP",
  "Protect customer data and keys.",
  ["Encryption in transit and at rest; HSM or KMS for signing keys", "Secrets management; threat model; OWASP ASVS and web-view hardening", "External pen test before launch"],
  ["CBUAE and partner security requirements"], ["None"], ["All"],
  "BE, Ops", "L", "Not in prototype"))
p(row("PL-26", "PDPL compliance", E, "Compliance", SYS, "Noor", "MVP",
  "Meet the UAE personal data law.",
  ["Data inventory and purposes", "Retention schedule and deletion jobs", "Data subject requests (access, deletion)", "DPIA for credit decisioning and footprint"],
  ["Purpose limitation for monitoring within the Al Tareq consent"], ["PL-19", "PL-20"], ["CJ-30"],
  "BE, Ops", "M", "Not in prototype"))
p(row("PL-27", "UAE hosting, backup and disaster recovery", E, "Tech enabler", SYS, "Noor", "MVP",
  "Host in the UAE with backups and DR.",
  ["UAE cloud region", "Backups tested; RPO and RTO agreed", "Environments: dev, staging, production, partner sandbox"],
  ["Data residency rules to confirm"], ["Cloud contract"], ["All"],
  "Ops", "L", "Not in prototype"))
p(row("PL-28", "Vendor due diligence", E, "Compliance", SYS, "Noor", "MVP",
  "Assess every data and service vendor.",
  ["OCR, footprint, categorisation, SMS/WhatsApp, device intelligence (Phase 2)", "Security, data location, contracts, exit plans"],
  ["Outsourcing rules"], ["Procurement"], ["PL-09, PL-10, PL-06, PL-14"],
  "Ops", "M", "Not in prototype"))
p(row("PL-29", "CI/CD, environments and synthetic data", E, "Tech enabler", SYS, "Noor", "MVP",
  "Build, test and deploy safely.",
  ["Pipelines with tests and approvals", "Synthetic personas for test and sandbox", "Feature flags (e.g. code fallback switch, variant kill switch)"],
  ["Personas from the prototype"], ["PL-22"], ["LP-16"],
  "Ops, QA", "M", "Prototype personas"))
p(row("PL-30", "Observability and alerting", E, "Tech enabler", SYS, "Noor", "MVP",
  "See and react to failures.",
  ["Logs, metrics, traces", "Alerts: bank connection failures per bank, AECB timeouts, partner callback delays, job failures", "Integration health dashboard"],
  ["On-call rota"], ["PL-15"], ["Ops"],
  "Ops", "M", "Not in prototype"))
