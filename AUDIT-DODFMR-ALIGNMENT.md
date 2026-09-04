# Self-audit: PEBD calculator against DoDFMR Volume 7A, Chapter 1 (May 2024)

Branch: `claude/calculation-analysis-baseline-dgy21y`
Scope: every rule the calculator encodes in `index.html`, mirrored in `test-calculations.js`, checked line by line
against the governing text. Companion tool `pay-comparison.html` is out of scope.

## Sources and their weight

| Source | Access | Weight |
|---|---|---|
| DoDFMR Vol 7A Ch 1, May 2024 (85 pages, full text) | Read in full | Primary. Every paragraph cite below is to this chapter |
| 37 U.S.C. 205 (subsections (a) and (f)) | Verbatim text via search index of uscode.house.gov | Primary for 205(f), which the chapter omits |
| 10 U.S.C. 16401 | Title and purpose only | Supporting |
| PAA 04-25 | Not reachable (SharePoint) | Unverified. Cited in the app for the Academy pathway rule, Note 8, and the six-step method |
| MARADMIN 052/26 (R 191450Z FEB 26) | Full text supplied, stored in `references/` | Primary for the correction workflow. Its reference list names 37 U.S.C. 205, DoDFMR Vol 7A Ch 1 of May 2024, MCRCO 1100.1B, MCO 1560.33 (Marine Corps Tuition Assistance Program), 10 U.S.C. 12103, and PAA 04-25 |
| SOP.docx in this repository | Read | Describes the app. It is not a rule source and is not treated as one |

Confidence scale: 1.0 means the app's behavior and the regulation text agree on every case I tried and I hold the text.
0.8 means agreement on the cases tried with a residual the text does not settle. Below 0.6 means a known deviation or
an unverified source.

## A. Arithmetic engine

| Rule | Regulation | App | Status | Confidence |
|---|---|---|---|---|
| Start from the most recent entry on duty without a break | 2.4.1.1 | Foundational PEBD input | Functioning. The hint text names DD Form 4 and DD 1966 only; for officers the date is acceptance of the commission (2.4.1.1.2) | 0.9 |
| Sum beginning dates unchanged | 2.4.1.2.1 | `calculatePEBD` begin totals | Functioning | 1.0 |
| Ending day 31 becomes 30 | 2.4.1.2.2 | `if (endDay === 31) endDay = 30` | Functioning | 1.0 |
| Ending Feb 28 of a non-leap year becomes 30 | 2.4.1.2.2 | Yes | Functioning | 1.0 |
| Ending Feb 29 becomes 30 | 2.4.1.2.2 | Yes | Functioning | 1.0 |
| Ending Feb 28 of a leap year stays 28 | 2.4.1.2.2, "Do not change February 28 of a leap year to February 30" | App changes it to 30 | Deviation. A period 20240101 to 20240228 credits 0y 2m 0d in the app; the chapter gives 0y 1m 28d. Over-credit of 2 days per such period | 0.3 |
| Subtract begin totals from end totals | 2.4.1.2.3 | Yes | Functioning | 1.0 |
| Add 1 day per non-continuous period | 2.4.1.2.4 | +1 per row | Functioning. Per-row +1 on contiguous rows is arithmetically identical to merging them on the 30-day basis, verified algebraically and on the chapter's own 22-year example. The only case where it differs is the leap-year Feb 28 deviation above | 0.95 |
| Convert to years, months, days on a 30-day, 12-month basis | 2.4.1.2.5 | Normalization loops | Functioning | 1.0 |
| Lost time not made good: 30-day basis, +1 inclusive, a loss beginning on the 31st counts | 2.4.1.3.1 | `computeLostTime` | Functioning. Reproduces the chapter's example, 0y 1m 7d and basic pay date 4 Mar 2014 (suite section 8) | 1.0 |
| Lost time made good: compute on both bases, use the more favorable, never below the contract length | 2.4.1.3.2 | Not implemented | Gap. The app treats every loss as not made good | 0.0 |
| Lost time does not change an officer's basic pay date | 2.4.1.4, 2.2.2 | "Officer Time?" checkbox records and does not deduct | Functioning. Depends on the user ticking the box | 0.9 |
| Enlisted member returning from lost time: add days lost to the basic pay date | 2.4.1.4 | Not modeled as a distinct case | Gap, low impact. The same answer falls out of entering the period with its loss | 0.7 |
| Basic pay date on Feb 29: increases begin 1 Mar in non-leap years, 29 Feb in leap years | 2.4.2 | `subtractServiceFromDate` clamps a nominal Feb 29 or 30 to the real last day of February | Partial deviation. A nominal Feb 29 in a non-leap year becomes Feb 28, one day earlier than the chapter's treatment. Nominal Feb 30 is not addressed by the chapter at all | 0.6 |

