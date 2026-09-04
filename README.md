# Marine Corps Pay Entry Base Date (PEBD) Calculator

A web-based calculator for determining a Marine's Pay Entry Base Date (PEBD) in accordance with **PAA 04-25** (Creditable Service & PEBD) and **MARADMIN 052/26** (MCTFS PEBD Advisory), with a companion **Basic Pay Comparison** tool.

## Overview

PEBD determines a service member's pay longevity and is calculated by subtracting total creditable service from the current date of entry. This tool automates the arithmetic defined in PAA 04-25, handling per-period inclusive day adjustments, time loss deductions, and 30-day-month date normalization.

## Features

- **Unlimited Service Periods** — Add or remove service period rows dynamically with start/end dates, service type, and notes
- **47 Service Types** — Automatic creditability determination including special Military Academy logic (Officer vs. Enlisted pathways), DODFMR-aligned Delayed Entry Program rules, and Platoon Leaders Class / officer candidate variants carrying the 37 U.S.C. 205(f) financial assistance split
- **PLC Financial Assistance Gate** — A 10 U.S.C. 16401 financial assistance question opens on the Officer pathway or whenever a row carries an officer candidate type, and calculation is blocked until it is answered; the answer travels into the results, print report, and MMPB-21 package
- **MCTFS Record Cross-Checks** — Optional DOEAF and AFADBD inputs drive non-blocking warnings: a PEBD later than DOEAF with nothing excluded, a PEBD equal to the first active duty date while Reserve service is present, a zeroed AFADBD on a member with active service, a financial assistance answer contradicting a row, and same-status periods on either side of active duty carrying different creditability
- **Time Loss Deductions** — AWOL, confinement, desertion, and other non-creditable absence types per DODFMR Vol 7A Ch 1 Table 1-2, computed on the 30-day-month basis as years/months/days with +1 inclusive day (para 2.4.1.3.1), with an "Officer Time?" flag that records but does not deduct commissioned-service losses
- **Real-Time Validation** — Strict YYYYMMDD calendar validation with per-row status icons and invalid-field highlighting as you type
- **Combined Consent Gate** — Single interstitial carrying the DoD Notice and Consent Banner (DoDI 8500.01) plus Terms of Service, Privacy Policy, and Accessibility tabs
- **CUI Markings** — Dynamic CUI//SP-PRVCY banners appear once the form contains data and carry through to printed reports (DoDI 5200.48)
- **Content Security Policy** — Strict CSP meta, nosniff, and no-referrer headers (NIST SP 800-53 SC-18)
- **Print Report** — Formatted, CUI-marked print report with governing references and calculation breakdown
- **MMPB-21 Email Package** — Pre-filled, CUI-marked mailto escalation package per MARADMIN 052/26 Step 3
- **Basic Pay Comparison Companion** — Hand off the foundational and calculated PEBD to `pay-comparison.html` for a month-by-month basic pay difference (embedded pay tables 1993-2026)
- **Built-In Instructions** — A collapsible "How to Use" walkthrough on both pages covering every step from data entry to escalation
- **Guided Examples** — Eleven one-click examples with verified expected results: seven on the calculator (including the PAA 04-25 and DODFMR official worked examples and a PLC officer under 37 U.S.C. 205(f)) and four on the pay comparison (anniversary splits, mid-period promotion, the E0 four-month rule, and a Feb 29 PEBD)
- **Toast Notifications** — Non-intrusive toast messages replace alert() dialogs
- **Dark/Light Theme** — Semper Admin portal styling with a pre-paint theme bootstrap

## Governing References

