import {randomBytes,scryptSync} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
const rl=createInterface({input:process.stdin,output:process.stdout});
console.log('Run this locally in a private terminal. The entered password will be visible.');
const password=await rl.question('New owner password (16+ characters): ');rl.close();
if(password.length<16)throw new Error('Use at least 16 characters');
const salt=randomBytes(16).toString('hex');
console.log('OWNER_PASSWORD_HASH=scrypt:'+salt+':'+scryptSync(password,salt,64).toString('hex'));
console.log('SESSION_SECRET='+randomBytes(32).toString('hex'));
