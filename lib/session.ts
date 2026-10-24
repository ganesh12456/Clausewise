import {createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
const AGE=8*60*60;
export const COOKIE='clausewise_session';
function key(){const k=process.env.SESSION_SECRET;if(!k||k.length<32)throw new Error('SESSION_SECRET must contain at least 32 characters');return k;}
function signature(value:string){return createHmac('sha256',key()).update(value).digest('base64url');}
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function passwordHash(password:string,salt=randomBytes(16).toString('hex')){return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function validPassword(password:string){const expected=process.env.OWNER_PASSWORD_HASH||'';const [method,salt,digest]=expected.split(':');if(method!=='scrypt'||!salt||!digest)return false;return equal(passwordHash(password,salt),expected);}
export function ownerEmail(){return (process.env.OWNER_EMAIL||'').trim().toLowerCase();}
export function issueSession(now=Math.floor(Date.now()/1000)){
 const value=Buffer.from(JSON.stringify({email:ownerEmail(),exp:now+AGE,version:signature(process.env.OWNER_PASSWORD_HASH||'')})).toString('base64url');
 return value+'.'+signature(value);
}
export function verifySession(token:string,now=Math.floor(Date.now()/1000)){
 try{const [value,sig,...rest]=token.split('.');if(rest.length||!sig||!equal(signature(value),sig))return null;const data=JSON.parse(Buffer.from(value,'base64url').toString());if(data.email!==ownerEmail()||!data.email||!Number.isFinite(data.exp)||data.exp<=now||data.exp>now+AGE||!equal(data.version,signature(process.env.OWNER_PASSWORD_HASH||'')))return null;return {userId:data.email,email:data.email,displayName:data.email};}catch{return null;}
}
