const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'store.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

// Inicializar conexão com SQLite
const db = new Database(DB_PATH, { verbose: null });

// Ativar chaves estrangeiras e modo WAL para alta performance e concorrência
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Função para inicializar o esquema
function initDatabase() {
    try {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        db.exec(schema);
        console.log('✅ Base de dados SQLite inicializada com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao inicializar a base de dados:', err);
        throw err;
    }
}

module.exports = {
    db,
    initDatabase,
    DB_PATH
};
