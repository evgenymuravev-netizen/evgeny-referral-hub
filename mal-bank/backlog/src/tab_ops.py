from common import row

UW = []
u = UW.append
A = "Underwriter"

E = "Refer queue and case file"
u(row("UW-01", "Refer queue", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I see all referred applications in one queue sorted by SLA, so that I work on the most urgent first.",
  ["Columns: case id, product, amount, referral reasons (rule codes), red-flag chips, time left on SLA, assignee",
   "Filters: product, reason, red flag, SLA state, assignee; sort by SLA", "Counts per state at the top", "Refreshes without reload"],
  ["A case enters on REFER and leaves on a final decision or customer withdrawal"],
  ["RF-78 decision record", "PL-21 back office shell"], ["Queue", "UW-20 metrics"],
  "FE, BE", "M", "Workbench screen · referQueue()"))
u(row("UW-02", "Claim and assign cases", E, "User story", "Underwriter, Team lead", "Noor", "MVP",
  "As an underwriter, I claim a case so no one else works on it; as a team lead, I reassign cases.",
  ["Claim locks the case to me; others see it as read-only", "Lock released on decision or after inactivity", "Team lead can reassign with a note; all changes audited"],
  ["One active owner per case"], ["UW-01", "PL-21 roles"], ["Assignment history"],
  "FE, BE", "S", "Not in prototype"))
u(row("UW-03", "Case file", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I open a case and see everything Mizan used and why it referred, so that I can decide without asking IT.",
  ["Sections: applicant and request; rules table (rule, observed, threshold, result, reason code); score with every point; limit candidates with the binding one; affordability (income, obligations, spending, FCF, DBR); data completeness components; Emirates ID result; footprint lanes; red flags vs own baseline; customer RC_* reasons and library codes",
   "Raw transactions viewable on demand, with access logged", "Read-only; actions in UW-04 to UW-08"],
  ["Shows internal thresholds (internal users only)"],
  ["RF-78", "RF-77", "PL-16"], ["Case view"],
  "FE, BE", "L", "Workbench and Decision log screens"))
u(row("UW-04", "Red-flag review panel", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I see each red flag with what changed against the customer's own history and a plain explanation to read to the customer.",
  ["Per flag: observed, own baseline, threshold, values; EN and AR explanation", "Guardrail reminders shown (refer only, never nationality or destination)",
   "Outcome options: clear the flag, ask the customer, decline with a reason from the allowed list"],
  ["Red flags alone never decline automatically; a human decides"],
  ["RF-42 to RF-44", "RF-49"], ["Flag outcome on the case"],
  "FE", "M", "Workbench red-flag panel · RED-FLAGS-SPEC.md"))
u(row("UW-05", "Ask the customer", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I send the customer a question or a document request, so that I can resolve a referral.",
  ["Templates: explain a transfer, confirm employer, renew ID, connect another account, upload statements", "Sent on the customer's channel; answer comes back into the case",
   "Case goes to 'Waiting for customer' and returns to the queue on answer or after N days"],
  ["askCustomer()"],
  ["PL-15", "CJ-33"], ["Customer task, case state"],
  "FE, BE", "M", "Workbench · engine askCustomer()"))
u(row("UW-06", "Request and review documents", E, "User story", A, "Noor", "Phase 2",
  "As an underwriter, I request home-country statements or other documents and see the parse and integrity result.",
  ["Request creates a customer upload task", "Result: months covered, name match, integrity, FX-converted figures", "Integrity FAIL routes to fraud review (UW-14)"],
  ["requestDocuments(), parseStatements()"],
  ["RF-55", "RF-56", "CJ-35"], ["Evidence on the case"],
  "FE, BE", "M", "Workbench statements · STATEMENTS-SPEC.md"))
u(row("UW-07", "Re-decide with new evidence", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I re-run the decision after new information arrives, and the new decision supersedes the old one.",
  ["redecide() runs the engine with the new inputs and the current policy", "Both decisions kept and linked; customer sees only the latest",
   "Not allowed after the offer was accepted (checkSupersedable)"],
  ["Same deterministic engine as the first decision"],
  ["RF-78"], ["New decision record"],
  "FE, BE", "M", "Workbench · engine redecide()"))
