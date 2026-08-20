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
    "ROTC (Post 1979 w/Reserve)": { creditable: true, category: "ROTC" },
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
    "Delayed Entry Program (Post 1989 No IDT)": { creditable: false, category: "DEP" }
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
assertEqual(Object.keys(SERVICE_TYPES).length, 43, 'Service type catalog holds 43 entries');
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
assertEqual(isServiceCreditable('ROTC (Post 1979 w/Reserve)', ENL), true, 'ROTC post-1979 with reserve creditable');
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
// Mirrors the DTMS logic shipped in pay-comparison.html: month + pay code
// grouping, sign routing to TTC 693 003 CHEK / 694 000 CRED, sheet layout,
// string EDIPI with leading zeros preserved. Word formats:
//   TTC 693 003 CHEK | PAYCODE -$ AMOUNT ( TAXCODE )- PURPOSECD | ED
//   TTC 694 000 CRED | PAYCODE -$ AMOUNT ( TAXCODE ) | ED
// Tax codes per DODFMR Vol 7A: credits (694) carry the effective-period
// code 3; checkages (693) carry 3 in the current calendar year and 4 for
// any prior year.
console.log('\n[10] DTMS export');

const DTMS = {
    purposeCode: 'I',
    history: 'PEBD  CHANGE',
    specs: {
        '693': { banner: '693-003: CHEK|___-$___(___)-___ ED___|', purpose: true },
        '694': { banner: '694-000: CRED|___-$___(___) ED___|', purpose: false }
    }
};

function dtmsTaxCode(ttc, ed) {
    if (ttc === '693' && ed.slice(0, 4) !== String(new Date().getFullYear())) return '4';
    return '3';
}

function dtmsPaycode(rank) {
    // 10000 = officer (incl. warrant), 20000 = enlisted
    return /^[OW]/.test(rank) ? 10000 : 20000;
}

function buildDTMSRows(engineRows) {
    // Aggregate engine segments into one row per month per pay code.
    var groups = {};
    engineRows.forEach(function (row) {
        var segStart = row.dateRange.split('-')[0];
        var key = segStart.slice(0, 6) + '|' + dtmsPaycode(row.rank);
        if (!groups[key]) {
            groups[key] = { paycode: dtmsPaycode(row.rank), diffCents: 0, ed: segStart };
        }
        groups[key].diffCents += row.diff;
        if (segStart < groups[key].ed) groups[key].ed = segStart;
    });
    var neg = [], pos = [];
    Object.keys(groups).sort().forEach(function (k) {
        var g = groups[k];
        if (g.diffCents === 0) return;
        (g.diffCents < 0 ? neg : pos).push({
            paycode: g.paycode,
            amount: Math.abs(g.diffCents) / 100,
            ed: g.ed
        });
    });
    return { neg: neg, pos: pos };
}

function dtmsSheetRows(ttc, rows, edipi) {
    var spec = DTMS.specs[ttc];
    var header = ['TYPE', 'EDIPI', 'MEMBER', 'PAYCODE', 'AMOUNT', 'TAX CODE'];
    if (spec.purpose) header.push('PURPOSE CD');
    header.push('ED', 'HISTORY');
    var aoa = [[spec.banner], header];
    rows.forEach(function (r, i) {
        var line = [
            i === 0 ? 'Normal' : '',
            String(edipi),
            '',
            r.paycode,
            r.amount,
            dtmsTaxCode(ttc, r.ed)
        ];
        if (spec.purpose) line.push(DTMS.purposeCode);
        line.push(r.ed, DTMS.history);
        aoa.push(line);
    });
    return aoa;
}

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

// EDIPI validation (mirrors the export gate in pay-comparison.html)
const EDIPI_RE = /^\d{10}$/;
assertEqual(EDIPI_RE.test('0123456789'), true, 'EDIPI with leading zero accepted');
assertEqual(EDIPI_RE.test('123456789'), false, 'Nine-digit EDIPI rejected');
assertEqual(EDIPI_RE.test('12345678A9'), false, 'EDIPI with a letter rejected');
assertEqual(EDIPI_RE.test('123-456-78'), false, 'EDIPI with special characters rejected');

// ---------- Summary ----------

console.log('\n============================');
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('============================');
if (failures.length) {
    console.log('Failed tests:');
    failures.forEach(f => console.log('  - ' + f));
}
process.exit(failed ? 1 : 0);
