// ============================================================
// PEBD Calculator — Calculation Logic Test Suite
// Mirrors the logic shipped in index.html (per-period inclusive
// days per SOP/PAA 04-25, flat Feb 28/29 -> 30 rule, FMR DEP
// creditability, academy pathway logic, pure 30-day date math).
// Run: node test-calculations.js
// ============================================================

// --- Logic extracted from index.html (no DOM dependencies) ---

const SERVICE_TYPES = {
    "Regular Army": { creditable: true, category: "Active" },
    "Regular Navy": { creditable: true, category: "Active" },
    "Regular Marine Corps": { creditable: true, category: "Active" },
    "Regular Air Force": { creditable: true, category: "Active" },
    "Regular Space Force": { creditable: true, category: "Active" },
    "Regular Coast Guard": { creditable: true, category: "Active" },
    "Army Reserve": { creditable: true, category: "Reserve" },
    "Navy Reserve": { creditable: true, category: "Reserve" },
    "Marine Corps Reserve": { creditable: true, category: "Reserve" },
    "Air Force Reserve": { creditable: true, category: "Reserve" },
    "Army National Guard": { creditable: true, category: "Reserve" },
    "Air National Guard": { creditable: true, category: "Reserve" },
    "PHS Commissioned Corps": { creditable: true, category: "Other" },
    "PHS Reserve Corps": { creditable: true, category: "Other" },
    "NOAA Officer Service": { creditable: true, category: "Other" },
    "NOAA Deck Officer Service": { creditable: true, category: "Other" },
    "Military Academy Service": { creditable: true, category: "Academy" },
    "Fleet Reserve": { creditable: true, category: "Reserve" },
    "Fleet Marine Corps Reserve": { creditable: true, category: "Reserve" },
    "Cadet/Midshipman Service (Non-Commissioned)": { creditable: true, category: "Academy" },
    "Naval Academy Preparatory School (NAPS)": { creditable: true, category: "Academy" },
    "Temporary Coast Guard Reserve": { creditable: true, category: "Reserve" },
    "ROTC (On/After 1 Aug 1979, Concurrent SelRes Drilling)": { creditable: true, category: "ROTC" },
    "ROTC (1964-1979)": { creditable: false, category: "ROTC" },
    "ROTC (Pre-1964)": { creditable: false, category: "ROTC" },
    "Service with Retired Pay": { creditable: true, category: "Retired" },
    "Medical Retention Service": { creditable: true, category: "Medical" },
    "Under-age Service (Valid Enlistment)": { creditable: true, category: "Special" },
    "Service Terminated by Desertion": { creditable: true, category: "Special" },
    "Detailed Service (Other Agency)": { creditable: true, category: "Special" },
    "Service Before 10 Jan 1962": { creditable: true, category: "Historical" },
    "Philippine Army Officer": { creditable: false, category: "Excluded" },
    "State Guard": { creditable: false, category: "Excluded" },
    "Territorial Guard": { creditable: false, category: "Excluded" },
    "Home Guard": { creditable: false, category: "Excluded" },
    "Emergency Officers Retired List": { creditable: false, category: "Excluded" },
    "AFHPSP/FAP (Post 1981)": { creditable: false, category: "Excluded" },
    "USUHS Student (DOM)": { creditable: false, category: "Excluded" },
    "Inactive National Guard": { creditable: false, category: "Excluded" },
    "Delayed Entry Program (Before January 1985)": { creditable: true, category: "DEP" },
    "Delayed Entry Program (1985-1989 No IDT)": { creditable: false, category: "DEP" },
    "Delayed Entry Program (Post 1989 w/IDT)": { creditable: true, category: "DEP" },
    "Delayed Entry Program (Post 1989 No IDT)": { creditable: false, category: "DEP" },
    "PLC / Officer Candidate (Inactive Before Initial ADT, No IDT)": { creditable: false, category: "Officer Candidate" },
    "PLC / Officer Candidate (Inactive Before Initial ADT, IDT Performed)": { creditable: true, category: "Officer Candidate" },
    "PLC / Officer Candidate (Inactive After Initial ADT)": { creditable: true, category: "Officer Candidate" },
    "PLC / Officer Candidate (Inactive After Initial ADT, 37 USC 205(f): 16401 Financial Assistance, 12203 Appointee)": { creditable: false, category: "Officer Candidate" },
    "PLC / Officer Candidate (Selected Reserve, Drilling)": { creditable: true, category: "Officer Candidate" },
    "Officer Candidate Active Duty for Training (OCS)": { creditable: true, category: "Officer Candidate" }
};

const TIME_LOSS_TYPES = {
    "AWOL (Absence Without Leave)": { deductible: true },
    "Desertion": { deductible: true },
    "Confinement (Court-Martial)": { deductible: true },
    "Confinement (Civil, Convicted)": { deductible: true },
    "Misconduct Disease/Injury (Alcohol/Drugs)": { deductible: true },
    "Unauthorized Absence (Other)": { deductible: true },
    "Dropped from Rolls": { deductible: true },
    "Excess Leave (Unauthorized)": { deductible: true },
    "Excess Leave (Authorized)": { deductible: false },
    "Administrative Leave (Pending Investigation)": { deductible: false },
    "Emergency Leave": { deductible: false },
    "Ordinary Leave": { deductible: false },
    "Medical Leave": { deductible: false },
    "Maternity/Paternity Leave": { deductible: false },
    "TDY/TAD": { deductible: false },
    "Training": { deductible: false },
    "Hospitalization": { deductible: false }
};

// Lost time per DODFMR Vol 7A Ch 1, para 2.4.1.3.1 - 30-day-month basis,
// years/months/days with +1 inclusive day, begin-31 counted, end-31 capped at 30.
function computeLostTime(startDate, endDate) {
    if (!parseDate(startDate) || !parseDate(endDate) || endDate < startDate) return null;
    let sy = parseInt(startDate.substring(0, 4), 10);
    let sm = parseInt(startDate.substring(4, 6), 10);
    let sd = parseInt(startDate.substring(6, 8), 10);
    let ey = parseInt(endDate.substring(0, 4), 10);
    let em = parseInt(endDate.substring(4, 6), 10);
    let ed = parseInt(endDate.substring(6, 8), 10);

    if (sd === 31) sd = 30;
    if (ed === 31) ed = 30;

    let years = ey - sy;
    let months = em - sm;
    let days = ed - sd + 1;

    while (days < 0) { days += 30; months -= 1; }
    while (months < 0) { months += 12; years -= 1; }
    while (days >= 30) { days -= 30; months += 1; }
    while (months >= 12) { months -= 12; years += 1; }

    return { years, months, days };
}

function isServiceCreditable(serviceType, pathwayType) {
    if (serviceType === "Military Academy Service") {
        return !(pathwayType && pathwayType.includes("Officer"));
    }
    return SERVICE_TYPES[serviceType]?.creditable || false;
}

function isTimeLossDeductible(lossType) {
    return TIME_LOSS_TYPES[lossType]?.deductible || false;
}

function parseDate(dateStr) {
    if (!dateStr || !/^\d{8}$/.test(dateStr)) return null;
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
    return d;
}

