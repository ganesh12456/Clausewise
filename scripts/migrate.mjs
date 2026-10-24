import {Pool} from 'pg';
import {readFile,readdir} from 'node:fs/promises';
export async function migrate(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000});const c=await pool.connect();
 try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(8842401)');for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort())await c.query(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));await c.query('COMMIT');console.log('Database migration complete');}
 catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}
}
if(process.argv[1]===new URL(import.meta.url).pathname)await migrate();
