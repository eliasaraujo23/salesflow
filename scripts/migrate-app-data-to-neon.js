// Migra as 8 coleções de app compartilhadas do Firestore (tasks, metais,
// carros_chefe, fluxogramas, breachos, leilao_leiloes, leilao_regras_destino
// já seedado via schema, leilao_bases_ativas) para o banco Neon dedicado
// (APP_DATABASE_URL). Não apaga nada no Firestore — a app continua lendo de
// lá até o corte de cada coleção (Fase D do plano).
//
// Uso: node scripts/migrate-app-data-to-neon.js [--dry-run] [--only=tasks,metais,...]
require('dotenv').config();
const admin = require('firebase-admin');
const { Client } = require('pg');

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;
  return { dryRun, only };
}

function coerceCreatedAt(value) {
  if (!value) return null; // deixa o DEFAULT now() do schema assumir
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString(); // Firestore Timestamp
  return null;
}

async function migrateTasks(firestore, pg, dryRun, log) {
  const snap = await firestore.collection('tasks').get();
  log(`tasks: ${snap.size} documentos encontrados`);
  let inserted = 0, flagged = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const createdAt = coerceCreatedAt(d.createdAt);
    if (d.createdAt && createdAt === null) {
      log(`  [flag] tasks/${doc.id}: createdAt em formato não reconhecido: ${JSON.stringify(d.createdAt)}`);
      flagged++;
    }

    const row = {
      title: d.title ?? '',
      person: d.person ?? '',
      priority: d.priority ?? '',
      status: d.status ?? '',
      due: d.due ?? '',
      late: d.late ?? 0,
      description: d.description ?? d.desc ?? null,
      created_at: createdAt,
      legacy_id: doc.id,
    };

    if (dryRun) { log(`  [dry-run] inseriria: ${JSON.stringify(row)}`); inserted++; continue; }

    await pg.query(
      `INSERT INTO tasks (title, person, priority, status, due, late, description, created_at, legacy_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8::timestamptz, now()), $9)
       ON CONFLICT (legacy_id) DO NOTHING`,
      [row.title, row.person, row.priority, row.status, row.due, row.late, row.description, row.created_at, row.legacy_id]
    );
    inserted++;
  }
  log(`tasks: ${inserted} migradas, ${flagged} com createdAt sinalizado para revisão`);
}

async function migrateDeleteRequests(firestore, pg, dryRun, log) {
  const snap = await firestore.collection('task_delete_requests').get();
  log(`task_delete_requests: ${snap.size} documentos encontrados`);
  let inserted = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const row = {
      task_id: String(d.taskId ?? ''),
      title: d.title ?? null,
      requested_by: d.requestedBy ?? null,
      requested_by_name: d.requestedByName ?? null,
      legacy_id: doc.id,
    };

    if (dryRun) { log(`  [dry-run] inseriria: ${JSON.stringify(row)}`); inserted++; continue; }

    await pg.query(
      `INSERT INTO task_delete_requests (task_id, title, requested_by, requested_by_name, legacy_id)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (legacy_id) DO NOTHING`,
      [row.task_id, row.title, row.requested_by, row.requested_by_name, row.legacy_id]
    );
    inserted++;
  }
  log(`task_delete_requests: ${inserted} migradas`);
}