function calculateDays(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end || end < start) return 0;
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function subtractServiceFromDate(dateStr, years, months, days) {
    if (!/^\d{8}$/.test(dateStr)) return dateStr;
    let y = parseInt(dateStr.substring(0, 4), 10);
    let m = parseInt(dateStr.substring(4, 6), 10);
    let d = parseInt(dateStr.substring(6, 8), 10);

    y -= years;
    m -= months;
    d -= days;

    while (d <= 0) { m -= 1; d += 30; }
    while (m <= 0) { y -= 1; m += 12; }

    const lastDay = new Date(y, m, 0).getDate();
    if (d > lastDay) d = lastDay;

    return String(y) + String(m).padStart(2, '0') + String(d).padStart(2, '0');
}

// Pure mirror of calculatePEBD in index.html.
// periods: [{serviceType, startDate, endDate}]
// timeLosses: [{lossType, startDate, endDate, isOfficerTime}]
function computePEBD(foundationalPEBD, pathwayType, periods, timeLosses = []) {
    const beginningDates = [];
    const endingDates = [];

    periods.forEach(p => {
        if (!p.serviceType || !p.startDate || !p.endDate) return;
        const days = calculateDays(p.startDate, p.endDate);
        if (days <= 0) return;
        if (!isServiceCreditable(p.serviceType, pathwayType)) return;

        const startYear = parseInt(p.startDate.substring(0, 4), 10);
        const startMonth = parseInt(p.startDate.substring(4, 6), 10);
        const startDay = parseInt(p.startDate.substring(6, 8), 10);

        let endYear = parseInt(p.endDate.substring(0, 4), 10);
        let endMonth = parseInt(p.endDate.substring(4, 6), 10);
        let endDay = parseInt(p.endDate.substring(6, 8), 10);

        // PAA 04-25 ending date adjustments (flat rule per SOP)
        if (endDay === 31) endDay = 30;
        if (endMonth === 2 && (endDay === 28 || endDay === 29)) endDay = 30;

        beginningDates.push({ year: startYear, month: startMonth, day: startDay });
        endingDates.push({ year: endYear, month: endMonth, day: endDay });
    });

    const timeLossTotals = { years: 0, months: 0, days: 0 };
    let timeLossApplied = false;
    timeLosses.forEach(t => {
        const lost = computeLostTime(t.startDate, t.endDate);
        if (!lost) return;
        if (isTimeLossDeductible(t.lossType) && !t.isOfficerTime) {
            timeLossTotals.years += lost.years;
            timeLossTotals.months += lost.months;
            timeLossTotals.days += lost.days;
            timeLossApplied = true;
        }
    });

    if (beginningDates.length === 0) {
        return { calculatedPEBD: foundationalPEBD, normalized: { years: 0, months: 0, days: 0 }, timeLossTotals, timeLossApplied, numPeriods: 0 };
    }

    const beginTotals = beginningDates.reduce((t, d) => ({ years: t.years + d.year, months: t.months + d.month, days: t.days + d.day }), { years: 0, months: 0, days: 0 });
    const endTotals = endingDates.reduce((t, d) => ({ years: t.years + d.year, months: t.months + d.month, days: t.days + d.day }), { years: 0, months: 0, days: 0 });

    const normalized = {
        years: endTotals.years - beginTotals.years - timeLossTotals.years,
        months: endTotals.months - beginTotals.months - timeLossTotals.months,
        days: endTotals.days - beginTotals.days + beginningDates.length - timeLossTotals.days
    };

    while (normalized.days < 0) { normalized.days += 30; normalized.months -= 1; }
    while (normalized.months < 0) { normalized.months += 12; normalized.years -= 1; }
    while (normalized.days >= 30) { normalized.days -= 30; normalized.months += 1; }
    while (normalized.months >= 12) { normalized.months -= 12; normalized.years += 1; }

    return {
        calculatedPEBD: subtractServiceFromDate(foundationalPEBD, normalized.years, normalized.months, normalized.days),
        normalized,
        timeLossTotals,
        timeLossApplied,
        numPeriods: beginningDates.length
    };
}

// --- Test harness ---

let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(actual, expected, name) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
        passed++;
        console.log(`  PASS: ${name}`);
    } else {
        failed++;
        failures.push(name);
        console.log(`  FAIL: ${name}\n    expected ${e}\n    actual   ${a}`);
    }
}

const ENL = 'Enlisted DEP/Direct/Reenlisted/Prior Service';
const OFF = 'Officer OCC/PLC/NROTC/Academy';

// ---------- 1. parseDate ----------
console.log('\n[1] parseDate');
assertEqual(parseDate('20240115') !== null, true, 'Valid date parses');
assertEqual(parseDate('20241301'), null, 'Month 13 rejected');
assertEqual(parseDate('20240230'), null, 'Feb 30 rejected');
assertEqual(parseDate('20240229') !== null, true, 'Leap-year Feb 29 accepted');
assertEqual(parseDate('20230229'), null, 'Non-leap Feb 29 rejected');
assertEqual(parseDate('2024011'), null, 'Seven digits rejected');
assertEqual(parseDate('2024011A'), null, 'Non-digit rejected');
assertEqual(parseDate('20240100'), null, 'Day 00 rejected');
assertEqual(parseDate(''), null, 'Empty string rejected');

// ---------- 2. calculateDays (inclusive) ----------
console.log('\n[2] calculateDays');
assertEqual(calculateDays('20240101', '20240101'), 1, 'Same day counts 1 inclusive day');
assertEqual(calculateDays('20240101', '20240110'), 10, 'Ten-day span inclusive');
assertEqual(calculateDays('20240110', '20240101'), 0, 'End before start returns 0');
assertEqual(calculateDays('20240101', '20241231'), 366, 'Full leap year 366 days');
assertEqual(calculateDays('20230101', '20231231'), 365, 'Full non-leap year 365 days');
assertEqual(calculateDays('2024010', '20240110'), 0, 'Invalid start returns 0');

