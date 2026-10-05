import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
export function createLocalDb(path=':memory:'){
 const db=new DatabaseSync(path);db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)){db.exec(readFileSync('drizzle/'+name,'utf8'));db.prepare('INSERT INTO local_migrations VALUES (?)').run(name);}
 function statement(sql,args=[]){return {async execute(){return /^SELECT/i.test(sql)?this.all():this.run()},bind(...values){return statement(sql,values)},async run(){const info=db.prepare(sql).run(...args);return {meta:{changes:info.changes}}},async all(){return {results:db.prepare(sql).all(...args)}}};}
 return {prepare:statement,async batch(items){db.exec('BEGIN');try{const result=[];for(const s of items)result.push(await s.execute());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}},close(){db.close()}};
}
