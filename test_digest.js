const md5 = require('md5');

const ha1 = md5('admin:Authentication Required:password');
const ha2 = md5('POST:/upload');
const response = md5(`${ha1}:f6e94ba6ed83fbcc3613eecffc70dd7d:00000001:7d53a137caf430c6:auth:${ha2}`);

console.log('HA1:', ha1);
console.log('HA2:', ha2);
console.log('Response:', response);
