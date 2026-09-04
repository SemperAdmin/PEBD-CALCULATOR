# Handoff: PLC officer candidate creditability (37 U.S.C. 205(f)) and MCTFS cross-checks

Branch: `claude/calculation-analysis-baseline-dgy21y`
Status: implemented on this branch. Corrected after reading DoDFMR Vol 7A Chapter 1 (May 2024), which the
first draft of this document was written without. Paragraph cites below are to that chapter.

## Why this exists

A live case audit found the calculator produces correct arithmetic but has no way to express the rule
governing Platoon Leaders Class (PLC) officers, and no validation to catch the most common PEBD error on
officer records. The fact pattern below is anonymized. Do not add any real Marine's data to the repository.

## Governing rule

- DoDFMR Vol 7A Ch 1 para 2.1.3.2: Marine Corps Reserve service, active or inactive, is creditable without restriction.
- Para 2.1.4.12.2.1 and 2.2.1.8.1: for a Reserve enlistment under 10 U.S.C. 12103(b) or (d) entered on or after
  29 November 1989, inactive Reserve time before beginning active duty or an initial period of ADT is creditable
  only if the member performed IDT before that point. Without IDT, the pre-ADT time is excluded. Reserve time
  after the initial ADT falls back under 2.1.3.2 and counts.
- Para 2.4.1.1.2: an officer's initial basic pay date is the date of acceptance of the commission, not the date
  of rank.
- Para 2.1.4.10: ROTC service credits only with concurrent Selected Reserve drilling status on or after
  1 August 1979.
- 37 U.S.C. 205(f): an officer appointed under 10 U.S.C. 12203 after receiving PLC financial assistance under
  10 U.S.C. 16401 loses post-1999 inactive PLC time, except active duty and Selected Reserve time. The DoDFMR
  chapter does not mention PLC, 16401, or 12203. MCTFS follows the DoDFMR. Current PLC graduates receive regular
  appointments under 10 U.S.C. 531, which 205(f) does not name.
- Consequence for a PLC candidate with no IDT before OCS: the pre-OCS inactive time is excluded, the OCS weeks
  credit, the post-OCS inactive time credits, and the PEBD lands on the first OCS report date, equal to AFADBD.
  That is a computed result, not a shortcut. 205(f) moves the PEBD later only for a 12203 appointee with
  financial assistance.

Superseded claims from the first draft, kept here so nobody re-derives them:
- "A PEBD equal to the OCS report date has no rule behind it." Wrong. Para 2.2.1.8.1 produces exactly that date.
- "Same status on either side of OCS must carry the same creditability." Wrong. The DoDFMR draws the line at
  the initial ADT. The same-status warning was removed.
- "Path A, no financial assistance, returns to the enlistment date." Wrong unless IDT was performed before OCS.

## Anonymized fact pattern used for the new example and tests

| Date | Event |
|---|---|
| 20200915 | Enlisted USMCR as a PLC officer candidate, E1, inactive, no IDT |
| 20210522 to 20210730 | OCS active duty for training (initial ADT) |
| 20210731 to 20220616 | PLC officer candidate, inactive |
| 20220617 | Commission accepted |
| 20220725 | Reported to active duty (TBS), continuous to present |

Expected results, verified against the shipped engine on this branch:

| Path | Foundational PEBD | Creditable prior periods | Credit | PEBD |
|---|---|---|---|---|
| DoDFMR, no IDT before OCS | 20220617 | OCS 20210522 to 20210730, post-OCS Reserve 20210731 to 20220616 | 1y 0m 25d | 20210522 |
| IDT performed before OCS | 20220617 | All three rows | 1y 9m 2d | 20200915 |
| 37 U.S.C. 205(f), 12203 appointee with 16401 assistance | 20220617 | OCS only | 0y 2m 9d | 20220408 |
| 205(f), no bridging commissioned status | 20220725 | OCS only | 0y 2m 9d | 20220516 |

## Work items

### 1. New service types (index.html SERVICE_TYPES, test-calculations.js SERVICE_TYPES)

Six entries, category "Officer Candidate". Keep both copies identical. Section 12 of the suite asserts they match.

| Key | creditable | Authority |
|---|---|---|
| PLC / Officer Candidate (Inactive Before Initial ADT, No IDT) | false | 2.2.1.8.1 |
| PLC / Officer Candidate (Inactive Before Initial ADT, IDT Performed) | true | 2.1.4.12.2.1 |
| PLC / Officer Candidate (Inactive After Initial ADT) | true | 2.1.3.2 |
| PLC / Officer Candidate (Inactive After Initial ADT, 37 USC 205(f): 16401 Financial Assistance, 12203 Appointee) | false | 37 U.S.C. 205(f) |
| PLC / Officer Candidate (Selected Reserve, Drilling) | true | 2.1.3.2 |
| Officer Candidate Active Duty for Training (OCS) | true | 2.1.3.2 |

The ROTC post-1979 row was relabeled "ROTC (On/After 1 Aug 1979, Concurrent SelRes Drilling)" to carry the
2.1.4.10 condition. Keep `isServiceCreditable` as the single decision point.

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

Optional DOEAF and AFADBD inputs beside the foundational PEBD. After a successful calculation, non-blocking notes:

- Calculated PEBD later than DOEAF with no non-creditable period entered: verify creditability of each period.
- Calculated PEBD equal to AFADBD with Reserve service entered: shown as a confirmation prompt. This is the
  expected outcome for a post-1989 Reserve enlistment with no IDT before the initial ADT (2.2.1.8.1). Confirm no
  IDT was performed and no Reserve service after the initial ADT was excluded.
- AFADBD 00000000, or blank while DOEAF is filled, with active service entered: report as a separate MCTFS error.
- A 205(f) row entered while the financial assistance field says No.

### 5. Same-status consistency warning

Removed. The first draft assumed inactive Reserve time before and after OCS must share creditability. The DoDFMR
splits them at the initial ADT, so the warning would flag correct entries.

### 6. Example and tests

- Guided example 7 uses the DoDFMR path from the fact pattern above and lands on 20210522. The card explains how
  to switch row 3 to the 205(f) variant for 20220408.
- Add tests to test-calculations.js:
  - each of the six new types returns the expected creditability on both pathways
  - DoDFMR path computes 20210522, IDT path 20200915, 205(f) path 20220408, 205(f) anchored on active duty 20220516
  - the SERVICE_TYPES table, the cross-check block, and every guided example are loaded out of index.html
- Run `node test-calculations.js`. Current result on this branch: 208 passed, 0 failed.

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
- Loading the new example and clicking Calculate shows 20210522 with the AFADBD confirmation note, and
  switching row 3 to the 205(f) variant with the financial assistance field set to Yes shows 20220408.
- No real names, EDIPIs, dates of birth, or addresses anywhere in the diff.