u(row("UW-08", "Override with reason and 4-eyes", E, "User story", "Underwriter, Senior underwriter", "Noor", "MVP",
  "As an underwriter, I can change an outcome or amount within my authority with a reason; above it, a second approver signs off.",
  ["Override reason code and note required", "Never above regulatory caps (DBR 50%/30%, 20× salary, 48 months, LTV 80%)",
   "Grade D approvals and amounts above authority need a second approver who is not the author", "Override rate reported (UW-20)"],
  ["Authority matrix from RP-08"],
  ["RP-08", "PL-16"], ["Override record", "Audit"],
  "FE, BE", "M", "Workbench · engine override()"))
u(row("UW-09", "SLA timers and escalation", E, "Feature", "Team lead", "Noor", "MVP",
  "As a team lead, I see cases near their SLA and get alerts on breaches.",
  ["SLA per referral type (e.g. 4 business hours, to be set)", "Business-hours calendar (UAE week, public holidays)", "Escalation alert to team lead; customer ETA shown in the journey"],
  ["SLA values are a policy setting"],
  ["UW-01", "PL-30 jobs"], ["Alerts"],
  "BE", "S", "Not in prototype"))

E = "Decision log and audit"
u(row("UW-10", "Decision log", E, "User story", "Underwriter, Auditor", "Noor", "MVP",
  "As an underwriter or auditor, I search all decisions and open any record.",
  ["Search by id, customer, product, outcome, date, rule fired, reason code", "Record view: same sections as the case file plus execution events", "Export to CSV for a date range (role-restricted)",
   "Deep link to a record (#log)"],
  ["Internal only; shows thresholds and component drivers"],
  ["PL-16"], ["Decision log screen"],
  "FE, BE", "M", "Decision log screen"))
u(row("UW-11", "Reproduce a decision", E, "User story", "Auditor, Underwriter", "Noor", "MVP",
  "As an auditor, I re-run a stored decision with its stored inputs, policy version and engine version and get the same result.",
  ["Identical output, or a diff that names the field that changed", "Works for any decision in retention"],
  ["reproduceDecision(): stored inputs + stored policy version + engine version"],
  ["PL-16", "PL-22 engine versioning"], ["Reproduce report"],
  "FE, BE", "M", "Decision log 'Reproduce' · MEETING-1008-SPEC.md §1c"))
u(row("UW-12", "Score explanation", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I see how each feature moved the score.",
  ["Phase 1: scorecard points per feature with base and total", "Phase 2: SHAP values per feature for the trained model"],
  ["scoreContributions()"],
  ["RF-70", "RP-12"], ["Explanation panel"],
  "FE", "S", "Decision log · engine scoreContributions()"))
u(row("UW-13", "Credit memo preview", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I see exactly what the lender will receive before it is sent.",
  ["Same rendering as the Lender view for the case's lender and agreement", "Highlights partner-specific codes"],
  ["creditMemo(decisionId, {lenderId})"],
  ["LP-03"], ["Preview"],
  "FE", "S", "Lender view"))

E = "Fraud review"
u(row("UW-14", "Fraud review queue", E, "User story", "Fraud analyst", "Noor", "MVP",
  "As a fraud analyst, I review cases with integrity failures or identity mismatches.",
  ["Entry: statement integrity FAIL, ID name ≠ account holder, employer mismatch with other signals, ATO ELEVATED with other signals",
   "Outcomes: clear, decline with R01, escalate to compliance for a suspicious-activity report", "Separate permission from underwriting"],
  ["Never automatic decline from a single signal"],
  ["RF-12", "RF-56", "RF-63"], ["Fraud outcome", "Compliance referral"],
  "FE, BE", "M", "Decision log Fraud & Integrity",
  ["Process for suspicious-activity reports (goAML) to agree with compliance"]))

