import {getUser,sameOrigin} from '../../../lib/auth';
import {database,transaction} from '../../../lib/database';
import {workspace,saveRecord} from '../../../lib/storage';
import {endpoint,HttpError,limitedBody} from '../../../lib/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=endpoint(async()=>{const u=await getUser();if(!u)throw new HttpError('Sign in required',401);return Response.json({...await workspace(database(),u.userId),user:u,ai:!!process.env.GEMINI_API_KEY,email:false},{headers:{'Cache-Control':'private, no-store'}});});
export const POST=endpoint(async req=>{const u=await getUser();if(!u)throw new HttpError('Sign in required',401);if(!sameOrigin(req))throw new HttpError('Invalid origin',403);const x=JSON.parse(new TextDecoder().decode(await limitedBody(req,2100000)));return Response.json(await transaction(c=>saveRecord(c,u.userId,x)));});
