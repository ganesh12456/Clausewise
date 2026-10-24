'use client';
import {useEffect,useState} from 'react';
type Status={configured:boolean;model:string;updatedAt:string|null;verifiedAt:string|null};
export default function AiSettings({onChange}:{onChange:(ready:boolean)=>void}){
 const [status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function request(body?:unknown){const r=await fetch('/api/settings/ai',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to update connection');return data as Status;}
 useEffect(()=>{let active=true;request().then(s=>{if(active)setStatus(s)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
 async function update(action:string,body?:{key:FormDataEntryValue|null;model:FormDataEntryValue|null},form?:HTMLFormElement){
  setBusy(action);setMessage('');setError('');
  try{const s=await request({action,...body});setStatus(s);onChange(s.configured);if(action==='save')form?.reset();setMessage(action==='save'?'API key saved. Test the connection to confirm model access.':action==='test'?'Gemini accepted the key and model. Generation quota is checked when you ask a contract question.':'API key removed.');}
  catch(e){setError(e instanceof Error?e.message:'Unable to update connection');}finally{setBusy('');}
 }
 return <section className="panel settings aiConnection"><h2>Connect Gemini</h2><p>Enter your API key here to enable cited contract answers. Your key is encrypted on the server and never shown again.</p>
 {error&&<div className="notice error" role="alert">{error}</div>}{message&&<div className="notice" role="status">{message}</div>}
 <div className="settingRow"><strong>Connection</strong><span>{status?.configured?(status.verifiedAt?'Model access verified':'Key saved · Not tested'):status?'No API key saved':'Loading…'}</span></div>
 <form key={status?.updatedAt||'new'} onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);void update('save',{key:f.get('key'),model:f.get('model')},form)}}>
 <label>Gemini API key<input name="key" type="password" autoComplete="off" spellCheck={false} required minLength={16} maxLength={512} placeholder={status?.configured?'Enter a new key to replace the saved key':'Paste your Gemini API key'} disabled={!!busy||!status}/></label>
 <label>Model ID<input name="model" defaultValue={status?.model||'gemini-2.5-flash'} placeholder="gemini-2.5-flash" required maxLength={107} pattern="gemini-[a-zA-Z0-9._-]+" disabled={!!busy||!status}/></label>
 <div className="buttons"><button className="primary" type="submit" disabled={!!busy||!status}>{busy==='save'?'Saving…':status?.configured?'Replace saved key':'Save API key'}</button><button className="secondary" type="button" disabled={!!busy||!status?.configured} onClick={()=>void update('test')}>{busy==='test'?'Testing…':'Test connection'}</button><button className="secondary danger" type="button" disabled={!!busy||!status?.configured} onClick={()=>{if(confirm('Remove the saved API key and disable AI answers?'))void update('remove')}}>Remove key</button></div>
 </form><p className="subtle">Only Gemini API keys are supported. The connection test checks model access without sending contracts. Contract questions send the relevant document text to Gemini.</p></section>;
}
