import {createCipheriv,createDecipheriv,hkdfSync,randomBytes} from 'node:crypto';

function encryptionKey(){
 const secret=process.env.SESSION_SECRET;
 if(!secret||secret.length<32)throw new Error('SESSION_SECRET must contain at least 32 characters');
 return Buffer.from(hkdfSync('sha256',secret,'','clausewise credentials v1',32));
}
export function encryptCredential(owner:string,value:string){
 const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);
 cipher.setAAD(Buffer.from(owner));const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),ciphertext.toString('base64url')].join('.');
}
export function decryptCredential(owner:string,encrypted:string){
 const [version,iv,tag,ciphertext,...rest]=encrypted.split('.');
 if(version!=='v1'||!iv||!tag||!ciphertext||rest.length)throw new Error('Invalid credential format');
 const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(iv,'base64url'));
 decipher.setAAD(Buffer.from(owner));decipher.setAuthTag(Buffer.from(tag,'base64url'));
 return Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64url')),decipher.final()]).toString('utf8');
}