| Reference | Description |
|-----------|-------------|
| [PAA 04-25](https://usmc.sharepoint-mil.us/sites/dcmra_mra_mi_missa/Lists/PAA/DispForm.aspx?ID=127&e=qD8Oj2) | Creditable Service & PEBD calculation methodology |
| [MARADMIN 052/26](https://www.marines.mil/News/Messages/Messages-Display/Article/4409903/marine-corps-total-force-system-advisory-to-identify-required-corrections-to-pa/) | MCTFS Advisory for PEBD corrections |
| DODFMR Volume 7A, Chapter 1 | Time loss deduction and DEP creditability rules |
| 37 U.S.C. 205 | Service creditable for basic pay: every period as a Reserve component member counts (205(a)); post-1999 PLC time is excluded for officers who received 10 U.S.C. 16401 financial assistance, except active duty and Selected Reserve time (205(f)) |
| 10 U.S.C. 16401 | Marine Corps Platoon Leaders Class financial assistance program |
| MCO 1900.16 | Separation and retirement manual |
| MCO P1070.12K | IRAM (Individual Records Administration Manual) |
| SECNAVINST 1000.30B | Creditable service determination |

## Calculation Logic

1. **Input** — Foundational PEBD (beginning date of the most recent period of continuous service for pay), Marine status, pathway type, service periods, and time loss periods
2. **Creditability Check** — Each service period is evaluated against PAA 04-25 rules for the given pathway type (Military Academy service credits only on enlisted pathways). PLC / officer candidate rows carry their own creditability by variant under 37 U.S.C. 205, and the 10 U.S.C. 16401 financial assistance question must be answered before such rows are scored
3. **End-Date Adjustment** — Ending day 31 becomes 30; a February ending day of 28 or 29 becomes 30 (30-day-month convention)
4. **Summation** — Begin totals and end totals are summed component-wise across all creditable periods
5. **Difference** — End totals minus begin totals
6. **Inclusive Day Adjustment** — Plus one day per creditable service period
7. **Time Loss Deduction** — Each deductible, non-officer-time loss is computed on the 30-day basis (years/months/days, +1 inclusive day, a loss beginning on the 31st counts that day) and subtracted from the total
8. **Normalization** — Days and months are normalized on the 30-day/12-month convention (e.g., 35 days becomes 1 month 5 days)
9. **PEBD Derivation** — Net creditable service is subtracted from the foundational PEBD using pure 30-day arithmetic; a nominal February 29/30 result clamps to the real last day of February
10. **Record Cross-Checks** — The result is compared against the optional DOEAF and AFADBD values and the financial assistance answer, and any inconsistency is listed as a warning on the results view, the print report, and the MMPB-21 package

## Project Structure

```
PEBD-CALCULATOR/
├── index.html              # PEBD calculator (HTML, CSS, JS)
├── pay-comparison.html     # Companion basic pay comparison tool
├── test-calculations.js    # Calculation logic test suite (207 checks)
├── HANDOFF-PLC-205F.md     # Specification behind the PLC / officer candidate handling
├── README.md
├── TERMS_OF_SERVICE.md     # Legal documents linked from the consent gate
├── PRIVACY_POLICY.md
├── ACCESSIBILITY.md
├── semper-tokens.css       # Semper Admin style tokens
├── semper-tokens.json
├── manifest.yml            # Cloud Foundry deployment (staticfile buildpack)
├── Staticfile
└── assets/
    ├── fonts/              # Self-hosted Inter and Bebas Neue woff2
    └── images/
```

## Usage

Open `index.html` in any modern web browser. No server, build step, or dependencies required.

1. Acknowledge the DoD Notice and Consent conditions and the Terms of Service
2. Enter the Marine's foundational PEBD
3. Select Marine status and pathway type. On the Officer pathway, answer the PLC financial assistance (10 U.S.C. 16401) question when any row uses a PLC / Officer Candidate type
3a. Optionally transcribe DOEAF and AFADBD from MCTFS to receive record cross-check warnings with the result
4. Add service periods with dates and service type (add rows as needed)
5. Add time loss periods if applicable
6. Click **Calculate PEBD** to view the breakdown
7. Use **Print Report** for a CUI-marked report, **Email MMPB-21 Package** to escalate, or **Open in Pay Comparison** to quantify the pay impact

## Testing

The test suite mirrors the shipped calculation logic, loads the shipped tables and cross-check block out of `index.html`, and verifies 207 checks in 12 sections:

- Date parsing (strict calendar validation, leap years)
- Inclusive day counting
- Service type creditability (academy pathway logic, DEP variants, exclusions)
- Time loss deductibility (DODFMR Table 1-2) and 30-day-basis lost time computation
- 30-day date subtraction (borrowing, February clamping)
- Full PEBD calculations (per-period inclusive days, end-date adjustments)
- Time loss integration (officer time, accumulation, invalid input)
- The DODFMR Vol 7A Ch 1 worked example (para 2.4.1.3.1) reproduced end to end
- The PAA 04-25 Section 6 worked example reproduced end to end
- The DTMS export loaded from `pay-comparison.html`
- PLC officer candidate paths under 37 U.S.C. 205 (no assistance, assistance, and the record-as-carried reconstruction)
- Shipped `SERVICE_TYPES`, record cross-check warnings, and every guided example card expected value, loaded from `index.html`

Run with Node.js:

```bash
node test-calculations.js
```

## Compliance Notes

- The calculator is a **reference tool**. Results require verification against official records (DD Form 4, DD Form 214, NAVMC 763) before official use
- Browser local storage holds only the consent flags and theme preference - never calculation data (44 USC 3301)
- No analytics, no tracking, no external data transmission

## Technical Details

- **Two static pages** — Vanilla HTML, CSS, and JavaScript with no external dependencies
- **Client-side only** — All calculations run in the browser; no data is sent to any server
- **Responsive design** — Works on desktop and mobile browsers
- **Print-optimized** — Dedicated print styles with CUI markings for report generation