E = "Monitoring and collections"
u(row("UW-15", "Early-warning case queue", E, "User story", "Collections specialist", "Noor", "Phase 2",
  "As a collections specialist, I work early-warning cases by severity and SLA and record the contact and outcome.",
  ["Cases from RF-100 with severity, pattern, SLA (8 h, 4 h, 24 h)", "Action ladder shown; offers: payment-date move, restructure, payment holiday (SME)",
   "Outcome codes; case closes with outcome", "No default, legal step or account action from signals alone"],
  ["Ladder from RF-48"],
  ["RF-100", "RF-48", "PL-15"], ["Contact outcome", "Lender status (LP-14)"],
  "FE, BE", "L", "Monitoring screen"))
u(row("UW-16", "Contact log and scripts", E, "User story", "Collections specialist, Underwriter", "Noor", "Phase 2",
  "As a specialist, I record every call or message with the customer and use approved scripts in EN and AR.",
  ["Log: channel, time, outcome, note", "Scripts generated from the reason codes and flags"],
  ["Collections conduct rules (CBUAE consumer protection)"],
  ["PL-15"], ["Contact history"],
  "FE, BE", "M", "Monitoring screen"))
u(row("UW-17", "Customer 360", E, "User story", "Underwriter, Collections specialist", "Noor", "Phase 2",
  "As a staff member, I see one customer's applications, decisions, loans, consents and contact preferences in one place.",
  ["Timeline of events", "Links to records", "Access logged"],
  ["Data minimisation: raw data on demand only"],
  ["PL-16", "PL-19"], ["Customer view"],
  "FE, BE", "M", "Not in prototype"))
u(row("UW-18", "Case notes and attachments", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I add internal notes and files to a case.",
  ["Notes are internal, never in the memo", "Attachments stored in the document store with access control"],
  ["Retention per policy"], ["PL-20"], ["Case notes"],
  "FE, BE", "S", "Not in prototype"))
u(row("UW-19", "Lender decline or counter handling", E, "User story", A, "Noor", "MVP",
  "As an underwriter, I see when the lender declines or counters after Noor's approval and can tell the customer the next step.",
  ["Lender response with reason on the case", "Options: accept counter on the customer's behalf (with consent), close, route to another lender (Phase 2)"],
  ["LP-06 callback"], ["LP-06"], ["Case state"],
  "FE, BE", "S", "Journey step 11"))
u(row("UW-20", "Underwriting team metrics", E, "Feature", "Team lead", "Noor", "Phase 2",
  "As a team lead, I see cases per underwriter, time to decide, override rate and approval rate.",
  ["Daily and weekly views", "Drill-down to cases"],
  ["From the decision store"], ["PL-32"], ["Dashboard"],
  "FE, Data", "M", "engine metrics()"))
u(row("UW-21", "Back-office roles and permissions", E, "Feature", "Admin", "Noor", "MVP",
  "As an admin, I give each staff member a role: underwriter, senior underwriter, fraud analyst, collections specialist, risk policy owner, compliance, auditor (read-only), partner user.",
  ["Least privilege; raw data access separate permission", "SSO; every view of customer data logged"],
  ["RBAC in PL-21"], ["PL-21"], ["Access control"],
  "BE", "M", "Not in prototype"))

LP = []
p = LP.append
PB = "Partner Bank credit officer"
PI = "Partner Bank integration engineer"

E = "Partner set-up and agreements"
p(row("LP-01", "Lender profile", E, "User story", "Noor partnerships manager", "Noor", "MVP",
  "As a partnerships manager, I set up a lender with its products, channels and contacts.",
  ["Fields: name, short code (e.g. PB), products, channels (UI, API, SFTP), contacts, status", "Changes audited"],
  ["lendersList(), lenderFor()"], ["PL-21"], ["Lender record"],
  "FE, BE", "S", "Lender view lender switch"))