// ---------- 3. Service creditability ----------
console.log('\n[3] Service creditability');
assertEqual(Object.keys(SERVICE_TYPES).length, 49, 'Service type catalog holds 49 entries');
assertEqual(isServiceCreditable('Regular Marine Corps', ENL), true, 'Regular Marine Corps creditable');
assertEqual(isServiceCreditable('Military Academy Service', OFF), false, 'Academy on Officer pathway NOT creditable');
assertEqual(isServiceCreditable('Military Academy Service', ENL), true, 'Academy on Enlisted pathway creditable');
assertEqual(isServiceCreditable('Cadet/Midshipman Service (Non-Commissioned)', OFF), true, 'Non-commissioned cadet service stays creditable');
assertEqual(isServiceCreditable('Naval Academy Preparatory School (NAPS)', ENL), true, 'NAPS creditable on Enlisted pathway');
assertEqual(isServiceCreditable('Naval Academy Preparatory School (NAPS)', OFF), true, 'NAPS creditable on Officer pathway (PAA 04-25 Note 8)');
assertEqual(isServiceCreditable('Delayed Entry Program (Before January 1985)', ENL), true, 'DEP before 1985 creditable (DODFMR Vol 7A)');
assertEqual(isServiceCreditable('Delayed Entry Program (1985-1989 No IDT)', ENL), false, 'DEP 1985-1989 no IDT not creditable');
assertEqual(isServiceCreditable('Delayed Entry Program (Post 1989 w/IDT)', ENL), true, 'DEP post-1989 with IDT creditable');
assertEqual(isServiceCreditable('Delayed Entry Program (Post 1989 No IDT)', ENL), false, 'DEP post-1989 no IDT not creditable');
assertEqual(isServiceCreditable('ROTC (On/After 1 Aug 1979, Concurrent SelRes Drilling)', ENL), true, 'ROTC on/after 1 Aug 1979 with concurrent SelRes drilling creditable (DODFMR 2.1.4.10)');
assertEqual(isServiceCreditable('ROTC (1964-1979)', ENL), false, 'ROTC 1964-1979 not creditable');
assertEqual(isServiceCreditable('ROTC (Pre-1964)', ENL), false, 'ROTC pre-1964 not creditable');
assertEqual(isServiceCreditable('Philippine Army Officer', ENL), false, 'Philippine Army Officer excluded');
assertEqual(isServiceCreditable('State Guard', ENL), false, 'State Guard excluded');
assertEqual(isServiceCreditable('USUHS Student (DOM)', ENL), false, 'USUHS student excluded');
assertEqual(isServiceCreditable('Inactive National Guard', ENL), false, 'Inactive National Guard excluded');
assertEqual(isServiceCreditable('PHS Commissioned Corps', ENL), true, 'PHS Commissioned Corps creditable');
assertEqual(isServiceCreditable('NOAA Officer Service', ENL), true, 'NOAA Officer Service creditable');
assertEqual(isServiceCreditable('Service Before 10 Jan 1962', ENL), true, 'Pre-1962 service creditable');
assertEqual(isServiceCreditable('Unknown Type', ENL), false, 'Unknown type defaults to not creditable');
// PLC / officer candidate variants. DODFMR Vol 7A Ch 1 paras 2.1.3.2, 2.1.4.12.2.1, 2.2.1.8.1
// and 37 U.S.C. 205(f). Creditability comes from the variant, not the pathway, so each
// answer must hold on both pathways.
const PLC_PRE_NO_IDT = 'PLC / Officer Candidate (Inactive Before Initial ADT, No IDT)';
const PLC_PRE_IDT = 'PLC / Officer Candidate (Inactive Before Initial ADT, IDT Performed)';
const PLC_POST = 'PLC / Officer Candidate (Inactive After Initial ADT)';
const PLC_POST_205F = 'PLC / Officer Candidate (Inactive After Initial ADT, 37 USC 205(f): 16401 Financial Assistance, 12203 Appointee)';
const PLC_SELRES = 'PLC / Officer Candidate (Selected Reserve, Drilling)';
const OCS_ADT = 'Officer Candidate Active Duty for Training (OCS)';
[ENL, OFF].forEach(pw => {
    const tag = pw === ENL ? 'Enlisted' : 'Officer';
    assertEqual(isServiceCreditable(PLC_PRE_NO_IDT, pw), false, `Inactive PLC time before initial ADT without IDT excluded on ${tag} pathway (2.2.1.8.1)`);
    assertEqual(isServiceCreditable(PLC_PRE_IDT, pw), true, `Inactive PLC time before initial ADT with IDT creditable on ${tag} pathway (2.1.4.12.2.1)`);
    assertEqual(isServiceCreditable(PLC_POST, pw), true, `Inactive PLC time after initial ADT creditable on ${tag} pathway (2.1.3.2)`);
    assertEqual(isServiceCreditable(PLC_POST_205F, pw), false, `Post-ADT PLC time excluded for a 12203 appointee with 16401 assistance on ${tag} pathway (37 USC 205(f))`);
    assertEqual(isServiceCreditable(PLC_SELRES, pw), true, `Drilling Selected Reserve PLC time creditable on ${tag} pathway`);
    assertEqual(isServiceCreditable(OCS_ADT, pw), true, `OCS active duty for training creditable on ${tag} pathway`);
});

// ---------- 4. Time loss deductibility (DODFMR Table 1-2) ----------
console.log('\n[4] Time loss deductibility');
assertEqual(isTimeLossDeductible('AWOL (Absence Without Leave)'), true, 'AWOL deductible');
assertEqual(isTimeLossDeductible('Desertion'), true, 'Desertion deductible');
assertEqual(isTimeLossDeductible('Confinement (Court-Martial)'), true, 'Court-martial confinement deductible');
assertEqual(isTimeLossDeductible('Confinement (Civil, Convicted)'), true, 'Civil confinement with conviction deductible');
assertEqual(isTimeLossDeductible('Misconduct Disease/Injury (Alcohol/Drugs)'), true, 'Misconduct disease/injury deductible (Table 1-2 Rule 6)');
assertEqual(isTimeLossDeductible('Excess Leave (Unauthorized)'), true, 'Unauthorized excess leave deductible');
assertEqual(isTimeLossDeductible('Excess Leave (Authorized)'), false, 'Authorized excess leave creditable (Table 1-2 Rule 1)');
assertEqual(isTimeLossDeductible('Dropped from Rolls'), true, 'Dropped from rolls deductible');
assertEqual(isTimeLossDeductible('Ordinary Leave'), false, 'Ordinary leave NOT deductible');
assertEqual(isTimeLossDeductible('Hospitalization'), false, 'Hospitalization NOT deductible');
assertEqual(isTimeLossDeductible('TDY/TAD'), false, 'TDY/TAD NOT deductible');
assertEqual(isTimeLossDeductible('Maternity/Paternity Leave'), false, 'Maternity/paternity NOT deductible');
assertEqual(isTimeLossDeductible('Nonexistent'), false, 'Unknown loss type defaults to not deductible');

// ---------- 4b. computeLostTime (DODFMR 2.4.1.3.1, 30-day basis) ----------
console.log('\n[4b] computeLostTime');
assertEqual(computeLostTime('20150210', '20150316'), { years: 0, months: 1, days: 7 }, 'FMR example - AWOL Feb 10 to Mar 16 = 0y 1m 7d');
assertEqual(computeLostTime('20200601', '20200610'), { years: 0, months: 0, days: 10 }, 'Same-month loss counts inclusive days');
assertEqual(computeLostTime('20200731', '20200801'), { years: 0, months: 0, days: 2 }, 'Loss beginning on the 31st includes that day');
assertEqual(computeLostTime('20200601', '20200601'), { years: 0, months: 0, days: 1 }, 'Single-day loss counts 1 day');
assertEqual(computeLostTime('20200610', '20200601'), null, 'Reversed dates return null');
assertEqual(computeLostTime('20190501', '20200430'), { years: 1, months: 0, days: 0 }, 'Full year of loss normalizes to 1y 0m 0d');

// ---------- 5. subtractServiceFromDate (pure 30-day math) ----------
console.log('\n[5] subtractServiceFromDate');
assertEqual(subtractServiceFromDate('20250101', 1, 0, 0), '20240101', 'Subtract one year');
assertEqual(subtractServiceFromDate('20250315', 0, 2, 0), '20250115', 'Subtract two months');
assertEqual(subtractServiceFromDate('20250315', 0, 0, 10), '20250305', 'Subtract days without borrow');
assertEqual(subtractServiceFromDate('20250305', 0, 0, 10), '20250225', 'Day borrow crosses month on 30-day convention');
assertEqual(subtractServiceFromDate('20250115', 0, 2, 0), '20241115', 'Month borrow crosses year');
assertEqual(subtractServiceFromDate('20250330', 0, 1, 0), '20250228', 'Nominal Feb 30 clamps to real Feb 28 (non-leap)');
assertEqual(subtractServiceFromDate('20240330', 0, 1, 0), '20240229', 'Nominal Feb 30 clamps to real Feb 29 (leap)');
assertEqual(subtractServiceFromDate('2025010', 1, 0, 0), '2025010', 'Malformed input returned unchanged');

