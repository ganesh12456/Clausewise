export class HttpError extends Error {status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export async function limitedBody(req:Request,limit:number){
 if(Number(req.headers.get('content-length'))>limit)throw new HttpError('Request too large',413);
 const reader=req.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let size=0;
 while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>limit){await reader.cancel();throw new HttpError('Request too large',413);}chunks.push(r.value);}
 const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length;}return body;
}
export function endpoint(fn:(req:Request)=>Promise<Response>){return async(req:Request)=>{try{return await fn(req);}catch(e){if(e instanceof HttpError)return Response.json({error:e.message},{status:e.status});console.error('Clausewise request failed:',e instanceof Error?e.name:'Error');return Response.json({error:'Service unavailable. Check server configuration and database migration.'},{status:503});}};}