## B. Service type catalog (49 entries)

| Entry | Regulation | Verdict | Confidence |
|---|---|---|---|
| Regular Army, Navy, Marine Corps, Air Force, Space Force, Coast Guard | 2.1.3.1 | Creditable, correct. Space Force is not named in the May 2024 text; treated as Regular service | 0.95 |
| Army, Navy, Marine Corps, Air Force Reserve | 2.1.3.2 | Creditable, correct, active or inactive | 1.0 |
| Army National Guard, Air National Guard | 2.1.3.4 to 2.1.3.10 | Creditable, correct | 1.0 |
| PHS Commissioned Corps, PHS Reserve Corps | 2.1.3.11, 2.1.3.12 | Creditable, correct | 1.0 |
| NOAA Officer, NOAA Deck Officer | 2.1.4.1 | Creditable, correct | 1.0 |
| Fleet Reserve, Fleet Marine Corps Reserve | 2.1.4.2 | Creditable, correct | 1.0 |
| Service with Retired Pay | 2.1.4.2, 2.1.4.3 | Creditable, correct | 1.0 |
| Military Academy Service | 2.1.4.4, 2.2.1.9, Table 1-1 | Enlisted pathway creditable, Officer pathway excluded. Correct for Table 1-1 Rules 1 and 2. Rules 3 and 4 (a cadet who concurrently retained a Reserve commission or warrant) credit the time for an officer and are not modeled | 0.85 |
| Cadet/Midshipman Service (Non-Commissioned) | 2.1.4.4 | Creditable, correct | 1.0 |
| Naval Academy Preparatory School (NAPS) | 2.1.3.1 or 2.1.3.2 as enlisted service; PAA 04-25 Note 8 | Creditable on every pathway. Consistent with the chapter. The Note 8 cite is unverified | 0.85 |
| Medical Retention Service | 2.1.4.5 | Creditable, correct, except the chapter excludes retention caused by the member's misconduct, which the app has no way to express | 0.85 |
| Under-age Service (Valid Enlistment) | 2.1.4.6 | Creditable, correct | 1.0 |
| Temporary Coast Guard Reserve | 2.1.4.7 | Chapter credits active service only. The app credits the type without an active-only condition | 0.8 |
| Service Terminated by Desertion | 2.1.4.8 | Creditable unless the enlistment was fraudulent. Correct | 0.95 |
| Detailed Service (Other Agency) | 2.1.4.9 | Creditable, correct | 1.0 |
| ROTC (On/After 1 Aug 1979, Concurrent SelRes Drilling) | 2.1.4.10 | Creditable, correct after this session's relabel. The condition is now in the label | 0.95 |
| ROTC (1964-1979) | 2.1.4.14 | Not creditable for commissioned officers. Correct for officers. For a member who stayed enlisted the chapter keeps it creditable, which the app cannot express | 0.8 |
| ROTC (Pre-1964) | Not addressed in the chapter | Not creditable in the app. Unverified | 0.5 |
| Delayed Entry Program (Before January 1985) | 2.1.4.12 | Creditable, correct | 1.0 |
| Delayed Entry Program (1985-1989 No IDT) | 2.2.1.7 | Not creditable, correct outcome, misleading label. For enlistments 1 Jan 1985 to 28 Nov 1989 the pre-ADT time is excluded whether or not IDT was performed | 0.8 |
| Delayed Entry Program (Post 1989 w/IDT) | 2.1.4.12.2.1 versus 2.2.1.8.2 | Creditable only for a Reserve enlistment under 10 U.S.C. 12103(b) or (d). A DEP enlistment under 10 U.S.C. 513, the ordinary regular-component DEP, is excluded other than active duty regardless of IDT. The app credits the type without the authority split | 0.6 |
| Delayed Entry Program (Post 1989 No IDT) | 2.2.1.8.1, 2.2.1.8.2 | Not creditable, correct | 1.0 |
| PLC / Officer Candidate (Inactive Before Initial ADT, No IDT) | 2.2.1.8.1 | Not creditable, correct | 0.95 |
| PLC / Officer Candidate (Inactive Before Initial ADT, IDT Performed) | 2.1.4.12.2.1 | Creditable, correct | 0.95 |
| PLC / Officer Candidate (Inactive After Initial ADT) | 2.1.3.2 | Creditable, correct | 0.95 |
| PLC / Officer Candidate (Inactive After Initial ADT, 37 USC 205(f) ...) | 37 U.S.C. 205(f) | Not creditable for a 12203 appointee with 16401 assistance. The chapter does not implement 205(f). Whether DFAS or MCTFS applies it, and whether it reaches a 531 appointee, is unresolved | 0.6 |
| PLC / Officer Candidate (Selected Reserve, Drilling) | 2.1.3.2, 205(f) exception | Creditable, correct | 0.95 |
| Officer Candidate Active Duty for Training (OCS) | 2.1.3.2 | Creditable, correct | 1.0 |
| Service Before 10 Jan 1962 | 2.1.4.13 | Creditable, correct | 1.0 |
| Philippine Army Officer | 2.2.1.2 | Excluded, correct | 1.0 |
| State, Territorial, Home Guard | 2.2.1.4 | Excluded, correct | 1.0 |
| Emergency Officers Retired List | 2.2.1.3 | Excluded, correct | 1.0 |
| AFHPSP/FAP (Post 1981), USUHS Student (DOM) | 2.2.1.6 | Excluded, correct | 1.0 |
| Inactive National Guard | 2.2.1.5 | Excluded, correct. The dual-status exception (ING plus NGUS) is not modeled | 0.9 |
| Missing: enlistment terminated, voided, or invalidated as fraudulent | 2.2.1.1 | No entry exists. A user has no way to mark a period as void | 0.0 |
| Missing: Air Force Reserve, Space Force Reserve, Coast Guard Reserve inactive as separate rows | 2.1.3.2 | Air Force Reserve exists. Coast Guard Reserve and Space Force Reserve do not | 0.7 |

