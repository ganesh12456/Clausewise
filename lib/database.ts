import { Pool, type PoolClient } from 'pg';
let pool: Pool;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return pool ??= new Pool({connectionString:process.env.DATABASE_URL, max:5, connectionTimeoutMillis:10000, idleTimeoutMillis:30000});
}
export async function transaction<T>(work:(client:PoolClient)=>Promise<T>):Promise<T> {
  const c=await database().connect();
  try {await c.query('BEGIN');const result=await work(c);await c.query('COMMIT');return result;}
  catch(e){await c.query('ROLLBACK');throw e;} finally{c.release();}
}