p(row("LP-02", "Versioned sharing agreement", E, "User story", "Noor partnerships manager, Compliance", "Noor", "MVP",
  "As Noor, we agree with each lender exactly which outputs and codes they receive, versioned and approved by two people.",
  ["Groups: score and band, reason codes, component levels, affordability aggregates, completeness, monitoring status, consent references",
   "Settings: dbrPrecision BAND or EXACT; list of partner codes", "Partner Bank v1 = Core + Proposed + extras; Lender B = Core only", "4-eyes; history of versions"],
  ["The memo allowlist is built from the agreement"],
  ["RP-02 workflow", "PL-17"], ["Agreement version", "Memo, SFTP"],
  "FE, BE", "M", "Lender view 'Sharing agreement' · MEETING-1008-SPEC.md §1b"))
p(row("LP-03", "Lender view: credit memo screen", E, "User story", PB, "Noor", "MVP",
  "As a Partner Bank credit officer, I see the credit memo for my cases: NoorScore and band, reason codes, completeness, and the agreed aggregates.",
  ["Output table: output, what it tells, Core or Proposed, value", "Reason codes as coloured chips (green, yellow, red) with a legend",
   "Completeness ring with %, banks, accounts, months; no threshold", "Bands for income, additional income, DBR, headroom; component bars with level words",
   "Never: thresholds, band boundaries, weights, data-source names, raw data, EID images", "Lender sees only its own cases; deep link #lender"],
  ["Banner: 'The set of aggregates is open: we are flexible and want to hear what each partner needs to see.'"],
  ["RF-80", "RF-81", "RF-77", "LP-02"], ["Lender UI"],
  "FE, BE", "L", "Lender view screen · LENDER-VIEW-SPEC.md"))
p(row("LP-04", "Credit memo API", E, "Integration", PI, "Noor", "MVP",
  "As the Partner Bank integration engineer, I receive each memo as signed JSON over an API, so that our systems can book the loan.",
  ["Push on Noor approval (or pull by decision id)", "Auth: mTLS or OAuth client credentials; payload signed; idempotency key",
   "Schema versioned and tied to the agreement version", "Retries with back-off; dead-letter alert", "Contract tests with the partner sandbox"],
  ["memoApiPayload()"],
  ["PL-11", "LP-02"], ["Memo at partner"],
  "BE, Integration", "L", "Lender view API tab"))
p(row("LP-05", "Credit memo SFTP file", E, "Integration", PI, "Noor", "Phase 2",
  "As a partner without an API, I receive a daily file with one row per memo.",
  ["CSV columns follow the agreement (incl. reason_codes as G02|G03|…, data_completeness_pct, data_sources)", "PGP-encrypted, checksum, naming convention, delivery report"],
  ["memoSftpRow()"],
  ["PL-11", "PL-30"], ["File at partner"],
  "BE, Integration", "M", "Lender view SFTP tab"))
p(row("LP-06", "Lender decision callback", E, "Integration", PI, "Noor", "MVP",
  "As the lender, I send accept, decline or counter for each memo back to Noor.",
  ["Idempotent callback with reason code", "Noor updates the case and the customer status", "SLA monitoring on partner responses"],
  ["Counter must stay within Noor's approved caps"],
  ["PL-12"], ["Status on the decision"],
  "BE, Integration", "M", "Journey step 11"))
p(row("LP-07", "Lender policy loaded into Mizan", E, "User story", "Partner Bank risk manager", "Noor", "MVP",
  "As Partner Bank's risk manager, our credit criteria run inside Mizan, so that Noor only recommends loans we will approve.",
  ["Lender pack: eligibility, caps, pricing bands, products", "Read-only line on the personal-loan pack: 'Lender policy: Partner Bank, loaded into Mizan'",
   "Changes under 4-eyes on both sides; version on every decision"],
  ["Engine applies min(Noor policy, lender policy, regulatory caps)"],
  ["RP-02", "PL-17"], ["Lender pack", "Decisions"],
  "BE", "L", "Policy console · MEETING-1008-SPEC.md §6"))
