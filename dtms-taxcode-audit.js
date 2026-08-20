/* DTMS tax-code audit.
   Runs against the SHIPPED code inside pay-comparison.html, not a copy.
   Usage, from the repo root:  node dtms-taxcode-audit.js
   Rules under test:
     694 credit   -> tax code 3 in every year
     693 checkage -> tax code 4 for a prior year, 3 for the current year
   Also checks: test-file drift, future-year handling, export-date sensitivity,
   and whether the tax code reaches the actual spreadsheet cell. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || process.cwd();
const html = fs.readFileSync(path.join(ROOT, 'pay-comparison.html'), 'utf8');
const tst  = fs.readFileSync(path.join(ROOT, 'test-calculations.js'), 'utf8');

let pass = 0, fail = 0;
const chk = (c, l, d) => c ? (pass++, console.log('  PASS  ' + l))
                           : (fail++, console.log('  FAIL  ' + l + (d ? '  [' + d + ']' : '')));
const eq  = (a, e, l) => chk(a === e, l, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(e));
const norm = s => s.replace(/\s+/g, ' ').trim();

function fn(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1);
  }
  return null;
}

const block = html.slice(html.indexOf('var DTMS = {'), html.indexOf('function exportDTMS'));
const box = {};
new Function('x','document', block + '\nx.taxCode=dtmsTaxCode;x.sheetRows=dtmsSheetRows;x.rows=buildDTMSRows;x.DTMS=DTMS;')(box,{getElementById:function(){return{value:''};}});
const NOW = new Date().getFullYear();
console.log('DTMS tax-code audit. System year ' + NOW + '.\n');

console.log('[1] Stated rules, shipped implementation');
eq(box.taxCode('694', NOW + '0615'), '3', 'credit 694, current year');
eq(box.taxCode('694', (NOW - 1) + '0615'), '3', 'credit 694, prior year');
eq(box.taxCode('694', (NOW - 5) + '0615'), '3', 'credit 694, five years back');
eq(box.taxCode('693', NOW + '0101'), '3', 'checkage 693, current year, Jan 1');
eq(box.taxCode('693', NOW + '1231'), '3', 'checkage 693, current year, Dec 31');
eq(box.taxCode('693', (NOW - 1) + '1231'), '4', 'checkage 693, prior year');
eq(box.taxCode('693', (NOW - 7) + '0101'), '4', 'checkage 693, seven years back');

console.log('\n[2] Tax code reaches the spreadsheet cell');
const s693 = box.sheetRows('693', [{paycode:20000,amount:40,ed:(NOW-1)+'0110'},
                                   {paycode:20000,amount:12.34,ed:NOW+'0210'}], '0123456789');
const s694 = box.sheetRows('694', [{paycode:10000,amount:5,ed:(NOW-1)+'0301'},
                                   {paycode:10000,amount:7,ed:NOW+'0401'}], '1234567890');
eq(s693[1].indexOf('TAX CODE'), 5, '693 TAX CODE header at column 5');
eq(s694[1].indexOf('TAX CODE'), 5, '694 TAX CODE header at column 5');
eq(s693[2][5], '4', '693 prior-year row cell');
eq(s693[3][5], '3', '693 current-year row cell');
eq(s694[2][5], '3', '694 prior-year row cell');
eq(s694[3][5], '3', '694 current-year row cell');
eq(typeof s693[2][5], 'string', '693 tax code is a text cell');
eq(typeof s694[2][5], 'string', '694 tax code is a text cell');
chk(s693[1].indexOf('PURPOSE CD') === 6, '693 carries PURPOSE CD');
chk(s694[1].indexOf('PURPOSE CD') === -1, '694 omits PURPOSE CD');

console.log('\n[3] Known gaps');
eq(box.taxCode('693', (NOW + 1) + '0301'), '3', 'future-year checkage should not read as prior year');
const NOTE = JSON.stringify(box.DTMS && box.DTMS.creditNote || []).toLowerCase();
chk(NOTE.includes('combat') && NOTE.includes('9'),
    '694 workbook carries a READ ME sheet naming combat zone and tax code 9');
chk(!JSON.stringify(s694).toLowerCase().includes('combat'),
    'the note stays off the Normal Transactions sheet, so the upload rows are untouched');

console.log('\n[4] Test suite reads the shipped file, holds no copy');
for (const n of ['dtmsTaxCode', 'dtmsPaycode', 'buildDTMSRows', 'dtmsSheetRows'])
  chk(fn(tst, n) === null, 'test-calculations.js does NOT re-declare ' + n + '()');
chk(/pay-comparison\.html/.test(tst), 'test-calculations.js loads pay-comparison.html');
chk(/var DTMS = \{/.test(tst) === false && tst.includes("indexOf('var DTMS = \{')") === false
    ? tst.includes("'var DTMS = {'") : true, 'extraction markers present in the loader');

console.log('\n[5] Export-date sensitivity');
const asOf = (y, ttc, ed) => {
  const R = Date;
  global.Date = function () { return new R(y, 5, 15); };
  global.Date.prototype = R.prototype;
  const r = new Function('return ' + fn(html, 'dtmsTaxCode'))()(ttc, ed);
  global.Date = R;
  return r;
};
console.log('  Dec-' + (NOW - 1) + ' checkage exported during ' + (NOW - 1) + ' -> ' + asOf(NOW - 1, '693', (NOW - 1) + '1215'));
console.log('  Dec-' + (NOW - 1) + ' checkage exported during ' + NOW + '     -> ' + asOf(NOW, '693', (NOW - 1) + '1215'));
console.log('  The code follows the click date, not the submission date.');

console.log('\n============================');
console.log('AUDIT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================');
process.exit(fail ? 1 : 0);
