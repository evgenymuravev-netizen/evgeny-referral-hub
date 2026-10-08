# Addendum v2.16 — Emirates ID (front + back) in the journey; employer cross-checked against Open Finance salary credits — binding spec

Source: Noor product request (8 Oct 2026): "Emirates ID front and back add to the journey so we can check from
Open Finance if he is getting [salary] from the same company."

**Why.** A resident's Emirates ID shows the **employer** and **occupation** on the back. Open Finance shows
**who actually pays the salary**: the payer name on the monthly salary credit, usually a WPS transfer.
Matching the two:
- strengthens income verification;
- catches a mismatch: a job change, an outdated card, or a salary that isn't what it looks like.

A mismatch is a **REFER**, never a decline. The usual reason is a recent job change.

## 1. Journey: new sub-step 3·2 "Scan your Emirates ID"

**Position.** It sits after the email step (3·1) and before "Connect your bank accounts" (4), in both
variants. It takes the slot the contact screen left in v2.13.

**Screen:**
- Title "Scan your Emirates ID". Line: "Front and back — we read your name, ID number, expiry and, from the
  back, your employer."
- Two capture tiles, **Front** and **Back**. Tapping one shows a simulated camera frame (a card outline, "Hold
  steady…") for about a second, then "Captured" with the fields read. Draw a neutral card shape; never a
  real card image.
  - **Front:** name in English and Arabic (Ravi Kumar / رافي كومار), ID number masked `784-••••-•••••••-4`,
    date of birth (for the age check), expiry.
  - **Back:** occupation (Warehouse Supervisor) and employer (**Dunecrest Logistics LLC**, a fictitious
    company).
- A muted line: "We don't keep the photos, and we don't read your nationality or sex — Noor doesn't need them."
- Continue is enabled when both sides are captured. "Retake" is available per side.

**The cross-check result appears once the accounts are read:** in the step-7 budget view (sub 2), add a
check row:
- "Employer · Emirates ID: Dunecrest Logistics LLC ↔ salary credits: 'SALARY/WPS DUNECREST LOGISTICS' — match ✓";
- plus "Name on ID matches the account holder ✓".

**Final checks and the offer:** the rule list includes the two new rules (§2) as PASS.

**Behind the scenes for 3·2:**
- "The back of a resident's Emirates ID shows the employer. Once the accounts are connected, Mizan checks
  that the salary credits come from the same company (the WPS payer name) and that the name on the card
  matches the account holder.
- A match strengthens income verification. A mismatch refers the application to a person — usually it's a
  job change, solved with a salary certificate — never an automatic decline.
- Data minimisation (PDPL): Noor extracts name, ID number, date of birth, expiry, occupation and employer;
  nationality and sex are on the card but not read, and the photos aren't kept.
- In production, validate the card against official records through an approved e-KYC provider, with a
  liveness check — confirm with compliance."

**A what-if on the same panel:** a button "What if the salary came from another company?" runs a **pure**
check (no record) with the payer "SALARY/WPS PALMGATE TRADING" and shows:
- "Mismatch → REFER (RC_EMPLOYER_MISMATCH): we'd ask for a salary certificate or an employment letter."

**Step list:** add 3·2 "Scan your Emirates ID".

**Flow map phase 2:** the detail becomes "Web-view · account · email · Emirates ID". Update its Customer /
Mizan / Rule copy.

## 2. Engine (additive)

**Data on j1:**
- `emiratesId`:
  - `front: { nameEn:'Ravi Kumar', nameAr:'رافي كومار', idMasked:'784-••••-•••••••-4', dob:'1995-03-14', expiry:'2028-02-09' }`;
  - `back: { occupation:'Warehouse Supervisor', employer:'Dunecrest Logistics LLC', issuingPlace:'Dubai' }`.
  - No nationality or sex fields.
- Connected-account data:
  - `connected.salaryPayer: 'SALARY/WPS DUNECREST LOGISTICS'`;
  - each account carries `holderName: 'RAVI KUMAR'`.
- Ravi's age (31) is consistent with the date of birth as of the prototype's TODAY.

**`checkEmiratesId(applicant, scan, opts?)`** is pure. It returns:

```
{ fieldsRead:[...], notRead:['nationality','sex','photos'], expiryValid, ageFromDob,
  nameMatch:{ idName, accountHolder, match },
  employerMatch:{ idEmployer, salaryPayer, score, match } }
```

- **Employer matching** normalises both strings. It uppercases, removes legal suffixes (LLC, L.L.C, FZE,
  FZCO, LTD, CO), removes SALARY, WPS, SAL and '/', and expands common abbreviations (SVCS → SERVICES,
  TRDG → TRADING, LOG → LOGISTICS).
  - It then compares token overlap: **match when ≥ 70% of the employer's tokens appear in the payer**.
  - "Dunecrest Logistics LLC" vs "SALARY/WPS DUNECREST LOGISTICS" → match.
  - vs "SALARY/WPS PALMGATE TRADING" → no match.
- `opts.salaryPayer` overrides the payer for the what-if.

**`decide()`** accepts `application.emiratesId = { front, back }` (or `true` to use the persona's record).
When it is present:
- add a data pull `EMIRATES_ID` ("front + back scanned");
- add the features `idExpiryValid`, `idNameMatch`, `employerMatch` and `employerMatchScore`;
- add rule `POL_ID_VALID`: PASS when not expired; an expired card → REFER with RC_ID_EXPIRED;
- add rule `POL_EMPLOYER_MATCH`:
  - with Open Finance and a salary payer: PASS on a match; a mismatch → REFER with RC_EMPLOYER_MISMATCH;
  - without Open Finance: INFO ("checked once accounts are connected").
- Never DECLINE on these rules, and never change the price.

**New reason codes (EN + Arabic, customer-safe):**
- RC_EMPLOYER_MISMATCH: "Your salary comes from a different company than your Emirates ID shows — maybe you
  changed jobs? A salary certificate or employment letter will sort it out."
- RC_ID_EXPIRED: "Your Emirates ID has expired — please renew it or scan your new card."

**For Ravi (with a match):** every number is unchanged. That covers prequal, the caps, 15,000 / 12 / 8.99% /
1,311.70, NoorScore 737 and the memo shape. The v2.9 fingerprints must still match.

**Memo** (allowlist): the identity flag becomes "Verified (UAE PASS) · Emirates ID front + back · employer
matches salary payer". Neither the employer name nor the payer string goes to the lender; only the masked ID
the memo already carries. Add the employer, payer, date of birth and occupation to the memo privacy scan.

**Red-flag guardrail (v2.9):** `checkEmiratesId` must not read nationality. Add a test that a scan carrying
a nationality field gives an identical result.

## 3. Tests

**Selftest:**
- `checkEmiratesId` for j1: match, name match, expiry valid, age 31, notRead lists nationality / sex / photos;
- the Palmgate payer → no match;
- the normalisation cases (suffixes, abbreviations);
- decide() with the ID:
  - the pull and both rules PASS;
  - Ravi's numbers are unchanged;
  - a mismatch clone → REFER with RC_EMPLOYER_MISMATCH, not a decline, same price band;
  - an expired clone → REFER with RC_ID_EXPIRED;
  - no Open Finance → INFO;
- the nationality-field clone gives an identical result;
- the memo shows the flag only, and the privacy scan passes;
- existing checks stay green.

**Browser acceptance:**
- 3·2 appears after 3·1 in both variants;
- Continue is disabled until both sides are captured;
- the captured fields show, masked;
- the "not read" line is present;
- the budget view shows the employer ↔ payer match row and the name match;
- the what-if button shows the REFER explanation and creates no new Decision-log entry;
- the decision has an EMIRATES_ID pull and POL_EMPLOYER_MATCH PASS;
- the memo flag;
- update the existing walks with the extra captures, keep their intent, and list them;
- 390px; zero page errors; light and dark themes.