p(row("LP-08", "Partner-requested reason codes", E, "User story", PB, "Noor", "MVP",
  "As a lender, I can ask Noor for a reason code that matters to us, and it appears only in our memos once approved.",
  ["Request captured with the partner's wording and purpose", "Built in the rule builder from whitelisted metrics only (RP-06)",
   "PROPOSED → 4-eyes approval → ACTIVE and agreement version bumped (e.g. Partner Bank v1 → v2)", "Seeded: PR-PB-G01 Salary Through WPS (active), PR-LB-Y01 Variable Pay Above 30% (proposed)"],
  ["Forbidden metrics (nationality, sex, age, religion, health, family, free text) are rejected"],
  ["RP-06", "RF-80"], ["Partner code", "Memo"],
  "FE, BE", "M", "Policy console library · REASON-CODES-SPEC.md §3"))
p(row("LP-09", "Reason-code library for partners", E, "Feature", PB, "Noor", "MVP",
  "As a lender, I get a reference of the codes I can receive: code, colour, label EN and AR, what it tells me.",
  ["Generated per agreement version", "No rules or thresholds"],
  ["reasonCodeLibrary() filtered to the agreement"], ["RP-06", "LP-02"], ["Partner documentation"],
  "BE", "S", "REASON-CODES-SPEC.md"))
p(row("LP-10", "Consent references in the memo", E, "Feature", PB, "Noor", "MVP",
  "As a lender, I get references proving the customer consented: credit report, Open Finance, terms version, KFS and signature references.",
  ["Reference ids and timestamps only, no documents", "Retrievable on audit request"],
  ["memoConsents()"], ["PL-19"], ["Memo consent block"],
  "BE", "S", "Lender view consents"))

E = "Execution and servicing"
p(row("LP-11", "Execution status events", E, "Integration", PI, "botim + Partner Bank", "MVP",
  "As Noor, we receive each execution step (offer accepted, KFS acknowledged, signed, repayment set up, cooling-off cleared, disbursed) to keep the record complete.",
  ["Events in the only valid order; out-of-order events rejected with the guard text", "Disbursal date starts monitoring"],
  ["EXEC_EVENTS order"],
  ["PL-12"], ["Execution events on the decision"],
  "BE, Integration", "M", "Journey steps 12 to 16 · engine recordEvent()"))
p(row("LP-12", "Disbursement confirmation and reconciliation", E, "Integration", "Partner Bank operations", "Partner Bank", "MVP",
  "As Noor, we reconcile funded loans with the lender monthly for fees and reporting.",
  ["Monthly file of funded loans; mismatches flagged"],
  ["Commercial terms per agreement"], ["PL-12"], ["Reconciliation report"],
  "BE", "S", "Not in prototype"))
p(row("LP-13", "Repayment and loan status feed", E, "Integration", PI, "Partner Bank", "Phase 2",
  "As Noor, we receive repayments, days past due and settlements per loan, for monitoring and for training the Phase 2 model.",
  ["Daily or event feed: payment due, paid, missed, DPD, settled", "Linked to the decision id"],
  ["Required for RF-46 and RP-11"],
  ["PL-12"], ["Loan performance data"],
  "BE, Integration", "M", "Not in prototype",
  ["Data-sharing terms for performance data with each lender"]))
p(row("LP-14", "Early-warning status flag to the lender", E, "Feature", PB, "Noor", "Phase 2",
  "As the lender of record, I get only a status flag when Noor is working an early-warning case.",
  ["Text: 'Early warning: elevated, Noor is in contact with the customer'", "Never values or account history"],
  ["Sent on HIGH severity"], ["RF-100"], ["Lender status"],
  "BE", "S", "Monitoring screen"))
p(row("LP-15", "Partner portfolio dashboard", E, "User story", "Partner Bank risk manager", "Noor", "Phase 2",
  "As the lender's risk manager, I see volumes, approval rates, band mix, funded loans and early-warning counts for my portfolio.",
  ["Filters by month, product, band", "Only aggregated data"],
  ["From the decision store and the lender feed"], ["PL-32", "LP-13"], ["Dashboard"],
  "FE, Data", "M", "Not in prototype"))
