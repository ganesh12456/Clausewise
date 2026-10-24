import type {PoolClient} from 'pg';
import {encryptCredential,decryptCredential} from './credential-vault.ts';
import {HttpError} from './http.ts';
type Connection=Pick<PoolClient,'query'>;
export const DEFAULT_MODEL='gemini-2.5-flash';
export async function connectionStatus(db:Connection,owner:string){
 const r=(await db.query('SELECT model,updated_at,verified_at FROM ai_connections WHERE owner=$1',[owner])).rows[0];
 return {configured:!!r,model:r?.model||DEFAULT_MODEL,updatedAt:r?.updated_at||null,verifiedAt:r?.verified_at||null};
}
export async function saveConnection(db:Connection,owner:string,key:unknown,model:unknown){
 if(typeof key!=='string'||key.trim().length<16||key.length>512||/\s/.test(key.trim()))throw new HttpError('Enter a valid Gemini API key');
 if(typeof model!=='string'||!/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(model))throw new HttpError('Enter a Gemini model ID');
 const encrypted=encryptCredential(owner,key.trim());
 await db.query(`INSERT INTO ai_connections(owner,encrypted_key,model,updated_at,verified_at) VALUES($1,$2,$3,$4,NULL)
 ON CONFLICT(owner) DO UPDATE SET encrypted_key=EXCLUDED.encrypted_key,model=EXCLUDED.model,updated_at=EXCLUDED.updated_at,verified_at=NULL`,[owner,encrypted,model,new Date().toISOString()]);
 return connectionStatus(db,owner);
}
export async function removeConnection(db:Connection,owner:string){await db.query('DELETE FROM ai_connections WHERE owner=$1',[owner]);return connectionStatus(db,owner);}
export async function loadConnection(db:Connection,owner:string){
 const r=(await db.query('SELECT encrypted_key,model FROM ai_connections WHERE owner=$1',[owner])).rows[0];
 if(!r)return null;
 try{return {key:decryptCredential(owner,r.encrypted_key),model:r.model,encrypted:r.encrypted_key};}
 catch{throw new HttpError('The saved key cannot be decrypted. Enter it again in Settings.',409);}
}
export async function testConnection(db:Connection,owner:string,request:typeof fetch=fetch){
 const c=await loadConnection(db,owner);if(!c)throw new HttpError('Save an API key in Settings first',409);
 let r:Response;
 try{r=await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}`,{headers:{'x-goog-api-key':c.key},signal:AbortSignal.timeout(15000)});}
 catch{throw new HttpError('Could not reach Gemini. Try again shortly.',502);}
 if(!r.ok)throw new HttpError(r.status===429?'Gemini rate limit reached. Try again later.':'Gemini rejected the connection. Check the key and model access.',r.status===429?429:422);
 const model=await r.json();if(!Array.isArray(model.supportedGenerationMethods)||!model.supportedGenerationMethods.includes('generateContent'))throw new HttpError('This model does not support content generation',422);
 // Do not mark a replacement key as verified if it changed during the provider check.
 await db.query('UPDATE ai_connections SET verified_at=$1 WHERE owner=$2 AND encrypted_key=$3',[new Date().toISOString(),owner,c.encrypted]);
 return connectionStatus(db,owner);
}
