import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// D1-shaped adapter keeps the same tested room transactions on a self-hosted server.
export class SQLiteBinding {
  constructor(database) { this.database = database; }
  prepare(sql) { return new Statement(this.database, sql); }
  async batch(statements) {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = statements.map(statement => statement.execute());
      this.database.exec('COMMIT');
      return result;
    } catch (error) { this.database.exec('ROLLBACK'); throw error; }
  }
  close() { this.database.close(); }
}
class Statement {
  constructor(database, sql, params = []) { this.database=database;this.sql=sql;this.params=params; }
  bind(...params) { return new Statement(this.database,this.sql,params); }
  async first(column) { const row=this.database.prepare(this.sql).get(...this.params);return row ? (column ? row[column] : {...row}) : null; }
  async all() { return {results:this.database.prepare(this.sql).all(...this.params).map(row=>({...row}))}; }
  execute() { const result=this.database.prepare(this.sql).run(...this.params);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}}; }
  async run() { return this.execute(); }
}
export async function openDatabase(dataDirectory) {
  await mkdir(dataDirectory,{recursive:true});
  const database=new DatabaseSync(resolve(dataDirectory,'spider-link.sqlite'));
  database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  database.exec('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const directory=fileURLToPath(new URL('../drizzle/',import.meta.url));
  for(const name of (await readdir(directory)).filter(name=>/^\d+.*\.sql$/.test(name)).sort()) {
    const sql=await readFile(resolve(directory,name),'utf8');
    const hash=createHash('sha256').update(sql).digest('hex');
    const applied=database.prepare('SELECT hash FROM app_migrations WHERE name=?').get(name);
    if(applied){if(applied.hash!==hash)throw new Error('Applied database migration changed: '+name);continue;}
    database.exec('BEGIN IMMEDIATE');
    try {database.exec(sql);database.prepare('INSERT INTO app_migrations(name,hash,applied_at) VALUES(?,?,?)').run(name,hash,new Date().toISOString());database.exec('COMMIT');}
    catch(error){database.exec('ROLLBACK');database.close();throw error;}
  }
  return new SQLiteBinding(database);
}
