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

function inspect(code, targets) {
  const buf = fs.readFileSync(`G:\\USUÁRIOS\\ELIAS\\LOJASFLOW\\${code}.csv`);
  const rows = parseCsv(decodeBuffer(buf));
  const header = rows[0];
  const iFeedback = header.indexOf('FEEDBACK');
  const iData = header.indexOf('DATA');
  const iCod = header.indexOf('COD INTERNO');
  const iNome = header.indexOf('NOME');
  const iAv1 = header.indexOf('AV1');
  const iObs = header.indexOf('OBSERVACAO');
  const targetSet = new Set(targets);

  console.log(`\n=== ${code} ===`);
  for (const r of rows.slice(1)) {
    const fb = (r[iFeedback] || '').trim();
    if (targetSet.has(fb)) {
      console.log(JSON.stringify({
        feedback: fb, cod: r[iCod], data: r[iData], nome: r[iNome], av1: r[iAv1], obs: (r[iObs] || '').slice(0, 60)
      }));
    }
  }
}

inspect('GTI', ['MDM', 'B', 'O', 'i', 'ROSE', 'MM', '2', '1', 'E']);
inspect('24K', ['?', 'BGT', 'BB']);