## C. Time loss catalog (17 entries) against Table 1-2

| Entry | Table 1-2 | Verdict | Confidence |
|---|---|---|---|
| AWOL, Unauthorized Absence (Other), Excess Leave (Unauthorized) | Rule 3 | Deductible, correct when not excused. Rule 2 (excused as unavoidable) is creditable and has no entry | 0.85 |
| Desertion | Rule 7 | Deductible, correct | 1.0 |
| Confinement (Court-Martial) | Rules 8 and 9 | Deductible, correct when the trial ends in conviction. Note 3: creditable on acquittal or a set-aside sentence. No entry for that outcome | 0.85 |
| Confinement (Civil, Convicted) | Rules 4 and 5 | Deductible, correct. Note 2 exceptions (released without trial, acquitted, conviction set aside) have no entry | 0.85 |
| Misconduct Disease/Injury (Alcohol/Drugs) | Rule 6 | Deductible, correct | 1.0 |
| Dropped from Rolls | Table 1-12 Rule 12 (pay forfeiture) | Deductible. Table 1-2 does not list it as a creditability rule; the absence behind it is what Table 1-2 scores | 0.7 |
| Excess Leave (Authorized), Ordinary, Emergency, Medical, Maternity/Paternity, Administrative Leave | Rule 1 | Not deductible, correct | 1.0 |
| TDY/TAD, Training, Hospitalization | Not absences from duty | Not deductible, correct | 1.0 |
| Officer time not deducted | 2.2.2.1, 2.4.1.4 | Correct | 1.0 |

## D. Inputs and cross-checks added on this branch

