// Cria os perfis de usuário por loja no Firestore (usuarios/{email}).
// NÃO cria a conta de login (email+senha) — isso é gerenciado pelo backend
// externo goldtech-fabricacoes-api.onrender.com, fora deste repositório.
require('dotenv').config();
const admin = require('firebase-admin');

const USUARIOS = [
  { email: 'gtt@goldtechjoias.com', name: 'Gold Tech Tijuca',      permission: 'controle-gtt' },
  { email: '24k@goldtechjoias.com', name: '24K Joias',             permission: 'controle-24k' },
  { email: 'gti@goldtechjoias.com', name: 'Gold Tech Ipanema',     permission: 'controle-gti' },
  { email: 'pci@goldtechjoias.com', name: 'Prime Joias Copanema',  permission: 'controle-ci'  },
  { email: 'ptq@goldtechjoias.com', name: 'Prime Joias Taquara',   permission: 'controle-ptq' },
  { email: 'pgt@goldtechjoias.com', name: 'Premier Gold Tijuca',   permission: 'controle-pgt' },
];

async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.cert(serviceAccount) });
  const firestore = require('firebase-admin/firestore').getFirestore();

  for (const u of USUARIOS) {
    await firestore.collection('usuarios').doc(u.email).set({
      name: u.name,
      cargo: 'Loja',
      email: u.email,
      personKey: '',
      role: 'user',
      permissions: [u.permission],
    }, { merge: true });
    console.log(`Perfil criado/atualizado: ${u.email} -> ${u.permission}`);
  }

  console.log('Concluído.');
}

main().catch(err => { console.error(err); process.exit(1); });