// ---------- 6. Full PEBD calculations (per-period inclusive days) ----------
console.log('\n[6] Full PEBD calculations');

// Single creditable period: 20200101-20201231.
// End adjust 31->30. Diff 0y 11m 29d. +1 inclusive = 0y 11m 30d -> 1y 0m 0d.
let r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20200101', endDate: '20201231' }
]);
assertEqual(r.normalized, { years: 1, months: 0, days: 0 }, 'One full year normalizes to 1y 0m 0d');
assertEqual(r.calculatedPEBD, '20240101', 'PEBD shifts one year earlier');

// Two consecutive periods, each gets its own +1 inclusive day (SOP rule).
// P1 20200101-20200630: diff 0y 5m 29d. P2 20200701-20201231: end 31->30, diff 0y 5m 29d.
// Sum diff 0y 10m 58d + 2 inclusive = 0y 10m 60d -> 1y 0m 0d.
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20200101', endDate: '20200630' },
    { serviceType: 'Regular Marine Corps', startDate: '20200701', endDate: '20201231' }
]);
assertEqual(r.numPeriods, 2, 'Both periods counted');
assertEqual(r.normalized, { years: 1, months: 0, days: 0 }, 'Split year with two inclusive days still 1y 0m 0d');
assertEqual(r.calculatedPEBD, '20240101', 'Split-year PEBD matches single-period PEBD');

// Non-creditable period ignored entirely.
r = computePEBD('20250101', ENL, [
    { serviceType: 'State Guard', startDate: '20200101', endDate: '20201231' }
]);
assertEqual(r.numPeriods, 0, 'Excluded type contributes no period');
assertEqual(r.calculatedPEBD, '20250101', 'PEBD unchanged with no creditable service');

// Academy period respects pathway.
r = computePEBD('20250101', OFF, [
    { serviceType: 'Military Academy Service', startDate: '20200101', endDate: '20201231' }
]);
assertEqual(r.calculatedPEBD, '20250101', 'Officer pathway academy service adds nothing');
r = computePEBD('20250101', ENL, [
    { serviceType: 'Military Academy Service', startDate: '20200101', endDate: '20201231' }
]);
assertEqual(r.calculatedPEBD, '20240101', 'Enlisted pathway academy service credits a year');

// February end-date adjustment (flat rule): period ending 20230228 -> end day 30.
// begin 2023/1/1, end 2023/2/30 -> diff 0y 1m 29d, +1 = 0y 2m 0d.
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20230101', endDate: '20230228' }
]);
assertEqual(r.normalized, { years: 0, months: 2, days: 0 }, 'Feb-end period counts full second month');
assertEqual(r.calculatedPEBD, '20241101', 'PEBD shifts two months earlier');

// Same rule on leap-year Feb 29 ending.
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20240101', endDate: '20240229' }
]);
assertEqual(r.normalized, { years: 0, months: 2, days: 0 }, 'Leap Feb 29 end treated as day 30');

// NAPS + Academy on Officer pathway (PAA 04-25 para 7.b Rule 4, Note 8):
// NAPS year credits, midshipman years do not.
// NAPS 20180723-20190517: diff 0y 9m 24d + 1 inclusive = 0y 9m 25d.
r = computePEBD('20230527', OFF, [
    { serviceType: 'Naval Academy Preparatory School (NAPS)', startDate: '20180723', endDate: '20190517' },
    { serviceType: 'Military Academy Service', startDate: '20190628', endDate: '20230526' }
]);
assertEqual(r.numPeriods, 1, 'Only the NAPS period counts on Officer pathway');
assertEqual(r.normalized, { years: 0, months: 9, days: 25 }, 'NAPS year credits 0y 9m 25d');
assertEqual(r.calculatedPEBD, '20220802', 'Commissioning PEBD recomputed to include NAPS time');

// Partial period: 20200115-20200620 -> diff 0y 5m 5d + 1 = 0y 5m 6d.
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Navy', startDate: '20200115', endDate: '20200620' }
]);
assertEqual(r.normalized, { years: 0, months: 5, days: 6 }, 'Partial period normalizes to 0y 5m 6d');
assertEqual(r.calculatedPEBD, '20240725', 'Borrow chain lands on 20240725');

// ---------- 7. Time loss integration (30-day basis per DODFMR) ----------
console.log('\n[7] Time loss integration');

// One year creditable minus 10 days AWOL: 1y 0m 0d - 0y 0m 10d -> 0y 11m 20d.
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20200101', endDate: '20201231' }
], [
    { lossType: 'AWOL (Absence Without Leave)', startDate: '20200601', endDate: '20200610', isOfficerTime: false }
]);
assertEqual(r.timeLossTotals, { years: 0, months: 0, days: 10 }, 'Ten AWOL days deducted');
assertEqual(r.normalized, { years: 0, months: 11, days: 20 }, 'Net service 0y 11m 20d after AWOL');

// Officer-time AWOL is recorded but NOT deducted (DODFMR Chapter 1).
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20200101', endDate: '20201231' }
], [
    { lossType: 'AWOL (Absence Without Leave)', startDate: '20200601', endDate: '20200610', isOfficerTime: true }
]);
assertEqual(r.timeLossApplied, false, 'Officer-time AWOL not deducted');
assertEqual(r.normalized, { years: 1, months: 0, days: 0 }, 'Full year intact with officer-time loss');

// Non-deductible loss types never reduce service.
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20200101', endDate: '20201231' }
], [
    { lossType: 'Hospitalization', startDate: '20200601', endDate: '20200630', isOfficerTime: false }
]);
assertEqual(r.timeLossApplied, false, 'Hospitalization not deducted');

// Multiple deductible losses accumulate.
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20200101', endDate: '20201231' }
], [
    { lossType: 'AWOL (Absence Without Leave)', startDate: '20200601', endDate: '20200605', isOfficerTime: false },
    { lossType: 'Confinement (Court-Martial)', startDate: '20200701', endDate: '20200705', isOfficerTime: false }
]);
assertEqual(r.timeLossTotals, { years: 0, months: 0, days: 10 }, 'Two losses accumulate to 10 days');

// Invalid loss dates contribute nothing.
r = computePEBD('20250101', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20200101', endDate: '20201231' }
], [
    { lossType: 'AWOL (Absence Without Leave)', startDate: '20200610', endDate: '20200601', isOfficerTime: false }
]);
assertEqual(r.timeLossApplied, false, 'Reversed loss dates ignored');

// ---------- 8. DODFMR Vol 7A Ch 1 worked example (para 2.4.1.3.1) ----------
console.log('\n[8] DODFMR worked example');
// Enlisted 2012-07-18, AWOL 2015-02-10 through 2015-03-16 (not made good),
// discharged 2015-08-10, reenlisted 2017-02-20.
// FMR result: creditable service 02y 11m 16d, new basic pay date March 4, 2014.
r = computePEBD('20170220', ENL, [
    { serviceType: 'Regular Marine Corps', startDate: '20120718', endDate: '20150810' }
], [
    { lossType: 'AWOL (Absence Without Leave)', startDate: '20150210', endDate: '20150316', isOfficerTime: false }
]);
assertEqual(r.timeLossTotals, { years: 0, months: 1, days: 7 }, 'FMR lost time 0y 1m 7d');
assertEqual(r.normalized, { years: 2, months: 11, days: 16 }, 'FMR creditable service 2y 11m 16d');
assertEqual(r.calculatedPEBD, '20140304', 'FMR basic pay date March 4, 2014');