| Item | Basis | Verdict | Confidence |
|---|---|---|---|
| Financial assistance gate blocks a PLC row until answered | 37 U.S.C. 205(f) | Functioning. Under the chapter alone the answer changes nothing; it exists to force the fact to be recorded | 0.9 |
| PEBD later than DOEAF with nothing excluded | Derived from 2.1.2 (no break, no exclusion means the basic pay date is the entry date) | Functioning | 0.9 |
| PEBD equals AFADBD confirmation prompt | 2.2.1.8.1 | Functioning. Worded as a prompt because the outcome is the expected one for post-1989 Reserve enlistees with no IDT | 0.9 |
| AFADBD zero or blank with DOEAF filled | MCTFS record hygiene, not the chapter | Functioning | 0.8 |
| 205(f) row with the field set to No | Internal consistency | Functioning | 0.95 |
| Removed: same-status warning | Contradicted by 2.2.1.8.1 | Removed on this branch | 1.0 |

## E. Test suite

| Property | State | Confidence |
|---|---|---|
| Count | 208 checks, all passing on this branch | 1.0 |
| Loads shipped code | Yes for `SERVICE_TYPES`, the cross-check block, and `PEBD_EXAMPLES` (section 12) and for the DTMS export (section 10) | 1.0 |
| Arithmetic is a mirror, not the shipped code | `computePEBD`, `subtractServiceFromDate`, `computeLostTime`, `parseDate`, and `calculateDays` in the test file are retyped copies of the page functions. Drift between the copy and the page would pass unnoticed. This session verified equivalence only on the cases run through a headless browser | 0.7 |
| Official worked examples | Chapter 2.4.1.3.1 example and PAA 04-25 Section 6 example reproduced. The chapter's 22-year four-period example in 2.4.1.2.5 is not in the suite | 0.85 |
| Every guided example card's expected value | Asserted from the shipped definitions | 1.0 |

## F. Enhancements, in priority order

1. Leap-year February 28 ending day. Change the end-date rule to leave Feb 28 alone in a leap year (2.4.1.2.2). Two-line change plus a test. This is the only arithmetic deviation with a nonzero effect on a computed PEBD.
2. Load the arithmetic out of `index.html` in the suite the way section 12 loads the tables, and retire the retyped mirror. Until then the suite proves the mirror, not the page.
3. Split the post-1989 DEP row by enlistment authority: 12103(b)/(d) with IDT creditable, 10 U.S.C. 513 excluded other than active duty (2.2.1.8.2). Relabel the 1985-1989 row to drop "No IDT".
4. Lost time made good (2.4.1.3.2): add a "made good" flag per loss, compute both bases, take the lesser, and floor creditable service at the contract length. Needs a contract-length input per period.
5. Add a "Fraudulent, voided, or invalidated enlistment" type, excluded (2.2.1.1).
6. Add the chapter's 22-year example (2.4.1.2.5) to the suite as a third official worked example.
7. Officer foundational date hint: state that for an officer the date is acceptance of the commission (2.4.1.1.2) and name the NAVMC 763 oath block.
8. Table 1-1 Rules 3 and 4: an officer who held a Reserve commission or warrant while a cadet. Add a flag or a variant. Rare.
9. Nominal February 29 in a non-leap year: keep Feb 29 as the basic pay date and let the pay comparison apply 2.4.2, instead of clamping to Feb 28.
10. Time loss outcomes: entries for an absence excused as unavoidable (Rule 2) and confinement ending in acquittal or a set-aside sentence (Notes 2 and 3), both creditable.
11. Resolve 37 U.S.C. 205(f) with MMPB-21: whether MCTFS applies it at all and whether it reaches a 10 U.S.C. 531 appointee. Until answered, the 205(f) variant stays available but unverified in practice.

## G. Not verifiable in this session

- PAA 04-25 text. The Academy pathway rule (para 4.b.4), Note 8, and the flat February rule attributed to it are taken from the app and its SOP, not from the source.
- MARADMIN 052/26 text. The MMPB-21 workflow and mailbox are taken from the app.
- DFAS and MCTFS practice on 37 U.S.C. 205(f).

## Overall

