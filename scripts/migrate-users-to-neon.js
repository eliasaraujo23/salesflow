// Migra os perfis de usuário de Firestore usuarios/{email} para a tabela `users`
// no banco de autenticação (AUTH_DATABASE_URL). Não apaga nada no Firestore —
// esse continua sendo lido por firestore.rules (isAdmin()) nesta fase.
//
// Usuários migrados ficam com password_hash = NULL e must_reset_password = true,
// já que não há senha em texto puro disponível (login era feito via backend externo).
require('dotenv').config();
const admin = require('firebase-admin');
const { Client } = require('pg');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.cert(serviceAccount) });
  const firestore = require('firebase-admin/firestore').getFirestore();
  const auth = require('firebase-admin/auth').getAuth();

  const pg = new Client({ connectionString: process.env.AUTH_DATABASE_URL });
  await pg.connect();

  const snap = await firestore.collection('usuarios').get();
  console.log(`Encontrados ${snap.size} usuários no Firestore.\n`);

  let created = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const email = doc.id;
    const data = doc.data();

    const existing = await pg.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
    if (existing.rowCount > 0) {
      console.log(`[skip] ${email} — já existe em users.`);
      skipped++;
      continue;
    }

    // Resolve ou cria a conta Firebase Auth (uid necessário para createCustomToken).
    let firebaseUid;
    try {
      const userRecord = await auth.getUserByEmail(email);
      firebaseUid = userRecord.uid;
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        if (dryRun) {
          console.log(`[dry-run] criaria conta Firebase Auth para ${email}`);
          firebaseUid = '(dry-run)';
        } else {
          const created = await auth.createUser({ email });
          firebaseUid = created.uid;
          console.log(`  Firebase Auth criado para ${email} -> uid ${firebaseUid}`);
        }
      } else {
        throw err;
      }
    }

    const row = {
      email,
      firebase_uid: firebaseUid,
      name: data.name || '',
      person_key: data.personKey || null,
      cargo: data.cargo || null,
      role: data.role || 'user',
      permissions: data.permissions || [],
    };

    if (dryRun) {
      console.log(`[dry-run] inseriria: ${JSON.stringify(row)}`);
      created++;
      continue;
    }

    await pg.query(
      `INSERT INTO users (email, firebase_uid, name, person_key, cargo, role, permissions, must_reset_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [row.email, row.firebase_uid, row.name, row.person_key, row.cargo, row.role, row.permissions]
    );
    console.log(`[ok] ${email} migrado (role=${row.role}, permissions=${row.permissions.join(',')})`);
    created++;
  }

  console.log(`\nConcluído. Criados: ${created}, já existentes (pulados): ${skipped}.`);
  if (dryRun) console.log('(dry-run — nada foi escrito no banco)');

  await pg.end();
}

main().catch(err => { console.error(err); process.exit(1); });