// ---------- 9. PAA 04-25 worked example (Section 6) ----------
console.log('\n[9] PAA 04-25 worked example');
// DEP 1979-12-20 to 1980-03-30, Active 1980-04-01 to 1986-08-13,
// Active 1990-08-15 to 1992-08-14. Reenlisted 1995-07-10.
// PAA result: total prior service 08y 07m 24d, PEBD 1986-11-16.
r = computePEBD('19950710', ENL, [
    { serviceType: 'Delayed Entry Program (Before January 1985)', startDate: '19791220', endDate: '19800330' },
    { serviceType: 'Regular Marine Corps', startDate: '19800401', endDate: '19860813' },
    { serviceType: 'Regular Marine Corps', startDate: '19900815', endDate: '19920814' }
]);
assertEqual(r.numPeriods, 3, 'PAA example counts three creditable periods');
assertEqual(r.normalized, { years: 8, months: 7, days: 24 }, 'PAA total prior service 8y 7m 24d');
assertEqual(r.calculatedPEBD, '19861116', 'PAA adjusted PEBD 1986-11-16');

// ---------- 10. DTMS export row builder ----------
// No copy of the export logic lives here. This section parses the DTMS
// block out of pay-comparison.html and runs the shipped functions, so an
// edit to the app cannot pass this suite unnoticed. If the block markers
// move, the load throws and the run fails loudly instead of going green.
// Word formats:
//   TTC 693 003 CHEK | PAYCODE -$ AMOUNT ( TAXCODE )- PURPOSECD | ED
//   TTC 694 000 CRED | PAYCODE -$ AMOUNT ( TAXCODE ) | ED
// Tax codes per DODFMR Vol 7A: credits (694) carry the effective-period
// code 3; checkages (693) carry 3 in the current calendar year and 4 for
// any prior year. A future-dated ED is not a prior year and keeps 3.
console.log('\n[10] DTMS export (loaded from pay-comparison.html)');

const DTMS_SOURCE_FILE = require('path').join(__dirname, 'pay-comparison.html');
const DTMS_SOURCE = require('fs').readFileSync(DTMS_SOURCE_FILE, 'utf8');

const LIVE = (function loadShippedDTMS(src) {
    const a = src.indexOf('var DTMS = {');
    const b = src.indexOf('function exportDTMS');
    if (a < 0 || b < 0 || b < a) {
        throw new Error(
            'DTMS block not found in pay-comparison.html. The markers "var DTMS = {" ' +
            'and "function exportDTMS" define the extraction window. Update section 10.');
    }
    const box = {};
    const stubDoc = { getElementById: function () { return { value: '' }; } };
    new Function('out', 'document', src.slice(a, b) +
        '\nout.DTMS = DTMS;' +
        '\nout.dtmsTaxCode = dtmsTaxCode;' +
        '\nout.dtmsPaycode = dtmsPaycode;' +
        '\nout.buildDTMSRows = buildDTMSRows;' +
        '\nout.dtmsSheetRows = dtmsSheetRows;')(box, stubDoc);
    return box;
})(DTMS_SOURCE);

const DTMS = LIVE.DTMS;
const dtmsTaxCode = LIVE.dtmsTaxCode;
const dtmsPaycode = LIVE.dtmsPaycode;
const buildDTMSRows = LIVE.buildDTMSRows;
const dtmsSheetRows = LIVE.dtmsSheetRows;

// Guard the load itself. A silent empty extraction would pass every
// assertion below by never being reached.
assertEqual(typeof dtmsTaxCode, 'function', 'dtmsTaxCode loaded from pay-comparison.html');
assertEqual(typeof dtmsSheetRows, 'function', 'dtmsSheetRows loaded from pay-comparison.html');
assertEqual(typeof buildDTMSRows, 'function', 'buildDTMSRows loaded from pay-comparison.html');
assertEqual(typeof dtmsPaycode, 'function', 'dtmsPaycode loaded from pay-comparison.html');

// Pay code routing
assertEqual(dtmsPaycode('E5'), 20000, 'E5 routes to enlisted pay code 20000');
assertEqual(dtmsPaycode('E0'), 20000, 'E0 routes to enlisted pay code 20000');
assertEqual(dtmsPaycode('O3'), 10000, 'O3 routes to officer pay code 10000');
assertEqual(dtmsPaycode('O1E'), 10000, 'O1E prior-enlisted officer routes to 10000');
assertEqual(dtmsPaycode('W2'), 10000, 'W2 warrant routes to officer pay code 10000');

// Month grouping
let dsplit = buildDTMSRows([
    { dateRange: '20240110-20240119', rank: 'E5', diff: -1500 },
    { dateRange: '20240120-20240130', rank: 'E6', diff: -2500 }
]);
assertEqual(dsplit.neg, [{ paycode: 20000, amount: 40, ed: '20240110' }], 'Same-month enlisted segments merge into one 693 row with summed amount and earliest ED');
assertEqual(dsplit.pos, [], 'No 694 rows when the month nets negative');

// Sign routing across months
dsplit = buildDTMSRows([
    { dateRange: '20240101-20240130', rank: 'E5', diff: -1000 },
    { dateRange: '20240201-20240228', rank: 'E5', diff: 2000 }
]);
assertEqual(dsplit.neg, [{ paycode: 20000, amount: 10, ed: '20240101' }], 'Negative month routes to TTC 693');
assertEqual(dsplit.pos, [{ paycode: 20000, amount: 20, ed: '20240201' }], 'Positive month routes to TTC 694');

// Zero-net month dropped
dsplit = buildDTMSRows([
    { dateRange: '20240101-20240115', rank: 'E5', diff: -750 },
    { dateRange: '20240116-20240130', rank: 'E5', diff: 750 }
]);
assertEqual(dsplit.neg.length + dsplit.pos.length, 0, 'Zero-net month produces no rows');

// Mid-month commissioning splits pay codes inside one month
dsplit = buildDTMSRows([
    { dateRange: '20240101-20240114', rank: 'E5', diff: -500 },
    { dateRange: '20240115-20240130', rank: 'O1E', diff: -800 }
]);
assertEqual(dsplit.neg, [
    { paycode: 10000, amount: 8, ed: '20240115' },
    { paycode: 20000, amount: 5, ed: '20240101' }
], 'Mid-month commissioning yields one row per pay code');
assertEqual(dsplit.neg.every(g => g.ed.slice(0, 6) === '202401'), true, 'Effective dates stay inside the source month');

// Tax codes per DODFMR Vol 7A (year-relative so the tests hold at rollover)
const CUR_YR = String(new Date().getFullYear());
const PRIOR_YR = String(new Date().getFullYear() - 1);
assertEqual(dtmsTaxCode('694', PRIOR_YR + '0101'), '3', 'Prior-year credit keeps effective-period tax code 3');
assertEqual(dtmsTaxCode('694', CUR_YR + '0301'), '3', 'Current-year credit is tax code 3');
assertEqual(dtmsTaxCode('693', PRIOR_YR + '0101'), '4', 'Prior-year checkage is tax code 4 - taxes already accounted for');
assertEqual(dtmsTaxCode('693', CUR_YR + '0301'), '3', 'Current-year checkage is tax code 3');

