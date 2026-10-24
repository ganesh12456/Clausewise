import {getUser,sameOrigin} from '../../../../lib/auth';
import {database} from '../../../../lib/database';
import {connectionStatus,saveConnection,removeConnection,testConnection} from '../../../../lib/ai-connections';
import {endpoint,HttpError,limitedBody} from '../../../../lib/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=endpoint(async()=>{
 const u=await getUser();if(!u)throw new HttpError('Sign in required',401);
 return Response.json(await connectionStatus(database(),u.userId),{headers:{'Cache-Control':'private, no-store'}});
});
export const POST=endpoint(async req=>{
 const u=await getUser();if(!u)throw new HttpError('Sign in required',401);if(!sameOrigin(req))throw new HttpError('Invalid origin',403);
 let data;try{data=JSON.parse(new TextDecoder().decode(await limitedBody(req,5000)));}catch(e){if(e instanceof HttpError)throw e;throw new HttpError('Invalid settings');}
 if(data?.action==='save')return Response.json(await saveConnection(database(),u.userId,data.key,data.model),{headers:{'Cache-Control':'no-store'}});
 if(data?.action==='remove')return Response.json(await removeConnection(database(),u.userId),{headers:{'Cache-Control':'no-store'}});
 if(data?.action==='test')return Response.json(await testConnection(database(),u.userId),{headers:{'Cache-Control':'no-store'}});
 throw new HttpError('Unsupported settings action');
});
