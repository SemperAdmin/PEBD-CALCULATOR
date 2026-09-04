# Handoff: PLC officer candidate creditability (37 U.S.C. 205(f)) and MCTFS cross-checks

Branch: `claude/calculation-analysis-baseline-dgy21y`
Status: specification only. No application code has changed yet. Implement locally from this document.

## Why this exists

A live case audit found the calculator produces correct arithmetic but has no way to express the rule
governing Platoon Leaders Class (PLC) officers, and no validation to catch the most common PEBD error on
officer records. The fact pattern below is anonymized. Do not add any real Marine's data to the repository.

## Governing rule

- 37 U.S.C. 205(a): every period of service as a member of a Reserve component counts toward basic pay
  longevity, active or inactive.
- 37 U.S.C. 205(f): for an officer commissioned after receiving PLC financial assistance under
  10 U.S.C. 16401, service after 1 January 2000 performed concurrently as an enlisted PLC member and
  Marine Corps Reserve member is excluded, except time on active duty and time as a Selected Reserve member.
- Consequence: a PLC officer's PEBD is either the original PLC enlistment date (no financial assistance)
  or the start of continuous commissioned service backed up only by OCS active duty for training
  (financial assistance received, non-SelRes). A PEBD equal to the OCS report date has no rule behind it.

Open legal questions to resolve with MMPB-21 before hard-coding beyond the spec:
1. 205(f) names officers appointed under 10 U.S.C. 12203 (Reserve). Current PLC graduates receive regular
   appointments under 10 U.S.C. 531. Confirm how DFAS applies 205(f) to 531 appointees.
2. Confirm the three ROTC rows in SERVICE_TYPES against the current DoDFMR Vol 7A Chapter 1 text.
   10 U.S.C. 2107 carries a parallel financial assistance exclusion. Leave the ROTC rows alone until confirmed.

## Anonymized fact pattern used for the new example and tests

| Date | Event |
|---|---|
| 20200915 | Enlisted USMCR as a PLC officer candidate, E1, inactive, non-drilling |
| 20210522 to 20210730 | OCS active duty for training |
| 20210731 to 20220616 | PLC officer candidate, inactive, non-drilling |
| 20220617 | Date of rank, 2ndLt |
| 20220725 | Reported to active duty (TBS), continuous to present |

Expected results, verified against the shipped engine on this branch:

| Path | Foundational PEBD | Creditable prior period | Credit | PEBD |
|---|---|---|---|---|
| A. No 16401 financial assistance | 20220725 | Marine Corps Reserve 20200915 to 20220724 | 1y 10m 10d | 20200915 |
| B. Financial assistance, non-SelRes, commissioned status bridges to active duty | 20220617 | OCS active duty 20210522 to 20210730 | 0y 2m 9d | 20220408 |
| B-alt. Financial assistance, no bridging status | 20220725 | OCS active duty 20210522 to 20210730 | 0y 2m 9d | 20220516 |

## Work items

### 1. New service types (index.html SERVICE_TYPES near line 1711, test-calculations.js SERVICE_TYPES near line 11)

Add four entries, category "Officer Candidate". Keep both copies identical. The suite asserts they match.

| Key | creditable |
|---|---|
| PLC / Officer Candidate (No 16401 Financial Assistance) | true |
| PLC / Officer Candidate (16401 Financial Assistance, Non-SelRes, Post-1999) | false |
| PLC / Officer Candidate (16401 Financial Assistance, SelRes) | true |
| Officer Candidate Active Duty for Training (OCS) | true |

Keep `isServiceCreditable` (index.html near line 1758, test file near line 103) as the single decision point.
Do not add creditability logic anywhere else.

### 2. Pathway control (index.html select id pathwayType near line 1473)

The Officer option currently changes only Military Academy credit. Either wire the new PLC types to it or
rename the option so it stops implying PLC handling. Recommended: keep the option, add a visible helper line
under the select stating exactly which rules the pathway drives (Academy credit, and the PLC financial
assistance field in item 3).

### 3. Financial assistance field

- Add a select next to the pathway control: "PLC financial assistance (10 U.S.C. 16401)?" with values
  Not applicable, Yes, No. Show it only when the Officer pathway is selected.
- When any period uses a PLC / Officer Candidate type and the field is Not applicable, block calculation
  with a warning toast and highlight the field. Do not silently score the period.
- Carry the value into calculationResult, the results table, the print report (generateHTMLReport near line 2521),
  and the MMPB-21 email package (emailMmpb21Package near line 2739).
- Reset it in resetAll.

### 4. DOEAF and AFADBD cross-checks

Add two optional inputs beside the foundational PEBD (id foundationalPEBD near line 1461): DOEAF and AFADBD,
YYYYMMDD, same validation as the other date fields. After a successful calculation emit non-blocking warnings:

- Calculated PEBD is later than DOEAF and no non-creditable period was entered:
  "PEBD is later than DOEAF with no excluded service to explain the gap. Verify creditability of each period."
- Calculated PEBD equals AFADBD and at least one Reserve-category period was entered:
  "PEBD equals the first active duty date while Reserve service is present. This is the signature of a PEBD set
  to an OCS or IADT report date instead of computed. Recompute."
- AFADBD is blank or 00000000 while an active-category period is entered:
  "AFADBD is missing on a member with active service. Report as a separate MCTFS record error."

Show the warnings in a list under the results and include them in the print report and the MMPB-21 package.

### 5. Same-status consistency warning

When two periods share a service type, sit on either side of an active-category period, and one is creditable
while the other is not, emit: "Periods N and M carry the same status but different creditability. Both must be
treated the same under 37 U.S.C. 205." Evaluate after item 1 lands, since the new PLC types make this detectable.

### 6. Example and tests

- Add a guided example to PEBD_EXAMPLES (index.html near line 2639) using path B from the fact pattern above,
  with a notes string naming path A as the alternative. Add a matching example card in the examples panel and
  a matching entry in the how-to walkthrough.
- Add tests to test-calculations.js:
  - each of the four new types returns the expected creditability on both pathways
  - path A computes 20200915
  - path B computes 20220408
  - path B-alt computes 20220516
  - the SERVICE_TYPES tables in index.html and the test file still match
- Run `node test-calculations.js`. Current baseline on this branch: 163 passed, 0 failed.

### 7. Documentation

- README: add 37 U.S.C. 205 and 10 U.S.C. 16401 to the governing references table, describe the financial
  assistance field and the DOEAF/AFADBD checks, and update the example and test counts.
- How to Use walkthrough (index.html, "How to Use" section): add the PLC decision in plain words.
  The one fact deciding a PLC officer's PEBD is whether the officer took 16401 financial assistance.

## Do not change

- The 30-day subtraction, inclusive day rule, February clamp, and time loss deduction. All produced correct
  results in the audit.
- The consent gate, CUI banners, CSP, and print layout.

## Definition of done

- All seven items above landed on this branch with tests green.
- Loading the new example and clicking Calculate shows 20220408, and switching the financial assistance
  field to No with the period type changed to the no-assistance variant over the full Reserve span shows 20200915.
- No real names, EDIPIs, dates of birth, or addresses anywhere in the diff.