// Sheet layout, 693 003 CHEK
let sheet = dtmsSheetRows('693', [
    { paycode: 20000, amount: 40, ed: PRIOR_YR + '0110' },
    { paycode: 20000, amount: 12.5, ed: CUR_YR + '0201' }
], '0123456789');
assertEqual(sheet[0], ['693-003: CHEK|___-$___(___)-___ ED___|'], '693 banner reads 693-003 CHEK');
assertEqual(sheet[1], ['TYPE', 'EDIPI', 'MEMBER', 'PAYCODE', 'AMOUNT', 'TAX CODE', 'PURPOSE CD', 'ED', 'HISTORY'], '693 header carries PURPOSE CD');
assertEqual(sheet[2], ['Normal', '0123456789', '', 20000, 40, '4', 'I', PRIOR_YR + '0110', 'PEBD  CHANGE'], '693 prior-year row carries Normal type, tax code 4, purpose I');
assertEqual(sheet[3][5], '3', '693 current-year row carries tax code 3');
assertEqual(sheet[3][0], '', 'TYPE is blank after the first row');
assertEqual(typeof sheet[2][1], 'string', 'EDIPI cell stays a string');
assertEqual(sheet[2][1], '0123456789', 'Leading-zero EDIPI survives intact');

// Sheet layout, 694 000 CRED - no purpose code column, tax code 3 in any year
sheet = dtmsSheetRows('694', [{ paycode: 10000, amount: 5, ed: PRIOR_YR + '0301' }], '1234567890');
assertEqual(sheet[0], ['694-000: CRED|___-$___(___) ED___|'], '694 banner reads 694-000 CRED');
assertEqual(sheet[1], ['TYPE', 'EDIPI', 'MEMBER', 'PAYCODE', 'AMOUNT', 'TAX CODE', 'ED', 'HISTORY'], '694 header omits PURPOSE CD');
assertEqual(sheet[2], ['Normal', '1234567890', '', 10000, 5, '3', PRIOR_YR + '0301', 'PEBD  CHANGE'], '694 prior-year row has tax code 3 and no purpose code field');

// Future-dated ED is not a prior year
const NEXT_YR = String(new Date().getFullYear() + 1);
assertEqual(dtmsTaxCode('693', NEXT_YR + '0301'), '3', 'Future-year checkage stays tax code 3, not 4');
assertEqual(dtmsTaxCode('694', NEXT_YR + '0301'), '3', 'Future-year credit stays tax code 3');

// Combat-zone rule travels inside the 694 workbook, not only in the UI
const NOTE = JSON.stringify(DTMS.creditNote || []).toLowerCase();
assertEqual(Array.isArray(DTMS.creditNote), true, '694 workbook carries a creditNote sheet');
assertEqual(NOTE.includes('combat'), true, 'creditNote names the combat-zone case');
assertEqual(NOTE.includes('9'), true, 'creditNote names tax code 9');
assertEqual(/tax code 3/.test(NOTE), true, 'creditNote states the exported default of 3');
assertEqual(JSON.stringify(dtmsSheetRows('694', [{ paycode: 10000, amount: 5, ed: PRIOR_YR + '0301' }], '1234567890')).toLowerCase().includes('combat'), false, 'the note stays off the Normal Transactions sheet');

const CUR_YR_N = Number(CUR_YR);

// ---------- 10b. Guided tax-code examples, end to end ----------
// Loads the pay engine AND the example definition out of pay-comparison.html,
// runs the example the button loads, and checks the sheet the user downloads.
// The example cards state row counts and tax codes, so those claims are
// asserted here against the engine rather than trusted.

const ENGINE = (function loadShippedEngine(src) {
    const mark = "})(typeof globalThis !== 'undefined' ? globalThis : this);";
    const a = src.indexOf('const PAY_DATA = {');
    const b = src.indexOf(mark);
    if (a < 0 || b < 0 || b < a) {
        throw new Error('Pay engine block not found in pay-comparison.html. Markers are ' +
            '"const PAY_DATA = {" and the IIFE tail. Update section 10b.');
    }
    const body = src.slice(a, b + mark.length)
        .replace(/<\/?script[^>]*>/g, '')
        .replace(mark, '})(shim);');
    const shim = {};
    new Function('shim', body + '\nshim.PAY_DATA = PAY_DATA;')(shim);
    return shim;
})(DTMS_SOURCE);

const taxCodeExample = (function loadExampleDef(src) {
    const a = src.indexOf('function taxCodeExample');
    const b = src.indexOf('function loadTaxCodeExample');
    if (a < 0 || b < 0 || b < a) {
        throw new Error('taxCodeExample() not found in pay-comparison.html. Update section 10b.');
    }
    const out = {};
    new Function('out', src.slice(a, b) + '\nout.f = taxCodeExample;')(out);
    return out.f;
})(DTMS_SOURCE);

assertEqual(typeof ENGINE.PayEngine.computeComparison, 'function', 'pay engine loaded from pay-comparison.html');
assertEqual(typeof taxCodeExample, 'function', 'taxCodeExample loaded from pay-comparison.html');

function runTaxExample(kind) {
    const ex = taxCodeExample(kind);
    const res = ENGINE.PayEngine.computeComparison({
        pebdA: ex.pebdA, pebdB: ex.pebdB, start: ex.start, end: ex.end,
        timeline: ex.timeline.map(function (r) { return { rank: r[0], start: r[1], end: r[2] }; }),
        payData: ENGINE.PAY_DATA
    });
    const split = buildDTMSRows(res.rows);
    return { ex: ex, res: res, split: split };
}
function codeTally(ttc, rows) {
    const t = {};
    rows.forEach(function (r) { const c = dtmsTaxCode(ttc, r.ed); t[c] = (t[c] || 0) + 1; });
    return t;
}

// Example 5, TTC 693 checkage straddling 31 December
const ex693 = runTaxExample('693');
assertEqual(ex693.ex.start, (CUR_YR_N - 1) * 10000 + 701, 'checkage example opens 1 Jul of last year');
assertEqual(ex693.ex.end, CUR_YR_N * 10000 + 630, 'checkage example closes 30 Jun of this year');
assertEqual(ex693.res.totalDiff < 0, true, 'checkage example nets negative, so Scenario B pays less');
assertEqual(ex693.split.neg.length, 12, 'checkage example yields 12 rows on the 693 sheet');
assertEqual(ex693.split.pos.length, 0, 'checkage example writes no 694 file');
assertEqual(codeTally('693', ex693.split.neg), { '4': 6, '3': 6 }, 'checkage sheet is 6 rows at tax code 4 and 6 at tax code 3');
assertEqual(ex693.split.neg.filter(function (r) { return Number(r.ed.slice(0, 4)) === CUR_YR_N - 1; })
    .every(function (r) { return dtmsTaxCode('693', r.ed) === '4'; }), true, 'every last-year checkage row is tax code 4');
assertEqual(ex693.split.neg.filter(function (r) { return Number(r.ed.slice(0, 4)) === CUR_YR_N; })
    .every(function (r) { return dtmsTaxCode('693', r.ed) === '3'; }), true, 'every this-year checkage row is tax code 3');
assertEqual(ex693.split.neg.every(function (r) { return r.paycode === 20000; }), true, 'checkage example stays on the enlisted pay code');

