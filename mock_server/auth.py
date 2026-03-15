from flask import request, Response
from functools import wraps
import hashlib
from werkzeug.http import parse_dict_header
import uuid

def verify_digest_header(auth_header, method, uri):
    auth = parse_dict_header(auth_header[7:])
    username = auth.get('username')
    realm = auth.get('realm')
    nonce = auth.get('nonce')
    nc = auth.get('nc')
    cnonce = auth.get('cnonce')
    qop = auth.get('qop')
    client_response = auth.get('response')
    ha1 = hashlib.md5(f"{username}:{realm}:password".encode('utf-8')).hexdigest()
    ha2 = hashlib.md5(f"{method}:{uri}".encode('utf-8')).hexdigest()
    expected = hashlib.md5(f"{ha1}:{nonce}:{nc}:{cnonce}:{qop}:{ha2}".encode('utf-8')).hexdigest()
    return expected == client_response

def check_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Digest '):
            nonce = uuid.uuid4().hex
            opaque = uuid.uuid4().hex
            return Response(
                "Unauthorized", 
                401, 
                {'WWW-Authenticate': f'Digest realm="Authentication Required", qop="auth", nonce="{nonce}", opaque="{opaque}"'}
            )
        
        if not verify_digest_header(auth_header, request.method, request.path):
            return "Invalid Auth", 401
            
        return f(*args, **kwargs)
    return decorated