async function migrateMetais(firestore, pg, dryRun, log) {
  const snap = await firestore.collection('metais').get();
  log(`metais: ${snap.size} documentos encontrados`);
  let inserted = 0, flagged = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const createdAt = coerceCreatedAt(d.createdAt);
    if (d.createdAt && createdAt === null) {
      log(`  [flag] metais/${doc.id}: createdAt em formato não reconhecido: ${JSON.stringify(d.createdAt)}`);
      flagged++;
    }

    const row = {
      tipo: d.tipo, metal: d.metal,
      chegou: d.chegou ?? 0, cadastrado: d.cadastrado ?? 0, sobrou: d.sobrou ?? 0, peso: d.peso ?? 0,
      origem: d.origem ?? '', data: d.data ?? '', obs: d.obs ?? null,
      created_at: createdAt, legacy_id: doc.id,
    };

    if (!row.tipo || !row.metal) {
      log(`  [flag] metais/${doc.id}: tipo/metal ausente, pulando`);
      flagged++;
      continue;
    }

    if (dryRun) { log(`  [dry-run] inseriria: ${JSON.stringify(row)}`); inserted++; continue; }

    await pg.query(
      `INSERT INTO metais_globais (tipo, metal, chegou, cadastrado, sobrou, peso, origem, data, obs, created_at, legacy_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, now()), $11)
       ON CONFLICT (legacy_id) DO NOTHING`,
      [row.tipo, row.metal, row.chegou, row.cadastrado, row.sobrou, row.peso, row.origem, row.data, row.obs, row.created_at, row.legacy_id]
    );
    inserted++;
  }
  log(`metais: ${inserted} migradas, ${flagged} sinalizadas`);
}

async function migrateCarrosChefe(firestore, pg, dryRun, log) {
  const snap = await firestore.collection('carros_chefe').get();
  log(`carros_chefe: ${snap.size} documentos encontrados`);
  let inserted = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const row = {
      label: d.label ?? '', produto: d.produto ?? '', subtipo: d.subtipo ?? '',
      tipo_pedra: d.tipo_pedra ?? '', lapidacao: d.lapidacao ?? '', order: d.order ?? 0,
      legacy_id: doc.id,
    };

    if (dryRun) { log(`  [dry-run] inseriria: ${JSON.stringify(row)}`); inserted++; continue; }

    await pg.query(
      `INSERT INTO carros_chefe (label, produto, subtipo, tipo_pedra, lapidacao, "order", legacy_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (legacy_id) DO NOTHING`,
      [row.label, row.produto, row.subtipo, row.tipo_pedra, row.lapidacao, row.order, row.legacy_id]
    );
    inserted++;
  }
  log(`carros_chefe: ${inserted} migradas`);
}

async function migrateFluxograma(firestore, pg, dryRun, log) {
  const snap = await firestore.collection('fluxogramas').doc('empresa').get();
  if (!snap.exists) { log('fluxogramas: doc "empresa" não existe, nada a migrar'); return; }
  const d = snap.data();
  const row = { nodes: d.nodes ?? [], edges: d.edges ?? [] };

  if (dryRun) { log(`  [dry-run] inseriria fluxograma com ${row.nodes.length} nodes / ${row.edges.length} edges`); return; }

  await pg.query(
    `INSERT INTO fluxogramas (id, nodes, edges) VALUES ('empresa', $1, $2)
     ON CONFLICT (id) DO UPDATE SET nodes = EXCLUDED.nodes, edges = EXCLUDED.edges, updated_at = now()`,
    [JSON.stringify(row.nodes), JSON.stringify(row.edges)]
  );
  log('fluxogramas: migrado (1 registro singleton)');
}

async function migrateBreachos(firestore, pg, dryRun, log) {
  const snap = await firestore.collection('breachos').get();
  log(`breachos: ${snap.size} documentos encontrados`);
  let inserted = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const row = { nome: d.nome ?? '', estado: d.estado ?? '', uf: d.uf ?? '', legacy_id: doc.id };

    if (dryRun) { log(`  [dry-run] inseriria: ${JSON.stringify(row)}`); inserted++; continue; }

    await pg.query(
      `INSERT INTO breachos (nome, estado, uf, legacy_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (legacy_id) DO NOTHING`,
      [row.nome, row.estado, row.uf, row.legacy_id]
    );
    inserted++;
  }
  log(`breachos: ${inserted} migrados`);
}