// Example 6, TTC 694 credit, same window, PEBDs swapped
const ex694 = runTaxExample('694');
assertEqual(ex694.ex.pebdA, ex693.ex.pebdB, 'credit example is the checkage example with the PEBDs swapped');
assertEqual(ex694.ex.pebdB, ex693.ex.pebdA, 'credit example is the checkage example with the PEBDs swapped');
assertEqual(ex694.res.totalDiff > 0, true, 'credit example nets positive, so Scenario B pays more');
assertEqual(ex694.split.pos.length, 12, 'credit example yields 12 rows on the 694 sheet');
assertEqual(ex694.split.neg.length, 0, 'credit example writes no 693 file');
assertEqual(codeTally('694', ex694.split.pos), { '3': 12 }, 'every credit row is tax code 3 regardless of year');
assertEqual(Math.abs(ex694.res.totalDiff), Math.abs(ex693.res.totalDiff), 'swapping the PEBDs flips the sign and nothing else');

// The card text is part of the deliverable. Assert what it claims.
const CARD5 = DTMS_SOURCE.slice(DTMS_SOURCE.indexOf('5. Tax Codes'), DTMS_SOURCE.indexOf('6. Tax Codes'));
const CARD6 = DTMS_SOURCE.slice(DTMS_SOURCE.indexOf('6. Tax Codes'), DTMS_SOURCE.indexOf('Member Information'));
assertEqual(/12 rows on the 693 sheet/.test(CARD5), true, 'card 5 states the 693 row count the engine produces');
assertEqual(/6 dated last year at tax code 4, 6 dated this year at tax code 3/.test(CARD5), true, 'card 5 states the 6 and 6 tax code split');
assertEqual(/12 rows on the 694 sheet, every one at tax code 3/.test(CARD6), true, 'card 6 states the 694 row count and code');
assertEqual(/READ ME/.test(CARD6), true, 'card 6 points at the READ ME sheet');

// The example is built from the current year, so it must hold at every rollover.
(function rolloverProof() {
    const RealDate = Date;
    for (let plus = 1; plus <= 5; plus++) {
        const y = new RealDate().getFullYear() + plus;
        global.Date = function () { return new RealDate(y, 5, 15); };
        global.Date.prototype = RealDate.prototype;
        global.Date.now = RealDate.now;
        let ok;
        try {
            const r = runTaxExample('693');
            const t = {};
            r.split.neg.forEach(function (row) {
                const c = Number(row.ed.slice(0, 4)) < y ? '4' : '3';
                t[c] = (t[c] || 0) + 1;
            });
            ok = r.split.neg.length === 12 && t['4'] === 6 && t['3'] === 6;
        } finally {
            global.Date = RealDate;
        }
        assertEqual(ok, true, 'example still splits 6 at code 4 and 6 at code 3 in year ' + y);
    }
})();