p(row("LP-16", "Partner sandbox and test personas", E, "Feature", PI, "Noor", "MVP",
  "As the integration engineer, I test against a sandbox with synthetic customers that give known outcomes.",
  ["Personas (e.g. Ravi approve, r6 refer with red flags, newcomer, short history, integrity fail)", "Same API and agreement as production", "Certification checklist"],
  ["Fixtures from the prototype selftest"], ["PL-29"], ["Sandbox"],
  "BE", "M", "Prototype personas"))
p(row("LP-17", "Decision explanation package on request", E, "Feature", "Partner Bank risk manager, Regulator", "Noor", "Phase 2",
  "As a lender or regulator, I can request an explanation for a decision: codes, inputs summary and policy version, without the methodology.",
  ["Generated from Reproduce", "Delivered within the agreed SLA"],
  ["Noor IP stays inside Noor"], ["UW-11"], ["Explanation pack"],
  "BE", "S", "MEETING-1008-SPEC.md §1c"))
p(row("LP-18", "Second lender and routing", E, "User story", "Noor partnerships manager", "Noor", "Phase 2",
  "As Noor, we route an approved case to the right lender based on agreements and lender policies.",
  ["Lender B gets a Core-only memo", "Routing rule per product and lender appetite", "Customer sees the lender of record"],
  ["Multi-lender policy evaluation"], ["LP-07", "LP-02"], ["Routing"],
  "BE", "L", "Lender view lender switch"))
p(row("LP-19", "Partner user access", E, "Feature", PB, "Noor", "MVP",
  "As a partner user, I sign in to the Lender view with my bank's identity and see only my bank's cases.",
  ["SSO (SAML or OIDC) per partner", "Roles: viewer, approver", "Every view logged"],
  ["Tenant isolation per lender"], ["PL-21"], ["Access"],
  "BE", "M", "Lender view"))
p(row("LP-20", "Product-specific memo blocks", E, "Feature", PB, "Noor", "Phase 2",
  "As a lender, the memo carries the extra fields for car and SME loans.",
  ["Car: vehicle, LTV, down payment, mortgage flag", "SME: DSCR band, revenue band, licence age band, guarantee status, masked trade licence"],
  ["smeMemo(), memoCarFlags()"], ["RF-82", "RF-89", "RF-90"], ["Memo"],
  "BE, FE", "M", "Car and SME memo"))
p(row("LP-21", "Commercial reporting and billing data", E, "Feature", "Noor finance", "Noor", "Phase 2",
  "As Noor finance, we get monthly funded volumes and fees per lender for invoicing.",
  ["Monthly export by lender and product"], ["Fee model per agreement"], ["LP-12"], ["Invoice data"],
  "Data", "S", "Not in prototype"))

RP = []
r = RP.append
RO = "Risk policy owner"

E = "Policy console"
r(row("RP-01", "Policy packs per product", E, "User story", RO, "Noor", "MVP",
  "As the risk policy owner, I see each product's policy: locked regulatory rules and editable parameters with their bounds.",
  ["Locked block: DBR caps, 20× salary, tenor caps, LTV, cooling-off, AECB required", "Params with current value and bounds", "Platform rule shown read-only (repayment routing)"],
  ["getPolicy(); hard caps also enforced in the engine"],
  ["PL-17"], ["Policy console"],
  "FE, BE", "M", "Policy console screen"))
r(row("RP-02", "Edit, approve and publish with 4-eyes", E, "User story", "Risk policy owner, Approver", "Noor", "MVP",
  "As the risk policy owner, I draft parameter changes; a second person approves before they go live.",
  ["Bounds validated inline", "Approver must differ from the author", "Version history with diff of changed leaves", "Every decision records the policy version",
   "Covers the completeness threshold (50 to 90) and the early-warning block"],
  ["publishPolicy(), leafChanges()"],
  ["PL-17"], ["New policy version"],
  "FE, BE", "M", "Policy console · engine publishPolicy()"))
