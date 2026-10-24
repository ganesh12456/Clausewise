import {database} from '../../../lib/database';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{await database().query('SELECT id FROM records LIMIT 1');return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({status:'not_ready'},{status:503});}}
