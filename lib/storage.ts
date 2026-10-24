import type {PoolClient} from 'pg';
import {HttpError} from './http.ts';
import {validDate} from './engine.ts';
type Connection=Pick<PoolClient,'query'>;
export async function workspace(db:Connection,owner:string){const records=await db.query('SELECT id,owner,kind,data,revision,created FROM records WHERE owner=$1 ORDER BY created DESC',[owner]);const events=await db.query('SELECT * FROM events WHERE owner=$1 ORDER BY created DESC LIMIT 60',[owner]);return {records:records.rows,events:events.rows};}
export async function saveRecord(db:Connection,owner:string,x:any){
 if(!['contract','policy','obligation'].includes(x.kind))throw new HttpError('Unsupported record');
 if(typeof x.id!=='string'&&x.id!==undefined)throw new HttpError('Invalid record');
 const old=x.id?(await db.query('SELECT * FROM records WHERE id=$1 AND owner=$2 AND kind=$3 FOR UPDATE',[x.id,owner,x.kind])).rows[0]:null;
 if(x.id&&!old)throw new HttpError('Not found',404);
 if(x.action==='delete'){if(!old)throw new HttpError('Not found',404);await db.query('DELETE FROM records WHERE id=$1 AND owner=$2',[x.id,owner]);await event(db,owner,'Deleted '+x.kind,x.id);return {ok:true};}
 if(!x.data||typeof x.data.name!=='string'||!x.data.name.trim()||x.data.name.length>250)throw new HttpError('A name is required');
 if(x.kind==='policy'&&(!Array.isArray(x.data.rules)||x.data.rules.length>100||x.data.rules.some((r:any)=>typeof r.phrase!=='string'||!r.phrase.trim()||typeof r.name!=='string'||!r.name.trim()||!['required','prohibited'].includes(r.mode)||!['High','Medium','Low'].includes(r.severity))))throw new HttpError('Policy rules are invalid');
 let parent=null;
 if(x.kind==='obligation'){if(typeof x.data.date!=='string'||!validDate(x.data.date))throw new HttpError('A valid confirmed date is required');const c=(await db.query("SELECT id FROM records WHERE id=$1 AND owner=$2 AND kind='contract'",[x.data.contractId,owner])).rows[0];if(!c)throw new HttpError('Contract not found',404);parent=c.id;}
 const id=x.id||crypto.randomUUID();
 if(old){if(old.revision!==x.revision)throw new HttpError('This record changed. Refresh before saving.',409);if(x.kind==='contract'){for(const k of ['text','pages','filename','sha256','coverage'])x.data[k]=old.data[k];}
 await db.query('UPDATE records SET data=$1,revision=revision+1,parent_id=$2 WHERE id=$3 AND owner=$4',[JSON.stringify(x.data),parent,id,owner]);
 }else{if(x.kind==='contract')throw new HttpError('Use document upload');await db.query('INSERT INTO records(id,owner,kind,data,created,parent_id) VALUES($1,$2,$3,$4,$5,$6)',[id,owner,x.kind,JSON.stringify(x.data),new Date().toISOString(),parent]);}
 await event(db,owner,(old?'Updated ':'Created ')+x.kind,x.data.name);return {id};
}
export async function event(db:Connection,owner:string,action:string,subject:string){await db.query('INSERT INTO events VALUES($1,$2,$3,$4,$5)',[crypto.randomUUID(),owner,action,subject,new Date().toISOString()]);}
export async function insertDocument(db:Connection,owner:string,filename:string,data:any,bytes:Uint8Array){const id=crypto.randomUUID();await db.query('INSERT INTO records(id,owner,kind,data,created) VALUES($1,$2,$3,$4,$5)',[id,owner,'contract',JSON.stringify(data),new Date().toISOString()]);await db.query('INSERT INTO originals VALUES($1,$2)',[id,Buffer.from(bytes)]);await event(db,owner,'Uploaded contract',filename);return {id};}