r(row("RP-03", "Simulation before publish", E, "User story", RO, "Noor", "MVP",
  "As the risk policy owner, I run a draft policy on a sample book and see the impact before approving.",
  ["Approval rate, refer rate, average amount, band mix, before vs after", "Cases whose outcome changed listed", "Sample book: historical decisions (production) or synthetic (now)"],
  ["simulateBook()"],
  ["PL-16", "PL-18"], ["Simulation report"],
  "FE, BE", "L", "Policy console simulation"))
r(row("RP-04", "Early-warning block settings", E, "User story", RO, "Noor", "MVP",
  "As the risk policy owner, I tune the red-flag thresholds within bounds; guardrails stay locked.",
  ["Params and bounds as in RF-42 to RF-46", "Guardrails and action ladder shown as locked text", "Simulation on the book (simulateEarlyWarning)"],
  ["Remittance multiple never below 1.5×"],
  ["RP-02"], ["Block version"],
  "FE, BE", "M", "Policy console early-warning block"))
r(row("RP-05", "Pricing and product parameters", E, "User story", RO, "Noor", "MVP",
  "As the risk policy owner, I set pricing bands, product caps and fees.",
  ["Pricing bands by grade per product", "Split fee rates and capacity multiples", "Starter tenor curve with invariant checks"],
  ["starterInvariants() on publish"], ["RP-02"], ["Pack params"],
  "FE, BE", "S", "Policy console"))
r(row("RP-06", "Reason-code library admin", E, "User story", "Risk policy owner, Compliance", "Noor", "MVP",
  "As the risk policy owner, I manage the reason-code library in three colours and create partner codes safely.",
  ["Groups Green, Yellow, Red with code, labels EN and AR, what it tells, component, source, status, receivers, internal rule (marked inside Noor)",
   "New code form: partner, colour (3 options), labels, tells, component, rule (whitelisted metric, op, value), author",
   "Approve (4-eyes) and retire actions; label hygiene checks (no thresholds, no data-source names except Open Finance, no protected attributes)"],
  ["proposeReasonCode(), approveReasonCode(), retireReasonCode()"],
  ["PL-17"], ["Library version", "Agreements"],
  "FE, BE", "M", "Policy console library · REASON-CODES-SPEC.md"))
r(row("RP-07", "Footprint overlay SHADOW to LIVE", E, "User story", "Risk policy owner, Model validator", "Noor", "Phase 2",
  "As the risk policy owner, I switch the footprint credit overlay to LIVE only after the shadow results are reviewed.",
  ["Shadow report: overlay vs outcomes", "Switch is a 4-eyes publish", "Disparate-impact test attached"],
  ["footprintOverlayMode SHADOW or LIVE"], ["RF-64", "RP-13"], ["Mode change"],
  "FE, BE, Data", "S", "Policy console"))
r(row("RP-08", "Underwriter authority matrix", E, "User story", "Head of credit", "Noor", "MVP",
  "As head of credit, I set what each underwriter level can approve or override.",
  ["Limits by amount, grade and product", "Effective date and history"],
  ["Used by UW-08"], ["RP-02"], ["Authority matrix"],
  "FE, BE", "S", "Not in prototype"))
r(row("RP-09", "Collections and offer settings", E, "User story", "Head of collections", "Noor", "Phase 2",
  "As head of collections, I configure the offers available on early-warning cases.",
  ["Payment-date move rules, restructure options, SME payment holiday", "SLAs per severity (locked defaults 8 h, 4 h, 24 h)"],
  ["Ladder text stays locked"], ["RF-48"], ["Settings"],
  "FE, BE", "S", "Monitoring"))

E = "Models and governance"
r(row("RP-10", "Model inventory and documentation", E, "Compliance", "Model risk, Compliance", "Noor", "MVP",
  "As model risk, we keep an inventory of every scorecard and model with version, owner, documentation and validation status.",
  ["scorecard_v0 0.4, cashflow_scorecard_v0 0.1, sme_cashflow_scorecard_v0 0.1", "Feature-by-feature documentation", "Alignment with CBUAE AI/ML guidance"],
  ["Each decision records model and version"], ["PL-16"], ["Inventory"],
  "Data", "S", "Decision log model line"))
