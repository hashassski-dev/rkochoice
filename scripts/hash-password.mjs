import crypto from 'node:crypto';
const password = process.argv[2];
if (!password || password.length < 14) {
  console.error('Передайте пароль длиной не менее 14 символов.');
  process.exit(1);
}
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 64, {N:16384,r:8,p:1}).toString('hex');
console.log('ADMIN_PASSWORD_SALT=' + salt.toString('hex'));
console.log('ADMIN_PASSWORD_HASH=' + hash);
