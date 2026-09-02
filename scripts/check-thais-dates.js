const fs = require('fs');
function decodeBuffer(buf) {
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return buf.slice(3).toString('utf8');
  const utf8 = buf.toString('utf8');
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  return replacementCount > 5 ? buf.toString('latin1') : utf8;
}
function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; } else field += c; }
    else { if (c === '"') inQuotes = true; else if (c === ';') { row.push(field); field = ''; } else if (c === '\r') {} else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; } else field += c; }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
const buf = fs.readFileSync('G:\\USUÁRIOS\\ELIAS\\LOJASFLOW\\GTI.csv');
const rows = parseCsv(decodeBuffer(buf));
const header = rows[0];
const iData = header.indexOf('DATA');
const iAv = [header.indexOf('AV1'), header.indexOf('AV2'), header.indexOf('AV3'), header.indexOf('AV4')];
const found = [];
for (const r of rows.slice(1)) {
  for (const i of iAv) {
    const v = (r[i] || '').trim();
    if (v === 'Thais' || v === 'Thaís') found.push({ v, data: (r[iData] || '').trim() });
  }
}
console.log('Thais/Thaís (sem sobrenome) aparece em', found.length, 'linhas.');
console.log(JSON.stringify(found.slice(0, 20), null, 2));
const dates = found.map(f => f.data).sort();
console.log('min:', dates[0], 'max:', dates[dates.length - 1]);