r(row("RP-11", "Performance data pipeline (DPD feedback)", E, "Tech enabler", "Data scientist", "Noor", "Phase 2",
  "As a data scientist, I get each decision's feature snapshot joined with its repayment outcome, to train and validate models.",
  ["Join decision features (point in time) with DPD30, DPD60, DPD90 from the lender feed", "Vintage tables", "Data quality checks"],
  ["Point-in-time correctness"], ["LP-13", "PL-18"], ["Training dataset"],
  "Data", "L", "MEETING-1008-SPEC.md §1c"))
r(row("RP-12", "Phase 2 model trained on repayments", E, "Feature", "Data scientist", "Noor", "Later",
  "As Noor, we replace the expert scorecard with a model trained on repayment data, keeping it explainable.",
  ["Monotonic constraints where expected", "SHAP explanations per decision", "Shadow run vs scorecard before LIVE", "Validation report and approval"],
  ["Gradient-boosted or logistic model (to decide)"],
  ["RP-11", "RP-13", "RP-14"], ["Model v1", "UW-12 SHAP"],
  "ML, Data", "XL", "MEETING-1008-SPEC.md §1c"))
r(row("RP-13", "Shadow mode for challengers", E, "Tech enabler", "Data scientist", "Noor", "Phase 2",
  "As a data scientist, I run a challenger model or overlay in shadow and compare it with the champion.",
  ["Challenger output logged, never applied", "Comparison report"],
  ["Same inputs as champion"], ["PL-22"], ["Shadow logs"],
  "BE, Data", "M", "Footprint SHADOW mode"))
r(row("RP-14", "Fair lending and disparate-impact testing", E, "Compliance", "Model risk, Compliance", "Noor", "MVP",
  "As compliance, we test outcomes across customer groups before any rule or model goes live.",
  ["Group labels used only for the test, never as features", "Report per release", "Required before LIVE for red flags and overlays"],
  ["Offline test"], ["PL-32"], ["Test report"],
  "Data", "M", "Early-warning guardrails"))
r(row("RP-15", "NoorScore v2 design (independent of AECB)", E, "Feature", "Head of risk", "Noor", "Later",
  "As Noor, we define a NoorScore on 0 to 1,000 scale, relative to the loan amount, with AECB as an optional add-on.",
  ["Scoring rules for the four score components defined", "Back-test on Phase 1 decisions"],
  ["Pending a decision"], ["RF-77", "RP-11"], ["Score v2 spec"],
  "ML, BE", "XL", "MEETING-1008-SPEC.md §7", ["Pending decision"]))

E = "Analytics and reporting"
r(row("RP-16", "Portfolio risk dashboard", E, "User story", "Head of risk", "Noor", "MVP",
  "As head of risk, I see approval, refer and decline rates, reasons, grade mix, override rate, completeness distribution and early-warning counts.",
  ["Daily refresh", "Filters by product, lender, variant", "Drill-down to decisions"],
  ["From the decision store"], ["PL-32"], ["Dashboard"],
  "Data, FE", "M", "engine metrics()"))
r(row("RP-17", "A/B experiment analysis", E, "User story", "Product analyst", "Noor", "MVP",
  "As a product analyst, I compare variant A and B on the funnel and on funded rate with a significance test.",
  ["Funnel by variant and surface", "Sample-size tracker (about 13,809 per arm)", "Two-proportion test on funded rate"],
  ["Pre-registered metric and stop rule"], ["CJ-41", "CJ-42", "PL-32"], ["Experiment report"],
  "Data", "M", "Journey experiment panel"))
r(row("RP-18", "Regulatory and audit export", E, "Compliance", "Compliance", "Noor", "MVP",
  "As compliance, I export decisions, policy versions, approvals and overrides for a period on request.",
  ["Export by date range", "Includes policy and model versions", "Access restricted and logged"],
  ["From PL-16 and PL-17"], ["PL-16", "PL-17"], ["Export file"],
  "BE", "S", "Decision log export"))
