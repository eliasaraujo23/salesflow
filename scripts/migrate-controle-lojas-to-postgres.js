// Lê as listas de config_global/config_loja no Firestore e semeia as tabelas
// equivalentes no Postgres (Neon) dedicado ao Controle de Lojas.
// Rodar uma única vez: node scripts/migrate-controle-lojas-to-postgres.js
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

const GLOBAL_TABLES = {
  avaliadores: 'avaliadores',
  motivos_nc: 'motivos_nc',
  bancos_caixa: 'bancos_caixa',
  tipos_lancamento: 'tipos_lancamento',
  formas_pagamento: 'formas_pagamento',
  tipos_despesa: 'tipos_despesa',
  modalidades: 'modalidades',
  empresas: 'empresas',
};

async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.cert(serviceAccount) });
  const firestore = require('firebase-admin/firestore').getFirestore();

  const pg = new Client({ connectionString: process.env.CONTROLE_LOJAS_DATABASE_URL });
  await pg.connect();

  // --- config_global ---
  const globalSnap = await firestore.collection('config_global').get();
  const globalData = {};
  globalSnap.forEach(doc => { globalData[doc.id] = doc.data().lista ?? []; });

  for (const [firestoreKey, table] of Object.entries(GLOBAL_TABLES)) {
    const lista = globalData[firestoreKey] ?? [];
    for (const nome of lista) {
      const id = slugify(nome);
      if (!id) continue;
      await pg.query(
        `INSERT INTO ${table} (id, nome) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [id, nome]
      );
    }
    console.log(`${table}: ${lista.length} itens migrados`);
  }

  // vincula empresas -> modalidade via EMPRESA_TIPO_MAP (hardcoded, replicado aqui)
  const EMPRESA_TIPO_MAP = {
    'G. Tech Comércio de Joias LTDA': 'SCRAP',
    'A. Tech Comércio De Joias LTDA': 'SCRAP',
    'H. Tech Comércio De Joias LTDA': 'SCRAP',
    'Gold Tech Comércio de Joias LTDA': 'SECOND HAND',
    'Tech Gold Ipanema Comércio de Joias LTDA': 'SECOND HAND',
    '24K Joias | Thais Joias LTDA': 'SECOND HAND',
    'ETERNNO Comércio de Jóias e Artigos de Luxo LTDA': 'SECOND HAND',
  };
  for (const [empresaNome, modalidadeNome] of Object.entries(EMPRESA_TIPO_MAP)) {
    const empresaId = slugify(empresaNome);
    const modalidadeId = slugify(modalidadeNome);
    await pg.query(
      `UPDATE empresas SET modalidade_id = $1 WHERE id = $2 AND EXISTS (SELECT 1 FROM modalidades WHERE id = $1)`,
      [modalidadeId, empresaId]
    );
  }
  console.log('Vínculos empresa -> modalidade aplicados');

  // --- config_loja (feedbacks_compra por loja) ---
  for (const loja of LOJAS) {
    const doc = await firestore.collection('config_loja').doc(loja).get();
    const feedbacks = doc.exists ? (doc.data().feedbacks ?? []) : [];
    for (const nome of feedbacks) {
      const id = slugify(nome);
      if (!id) continue;
      await pg.query(
        `INSERT INTO feedbacks_compra (id, loja, nome) VALUES ($1, $2, $3) ON CONFLICT (loja, id) DO NOTHING`,
        [id, loja, nome]
      );
    }
    console.log(`feedbacks_compra[${loja}]: ${feedbacks.length} itens migrados`);
  }

  await pg.end();
  console.log('Migração concluída.');
}

main().catch(err => { console.error(err); process.exit(1); });