| Area | Score |
|---|---|
| Arithmetic engine | 0.88. One two-day deviation, one unimplemented branch (made good), one edge (Feb 29) |
| Service type catalog | 0.87. 41 of 49 entries fully supported; DEP authority split and one missing exclusion are the material gaps |
| Time loss catalog | 0.9. Deductibility correct; creditable exception outcomes have no entries |
| Cross-checks added this session | 0.9. Correct after the DoDFMR correction; the 205(f) variant remains a statutory reading not confirmed in practice |
| Test suite | 0.8. Broad and green, but the arithmetic under test is a copy |
| Weighted overall | 0.87 |

## Status after the build on this branch

| Enhancement | Landed | Where |
|---|---|---|
| 1. Leap-year Feb 28 ending day stays 28 | Yes | `adjustEndDay` in the PEBD LOGIC block; tests in sections 5 and 6 |
| 2. Suite runs the shipped arithmetic | Yes | Every pure function sits between the PEBD LOGIC markers in `index.html`; the retyped mirror is gone |
| 3. DEP split by authority, 1985 to 1989 relabeled | Yes | Four DEP rows: pre-1985, enlisted 1985 to Nov 1989, Reserve 12103 with IDT, Reserve 12103 without IDT, Regular 513 |
| 4. Lost time made good | Partial | "Made Good?" flag computes both bases and keeps the smaller (2.4.1.3.2.1). The contract floor (2.4.1.3.2.3) is raised as a record note, not applied, because the form has no contract length |
| 5. Fraudulent, voided, or invalidated enlistment | Yes | Excluded service type (2.2.1.1) |
| 6. Chapter 22-year example in the suite | Yes | Section 6, four rows, 22y 0m 0d |
| 7. Officer foundational date hint | Yes | Hint names acceptance of the commission and the oath date (2.4.1.1.2) |
| 8. Table 1-1 Rules 3 and 4 | Yes | "Military Academy Service (Retained Reserve Commission/Warrant)", creditable on every pathway |
| 9. Nominal Feb 29 basic pay date | Deferred | A non-calendar date string would break every downstream date parser, including the pay comparison handoff. Needs a representation decision first |
| 10. Creditable time loss outcomes | Yes | "Unauthorized Absence (Excused as Unavoidable)" and "Confinement (Acquitted or Sentence Set Aside)", both not deductible |
| 11. 205(f) application in practice | Open | MMPB-21 question, not code |

Revised scores after the build: arithmetic engine 0.95, service type catalog 0.93, time loss catalog 0.93, cross-checks 0.9, test suite 0.95, weighted overall 0.94. Residuals: the made-good contract floor, the Feb 29 representation, the misconduct exception for medical retention, the active-only condition on temporary Coast Guard Reserve, ROTC pre-1964, and every PAA 04-25 and MARADMIN 052/26 cite, which remain unverified against their source text.

## MARADMIN 052/26 alignment (added after the message text was supplied)

| App element | MARADMIN | Verdict | Confidence |
|---|---|---|---|
| MMPB-21 mailbox | Para 3.c | Exact match, asserted by the suite | 1.0 |
| Email package workflow lines | Paras 3.a, 3.c, 3.d | Corrected. The earlier text placed the MISSO 9 step on the sender; it belongs to MMPB-21 | 1.0 |
| Two PAC paths | Para 3.c | Added. A matching PEBD with a missing period is a D188 remark update and Key Supporting Documents upload, no MMPB-21 action. An incorrect PEBD goes to MMPB-21 per the PRIUM | 0.95 |
| Marine's EPAR | Para 3.a | Added as pre-filled text with the periods claimed and the documents to attach | 0.9 |
| PEBD of record input | Para 3 | Added. The workflow turns on the comparison; the form never captured the record value before | 0.95 |
| PLC financial assistance | Reference D, MCO 1560.33 | The Marine Corps lists the tuition assistance program among its PEBD references. Confidence in the 205(f) variant rises from 0.6 to 0.75. Whether MCTFS applies 205(f) to a 10 U.S.C. 531 appointee remains open | 0.75 |
| DOEAF cross-check | Para 4, "missing data, particularly regarding prior service, can cause calculation errors even when no PEBD advisory is issued" | Supported | 0.9 |
| Print report references | Reference list | Now carries all six references | 1.0 |

Remaining unverified source: PAA 04-25 (reference F). MCRCO 1100.1B and the PRIUM are cited by name only.
