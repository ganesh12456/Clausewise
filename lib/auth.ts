import {cookies} from 'next/headers';
import {COOKIE,verifySession} from './session';
export async function getUser(){const c=await cookies();return verifySession(c.get(COOKIE)?.value||'');}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');const expected=process.env.APP_URL;return !!expected&&!!origin&&origin===new URL(expected).origin;}
