const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({ connectionString: process.env.AUTH_DATABASE_URL });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'auth-schema.sql'), 'utf-8');
  await client.query(sql);
  console.log('Schema de autenticação aplicado com sucesso.');
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
