// Migra os registros de metal/despesa/lancamento/caixa (Firestore, 6 lojas)
// para o Postgres (Neon) dedicado ao Controle de Lojas, convertendo campos
// de texto livre para os IDs já semeados pelas tabelas de config.
// Rodar uma única vez: node scripts/migrate-controle-lojas-registros.js
require('dotenv').config();
const { Client } = require('pg');
const admin = require('firebase-admin');

const LOJAS = ['gtt', 'gti', '24k', 'ci', 'ptq', 'pgt'];

function slugify(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDateStr(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().slice(0, 10);
}

function toISO(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString();
}

async function migrateMetal(firestore, pg, loja) {
  const snap = await firestore.collection(`metal_${loja}`).get();
  let n = 0;
  for (const doc of snap.docs) {
    const r = doc.data();
    const avaliadores = (r.avaliadores ?? []).map(slugify).filter(Boolean);
    const feedbackId = r.feedback ? slugify(r.feedback) : null;
    const isCompra = r.transacao === 'COMPRA';
    const feedbackCompraId = isCompra ? feedbackId : null;
    const feedbackNcId = !isCompra ? feedbackId : null;
    const modalidadeId = r.tipo ? slugify(r.tipo) : null;
    const empresaId = r.razao_social ? slugify(r.razao_social) : null;
    const data = toDateStr(r.data);
    const datetime = toISO(r.datetime ?? r.data) ?? new Date(0).toISOString();
    if (!data) continue;

    await pg.query(
      `INSERT INTO metal (
        id, loja, cod_interno, data, hora, datetime, avaliadores, nome, cpf, transacao,
        feedback_compra_id, feedback_nc_id, motivo_nc, modalidade_id, empresa_id,
        ouro_24k, ouro_22k, pt, ouro_750, ouro_720, bx, platina, prata,
        total_peso, preco, valor, pago_por_grama, observacao, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
      ON CONFLICT (id) DO NOTHING`,
      [
        doc.id, loja, r.cod_interno ?? '', data, r.hora ?? '', datetime, avaliadores,
        r.nome ?? '', r.cpf ?? '', r.transacao ?? 'COMPRA',
        feedbackCompraId, feedbackNcId, r.motivo_nc ?? '', modalidadeId, empresaId,
        r.ouro_24k ?? 0, r.ouro_22k ?? 0, r.pt ?? 0, r.ouro_750 ?? 0, r.ouro_720 ?? 0,
        r.bx ?? 0, r.platina ?? 0, r.prata ?? 0,
        r.total_peso ?? 0, r.preco ?? 0, r.valor ?? 0, r.pago_por_grama ?? 0,
        r.observacao ?? '', toISO(r.createdAt) ?? new Date().toISOString(),
      ]
    );
    n++;
  }
  console.log(`metal[${loja}]: ${n} registros migrados`);
}

async function migrateDespesa(firestore, pg, loja) {
  const snap = await firestore.collection(`despesa_${loja}`).get();
  let n = 0;
  for (const doc of snap.docs) {
    const r = doc.data();
    const data = toDateStr(r.data);
    if (!data) continue;
    await pg.query(
      `INSERT INTO despesa (id, loja, data, tipo_despesa_id, forma_pagamento_id, banco_caixa_id, valor, observacao, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id, loja, data,
        r.tipo_despesa ? slugify(r.tipo_despesa) : null,
        r.forma_pagamento ? slugify(r.forma_pagamento) : null,
        r.banco_caixa ? slugify(r.banco_caixa) : null,
        r.valor ?? 0, r.observacao ?? '', toISO(r.createdAt) ?? new Date().toISOString(),
      ]
    );
    n++;
  }
  console.log(`despesa[${loja}]: ${n} registros migrados`);
}

async function migrateLancamento(firestore, pg, loja) {
  const snap = await firestore.collection(`lancamento_${loja}`).get();
  let n = 0;
  for (const doc of snap.docs) {
    const r = doc.data();
    const data = toDateStr(r.data);
    if (!data) continue;
    await pg.query(
      `INSERT INTO lancamento (id, loja, data, tipo_lancamento_id, banco_caixa_id, descricao, valor, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [
        doc.id, loja, data,
        r.tipo ? slugify(r.tipo) : null,
        r.banco ? slugify(r.banco) : null,
        r.descricao ?? '', r.valor ?? 0, toISO(r.createdAt) ?? new Date().toISOString(),
      ]
    );
    n++;
  }
  console.log(`lancamento[${loja}]: ${n} registros migrados`);
}

async function migrateCaixa(firestore, pg, loja) {
  const snap = await firestore.collection(`caixa_${loja}`).get();
  let n = 0;
  let itemCount = 0;
  for (const doc of snap.docs) {
    const r = doc.data();
    await pg.query(
      `INSERT INTO caixa_registro (id, loja, updated_at) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      [doc.id, loja, toISO(r.updatedAt) ?? new Date().toISOString()]
    );
    const bruto = r.bruto ?? [];
    const trocados = r.trocados ?? [];
    for (const [grupo, items] of [['bruto', bruto], ['trocados', trocados]]) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `${doc.id}_${grupo}_${i}`;
        await pg.query(
          `INSERT INTO caixa_item (id, caixa_registro_id, grupo, local, valor) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [itemId, doc.id, grupo, item.local ?? '', item.valor ?? 0]
        );
        itemCount++;
      }
    }
    n++;
  }
  console.log(`caixa[${loja}]: ${n} registros, ${itemCount} itens migrados`);
}

async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.cert(serviceAccount) });
  const firestore = require('firebase-admin/firestore').getFirestore();

  const pg = new Client({ connectionString: process.env.CONTROLE_LOJAS_DATABASE_URL });
  await pg.connect();

  for (const loja of LOJAS) {
    await migrateMetal(firestore, pg, loja);
    await migrateDespesa(firestore, pg, loja);
    await migrateLancamento(firestore, pg, loja);
    await migrateCaixa(firestore, pg, loja);
  }

  await pg.end();
  console.log('Migração de registros concluída.');
}

main().catch(err => { console.error(err); process.exit(1); });
