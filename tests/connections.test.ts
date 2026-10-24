import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {Pool} from 'pg';
import {encryptCredential,decryptCredential} from '../lib/credential-vault.ts';
import {connectionStatus,saveConnection,loadConnection,removeConnection,testConnection} from '../lib/ai-connections.ts';

process.env.SESSION_SECRET='connection-test-secret-with-more-than-32-characters';
const secret='test-key-for-local-tests-only-123456789';
const encrypted=encryptCredential('owner',secret);
assert(!encrypted.includes(secret));
assert.equal(decryptCredential('owner',encrypted),secret);
assert.notEqual(encryptCredential('owner',secret),encrypted);
assert.throws(()=>decryptCredential('other',encrypted));
const parts=encrypted.split('.');parts[3]=(parts[3][0]==='A'?'B':'A')+parts[3].slice(1);
assert.throws(()=>decryptCredential('owner',parts.join('.')));
const originalSecret=process.env.SESSION_SECRET;process.env.SESSION_SECRET+='rotated';
assert.throws(()=>decryptCredential('owner',encrypted));process.env.SESSION_SECRET=originalSecret;

const pool=process.env.TEST_DATABASE_URL?new Pool({connectionString:process.env.TEST_DATABASE_URL}):null;
const embedded=pool?null:new PGlite();const db:any=pool?await pool.connect():embedded;
try{
 const schema=await readFile(new URL('../migrations/002_connections.sql',import.meta.url),'utf8');if(embedded)await embedded.exec(schema);else await db.query(schema);
 assert.equal((await connectionStatus(db,'owner')).configured,false);
 const saved=await saveConnection(db,'owner',secret,'gemini-2.5-flash');
 assert.equal(saved.configured,true);assert.equal(saved.verifiedAt,null);
 assert(!JSON.stringify(saved).includes(secret));
 const raw=(await db.query('SELECT * FROM ai_connections WHERE owner=$1',['owner'])).rows[0];
 assert(!JSON.stringify(raw).includes(secret));
 assert.equal((await loadConnection(db,'owner'))?.key,secret);
 assert.equal(await loadConnection(db,'other'),null);
 await assert.rejects(saveConnection(db,'owner','short','gemini-2.5-flash'),{status:400});
 await assert.rejects(saveConnection(db,'owner',secret,'https://untrusted.example'),{status:400});
 const mock:typeof fetch=async(input,init)=>{
  assert.equal(String(input),'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash');
  assert.equal(new Headers(init?.headers).get('x-goog-api-key'),secret);
  assert.equal(init?.body,undefined);
  return Response.json({supportedGenerationMethods:['generateContent']});
 };
 const tested=await testConnection(db,'owner',mock);assert(tested.verifiedAt);
 const rejected:typeof fetch=async()=>Response.json({error:{message:secret}},{status:403});
 await assert.rejects(testConnection(db,'owner',rejected),e=>{assert(!String(e).includes(secret));return true;});
 await saveConnection(db,'owner',secret+'-replacement','gemini-2.5-flash');
 assert.equal((await connectionStatus(db,'owner')).verifiedAt,null);
 await removeConnection(db,'other');assert.equal((await connectionStatus(db,'owner')).configured,true);
 await removeConnection(db,'owner');assert.equal((await connectionStatus(db,'owner')).configured,false);
 assert.equal(await loadConnection(db,'owner'),null);
 console.log('Credential encryption, isolation, provider test, replacement and deletion checks passed');
}finally{if(pool){db.release();await pool.end();}else await embedded!.close();}
