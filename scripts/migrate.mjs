import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
export async function migrate(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000});const c=await pool.connect();
 try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(8842401)');await c.query(await readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8'));await c.query('COMMIT');console.log('Database migration complete');}
 catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}
}
if(process.argv[1]===new URL(import.meta.url).pathname)await migrate();
