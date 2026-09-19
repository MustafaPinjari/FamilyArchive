const Database = require('better-sqlite3');
const db = new Database('data/archive.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('TABLES:', tables.map(t => t.name));

for (const t of tables) {
  if (t.name.startsWith('sqlite_')) continue;
  console.log('\n========================================');
  console.log('TABLE:', t.name);
  console.log('========================================');
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  for (const c of cols) {
    console.log(`  ${c.name} : ${c.type} ${c.notnull ? 'NOT NULL' : ''} ${c.pk ? 'PRIMARY KEY' : ''} ${c.dflt_value !== null ? 'DEFAULT ' + c.dflt_value : ''}`);
  }
  const count = db.prepare(`SELECT count(*) as c FROM ${t.name}`).get().c;
  console.log(`TOTAL ROWS: ${count}`);
}
