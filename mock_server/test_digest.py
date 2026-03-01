import hashlib

ha1 = hashlib.md5(b'admin:Authentication Required:password').hexdigest()
ha2 = hashlib.md5(b'POST:/upload').hexdigest()
nonce = 'f6e94ba6ed83fbcc3613eecffc70dd7d'
nc = '00000001'
cnonce = '7d53a137caf430c6'
qop = 'auth'
response = hashlib.md5(f'{ha1}:{nonce}:{nc}:{cnonce}:{qop}:{ha2}'.encode('utf-8')).hexdigest()
print('Expected Response Python:', response)