async function migrateLeiloes(firestore, pg, dryRun, log) {
  const snap = await firestore.collection('leilao_leiloes').get();
  log(`leilao_leiloes: ${snap.size} documentos encontrados`);
  let inserted = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const row = {
      numero: d.numero ?? '', nome: d.nome ?? '',
      data_inicio: d.dataInicio ?? null, data_fim: d.dataFim ?? null,
      cor: d.cor ?? '', codigo_plataforma: d.codigoPlatforma ?? '',
      observacao: d.observacao ?? null, status: d.status ?? null,
      legacy_id: doc.id,
    };

    if (!row.data_inicio || !row.data_fim) {
      log(`  [flag] leilao_leiloes/${doc.id}: sem dataInicio/dataFim, pulando`);
      continue;
    }

    if (dryRun) { log(`  [dry-run] inseriria: ${JSON.stringify(row)}`); inserted++; continue; }

    await pg.query(
      `INSERT INTO leilao_leiloes (numero, nome, data_inicio, data_fim, cor, codigo_plataforma, observacao, status, legacy_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (legacy_id) DO NOTHING`,
      [row.numero, row.nome, row.data_inicio, row.data_fim, row.cor, row.codigo_plataforma, row.observacao, row.status, row.legacy_id]
    );
    inserted++;
  }
  log(`leilao_leiloes: ${inserted} migrados`);
}

async function migrateLeilaoBases(firestore, pg, dryRun, log) {
  const snap = await firestore.collection('leilao_bases_ativas').get();
  log(`leilao_bases_ativas: ${snap.size} documentos encontrados`);
  let inserted = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const createdAt = coerceCreatedAt(d.createdAt);
    const row = {
      codigo_plataforma: d.codigo_plataforma ?? null,
      filename: d.filename ?? '', count_pecas: d.count_pecas ?? 0,
      refs: d.refs ?? [], refs_vendidos: d.refs_vendidos ?? [],
      excluded: d.excluded ?? false, price_per_ref: d.price_per_ref ?? {},
      created_at: createdAt, legacy_id: doc.id,
    };

    if (dryRun) { log(`  [dry-run] inseriria: ${JSON.stringify(row)}`); inserted++; continue; }

    await pg.query(
      `INSERT INTO leilao_bases_ativas (codigo_plataforma, filename, count_pecas, refs, refs_vendidos, excluded, price_per_ref, created_at, legacy_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8::timestamptz, now()), $9)
       ON CONFLICT (legacy_id) DO NOTHING`,
      [row.codigo_plataforma, row.filename, row.count_pecas, row.refs, row.refs_vendidos, row.excluded, JSON.stringify(row.price_per_ref), row.created_at, row.legacy_id]
    );
    inserted++;
  }
  log(`leilao_bases_ativas: ${inserted} migradas`);
}

const MIGRATORS = {
  'tasks': migrateTasks,
  'task_delete_requests': migrateDeleteRequests,
  'metais': migrateMetais,
  'carros_chefe': migrateCarrosChefe,
  'fluxogramas': migrateFluxograma,
  'breachos': migrateBreachos,
  'leilao_leiloes': migrateLeiloes,
  'leilao_bases_ativas': migrateLeilaoBases,
};

async function main() {
  const { dryRun, only } = parseArgs();
  const log = (msg) => console.log(msg);

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.cert(serviceAccount) });
  const firestore = require('firebase-admin/firestore').getFirestore();

  const pg = new Client({ connectionString: process.env.APP_DATABASE_URL });
  await pg.connect();

  const targets = only ?? Object.keys(MIGRATORS);
  log(`Migrando: ${targets.join(', ')}${dryRun ? ' (dry-run)' : ''}\n`);

  for (const name of targets) {
    const fn = MIGRATORS[name];
    if (!fn) { log(`[skip] coleção desconhecida: ${name}`); continue; }
    await fn(firestore, pg, dryRun, log);
    log('');
  }

  await pg.end();
  log('Concluído.');
}

main().catch(err => { console.error(err); process.exit(1); });
