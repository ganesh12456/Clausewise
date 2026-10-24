import {cookies} from 'next/headers';
import {database} from '../../../lib/database';
import {sameOrigin} from '../../../lib/auth';
import {COOKIE,equal,issueSession,ownerEmail,validPassword} from '../../../lib/session';
import {endpoint,HttpError,limitedBody} from '../../../lib/http';
export const runtime='nodejs';
export const POST=endpoint(async req=>{
 if(!sameOrigin(req))throw new HttpError('Invalid origin',403);
 const body=JSON.parse(new TextDecoder().decode(await limitedBody(req,5000)));
 const c=await cookies();const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
 if(body.action==='logout'){c.set(COOKIE,'',{...options,maxAge:0});return Response.json({ok:true});}
 if(typeof body.email!=='string'||typeof body.password!=='string'||body.password.length>1024)throw new HttpError('Invalid credentials',401);
 const attempts=await database().query(`INSERT INTO login_attempts(id,failures,reset_at) VALUES('owner',1,$1)
 ON CONFLICT(id) DO UPDATE SET failures=CASE WHEN login_attempts.reset_at<$2 THEN 1 ELSE login_attempts.failures+1 END,
 reset_at=CASE WHEN login_attempts.reset_at<$2 THEN $1 ELSE login_attempts.reset_at END RETURNING failures`,[Date.now()+15*60*1000,Date.now()]);
 if(attempts.rows[0].failures>10)throw new HttpError('Too many attempts. Try again in 15 minutes.',429);
 const correct=validPassword(body.password);
 if(!equal(body.email.trim().toLowerCase(),ownerEmail())||!correct)throw new HttpError('Invalid credentials',401);
 await database().query("DELETE FROM login_attempts WHERE id='owner'");
 c.set(COOKIE,issueSession(),{...options,maxAge:8*60*60});return Response.json({ok:true});
});