// EDIPI validation, read out of the shipped export gate rather than retyped
const EDIPI_RE = (function () {
    const m = DTMS_SOURCE.slice(DTMS_SOURCE.indexOf('function exportDTMS'))
        .match(/\/\^\\d\{(\d+)\}\$\//);
    if (!m) throw new Error('EDIPI gate regex not found in exportDTMS. Update section 10.');
    return new RegExp('^\\d{' + m[1] + '}$');
})();
assertEqual(EDIPI_RE.source, '^\\d{10}$', 'shipped EDIPI gate is exactly 10 digits');
assertEqual(EDIPI_RE.test('0123456789'), true, 'EDIPI with leading zero accepted');
assertEqual(EDIPI_RE.test('123456789'), false, 'Nine-digit EDIPI rejected');
assertEqual(EDIPI_RE.test('12345678A9'), false, 'EDIPI with a letter rejected');
assertEqual(EDIPI_RE.test('123-456-78'), false, 'EDIPI with special characters rejected');

// ---------- 11. PLC officer candidate (DODFMR Vol 7A Ch 1 and 37 U.S.C. 205(f)) ----------
// Anonymized fact pattern from HANDOFF-PLC-205F.md: PLC Reserve enlistment 20200915,
// OCS 20210522-20210730, inactive PLC to 20220616, commission accepted 20220617,
// active duty from 20220725.
console.log('\n[11] PLC officer candidate (DODFMR Vol 7A Ch 1 and 37 U.S.C. 205(f))');

// DODFMR path: no IDT before OCS, so the pre-OCS inactive time is excluded (2.2.1.8.1),
// OCS credits, and the post-OCS inactive Reserve time credits (2.1.3.2).
// OCS 0y 2m 9d + post-OCS 0y 10m 16d = 1y 0m 25d. PEBD lands on the OCS report date.
r = computePEBD('20220617', OFF, [
    { serviceType: PLC_PRE_NO_IDT, startDate: '20200915', endDate: '20210521' },
    { serviceType: OCS_ADT, startDate: '20210522', endDate: '20210730' },
    { serviceType: PLC_POST, startDate: '20210731', endDate: '20220616' }
]);
assertEqual(r.numPeriods, 2, 'DODFMR path counts OCS and the post-OCS Reserve time');
assertEqual(r.normalized, { years: 1, months: 0, days: 25 }, 'DODFMR path credit 1y 0m 25d');
assertEqual(r.calculatedPEBD, '20210522', 'DODFMR path PEBD equals the OCS report date');

// IDT performed before OCS: every day counts, PEBD returns to the enlistment date.
r = computePEBD('20220617', OFF, [
    { serviceType: PLC_PRE_IDT, startDate: '20200915', endDate: '20210521' },
    { serviceType: OCS_ADT, startDate: '20210522', endDate: '20210730' },
    { serviceType: PLC_POST, startDate: '20210731', endDate: '20220616' }
]);
assertEqual(r.normalized, { years: 1, months: 9, days: 2 }, 'IDT path credits 1y 9m 2d across three rows');
assertEqual(r.calculatedPEBD, '20200915', 'IDT path PEBD returns to the PLC enlistment date');

// 37 U.S.C. 205(f): 12203 appointee with 16401 financial assistance. Only OCS credits.
r = computePEBD('20220617', OFF, [
    { serviceType: PLC_PRE_NO_IDT, startDate: '20200915', endDate: '20210521' },
    { serviceType: OCS_ADT, startDate: '20210522', endDate: '20210730' },
    { serviceType: PLC_POST_205F, startDate: '20210731', endDate: '20220616' }
]);
assertEqual(r.numPeriods, 1, '205(f) path counts only the OCS period');
assertEqual(r.normalized, { years: 0, months: 2, days: 9 }, '205(f) path credit 0y 2m 9d');
assertEqual(r.calculatedPEBD, '20220408', '205(f) path PEBD 20220408');

// 205(f) path anchored on the active duty date when no commissioned status bridges the gap.
r = computePEBD('20220725', OFF, [
    { serviceType: OCS_ADT, startDate: '20210522', endDate: '20210730' }
]);
assertEqual(r.calculatedPEBD, '20220516', '205(f) path anchored on active duty entry gives 20220516');

// Drilling Selected Reserve time credits on every path.
r = computePEBD('20220617', OFF, [
    { serviceType: PLC_SELRES, startDate: '20200915', endDate: '20220616' }
]);
assertEqual(r.calculatedPEBD, '20200915', 'SelRes PLC time credits in full');

// ---------- 12. Shipped tables and cross-checks (loaded from index.html) ----------
// The service type table and the record cross-check block are read out of
// index.html and run here, so an edit to the app cannot pass unnoticed.
console.log('\n[12] Shipped tables and cross-checks (loaded from index.html)');

const CALC_SOURCE = require('fs').readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');

const SHIPPED_SERVICE_TYPES = (function loadShippedServiceTypes(src) {
    const a = src.indexOf('const SERVICE_TYPES = {');
    const b = src.indexOf('};', a);
    if (a < 0 || b < 0) throw new Error('SERVICE_TYPES block not found in index.html. Update section 12.');
    const out = {};
    new Function('out', src.slice(a, b + 2) + '\nout.t = SERVICE_TYPES;')(out);
    return out.t;
})(CALC_SOURCE);
assertEqual(SHIPPED_SERVICE_TYPES, SERVICE_TYPES, 'index.html SERVICE_TYPES matches the test copy entry for entry');

const CHECKS = (function loadShippedChecks(src) {
    const startMark = '// --- RECORD CROSS-CHECKS (loaded by test-calculations.js, keep DOM-free) ---';
    const endMark = '// --- END RECORD CROSS-CHECKS ---';
    const a = src.indexOf(startMark);
    const b = src.indexOf(endMark);
    if (a < 0 || b < 0 || b < a) throw new Error('Record cross-check block markers not found in index.html. Update section 12.');
    const out = {};
    new Function('out', 'SERVICE_TYPES', 'parseDate', src.slice(a, b) +
        '\nout.buildRecordWarnings = buildRecordWarnings;' +
        '\nout.isActiveStatusType = isActiveStatusType;' +
        '\nout.isReserveStatusType = isReserveStatusType;')(out, SERVICE_TYPES, parseDate);
    return out;
})(CALC_SOURCE);

assertEqual(CHECKS.isActiveStatusType(OCS_ADT), true, 'OCS ADT is active status');
assertEqual(CHECKS.isActiveStatusType('Regular Marine Corps'), true, 'Regular Marine Corps is active status');
assertEqual(CHECKS.isReserveStatusType(PLC_POST), true, 'Inactive PLC time is Reserve status');
assertEqual(CHECKS.isReserveStatusType('Marine Corps Reserve'), true, 'Marine Corps Reserve is Reserve status');
assertEqual(CHECKS.isReserveStatusType(OCS_ADT), false, 'OCS ADT is not Reserve status');

const pd = (period, serviceType, startDate, endDate) => ({ period, serviceType, startDate, endDate, creditable: isServiceCreditable(serviceType, OFF) });

// DODFMR path with the MCTFS fields transcribed: PEBD equals AFADBD, which is the expected
// outcome, so the only note is the confirmation prompt.
let w = CHECKS.buildRecordWarnings({
    calculatedPEBD: '20210522', doeaf: '20200915', afadbd: '20210522', plcFinancialAssistance: 'No',
    periodDetails: [pd(1, PLC_PRE_NO_IDT, '20200915', '20210521'), pd(2, OCS_ADT, '20210522', '20210730'), pd(3, PLC_POST, '20210731', '20220616')]
});
assertEqual(w.length, 1, 'DODFMR path raises one note');
assertEqual(w[0].startsWith('PEBD equals AFADBD. Expected when'), true, 'PEBD equal to AFADBD is a confirmation prompt, not an error');

// 205(f) path with consistent fields: clean.
w = CHECKS.buildRecordWarnings({
    calculatedPEBD: '20220408', doeaf: '20200915', afadbd: '20210522', plcFinancialAssistance: 'Yes',
    periodDetails: [pd(1, PLC_PRE_NO_IDT, '20200915', '20210521'), pd(2, OCS_ADT, '20210522', '20210730'), pd(3, PLC_POST_205F, '20210731', '20220616')]
});
assertEqual(w, [], '205(f) path with consistent MCTFS fields raises no warnings');

// A PEBD later than DOEAF with nothing excluded needs an explanation.
w = CHECKS.buildRecordWarnings({
    calculatedPEBD: '20210522', doeaf: '20200915', afadbd: '', plcFinancialAssistance: '',
    periodDetails: [pd(1, 'Marine Corps Reserve', '20210522', '20220724')]
});
assertEqual(w, ['PEBD is later than DOEAF with no excluded service to explain the gap. Verify creditability of each period.'], 'DOEAF gap warning fires alone');

// Zeroed AFADBD on a member with active service.
w = CHECKS.buildRecordWarnings({
    calculatedPEBD: '20220408', doeaf: '', afadbd: '00000000', plcFinancialAssistance: 'Yes',
    periodDetails: [pd(1, PLC_PRE_NO_IDT, '20200915', '20210521'), pd(2, OCS_ADT, '20210522', '20210730')]
});
assertEqual(w, ['AFADBD is missing on a member with active service. Report as a separate MCTFS record error.'], 'Zeroed AFADBD warning fires alone');

// Blank optional fields on an enlisted case: silence.
w = CHECKS.buildRecordWarnings({
    calculatedPEBD: '20200630', doeaf: '', afadbd: '', plcFinancialAssistance: '',
    periodDetails: [pd(1, 'Regular Navy', '20180601', '20211215')]
});
assertEqual(w, [], 'Blank optional fields raise nothing');

// The 205(f) variant with the financial assistance field set to No.
w = CHECKS.buildRecordWarnings({
    calculatedPEBD: '20220408', doeaf: '', afadbd: '', plcFinancialAssistance: 'No',
    periodDetails: [pd(1, PLC_POST_205F, '20210731', '20220616')]
});
assertEqual(w, ['Period 1 uses the 37 U.S.C. 205(f) variant but the financial assistance field says No.'], '205(f) row with No warns');

// Yes with the ordinary post-ADT variant is legitimate for a 531 appointee: no warning.
w = CHECKS.buildRecordWarnings({
    calculatedPEBD: '20210522', doeaf: '', afadbd: '', plcFinancialAssistance: 'Yes',
    periodDetails: [pd(1, PLC_POST, '20210731', '20220616')]
});
assertEqual(w, [], 'Yes with the ordinary post-ADT variant stays quiet');

// Every guided example card's expected PEBD, computed from the shipped example definitions.
const SHIPPED_EXAMPLES = (function loadShippedExamples(src) {
    const a = src.indexOf('const PEBD_EXAMPLES = [');
    const b = src.indexOf('];', a);
    if (a < 0 || b < 0) throw new Error('PEBD_EXAMPLES block not found in index.html. Update section 12.');
    const out = {};
    new Function('out', src.slice(a, b + 2) + '\nout.e = PEBD_EXAMPLES;')(out);
    return out.e;
})(CALC_SOURCE);
const EXPECTED_EXAMPLE_PEBDS = ['20200630', '19861116', '20140304', '20210806', '20200301', '20220802', '20210522'];
assertEqual(SHIPPED_EXAMPLES.length, EXPECTED_EXAMPLE_PEBDS.length, 'Guided example count matches the expected list');
SHIPPED_EXAMPLES.forEach((ex, k) => {
    const res = computePEBD(ex.foundational, ex.pathway,
        ex.periods.map(p => ({ serviceType: p.type, startDate: p.start, endDate: p.end })),
        ex.losses.map(l => ({ lossType: l.type, startDate: l.start, endDate: l.end, isOfficerTime: !!l.officer })));
    assertEqual(res.calculatedPEBD, EXPECTED_EXAMPLE_PEBDS[k], `Guided example ${k + 1} computes ${EXPECTED_EXAMPLE_PEBDS[k]}`);
});
assertEqual(SHIPPED_EXAMPLES[6].plcFinancialAssistance, 'No', 'PLC example loads with financial assistance answered');

// ---------- Summary ----------

console.log('\n============================');
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('============================');
if (failures.length) {
    console.log('Failed tests:');
    failures.forEach(f => console.log('  - ' + f));
}
process.exit(failed ? 1 : 0);
