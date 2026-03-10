from flask import Flask, request, jsonify, send_file
#from flask_httpauth import HTTPDigestAuth
import os
import time
import threading

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-key-for-digest-auth'
import hashlib

def verify_digest_header(auth_header, method, uri):
    from werkzeug.http import parse_dict_header
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
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Digest '):
            from flask import Response
            import uuid
            nonce = uuid.uuid4().hex
            opaque = uuid.uuid4().hex
            return Response("Unauthorized", 401, {'WWW-Authenticate': f'Digest realm="Authentication Required", qop="auth", nonce="{nonce}", opaque="{opaque}"'})
        
        if not verify_digest_header(auth_header, request.method, request.path):
            return "Invalid Auth", 401
            
        return f(*args, **kwargs)
    return decorated

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

# グローバル状態で現在の処理状況を管理（簡易実装）
is_running = False
latest_image_path = None

@app.route('/upload', methods=['POST'])
@check_auth
def upload_file():
    global is_running, latest_image_path
    
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400
    
    # 画像を保存
    filepath = os.path.join(UPLOAD_DIR, 'captured_image.jpg')
    file.save(filepath)
    latest_image_path = filepath
    print(f"画像を受信して保存しました: {filepath}")
    
    # ダミーの処理を開始（5秒後に完了とする）
    is_running = True
    def simulate_processing():
        global is_running
        print("画像処理を開始します... (5秒)")
        time.sleep(5)
        is_running = False
        print("画像処理が完了しました！")
        
    threading.Thread(target=simulate_processing).start()
    
    return "Upload successful", 200

@app.route('/check', methods=['GET'])
@check_auth
def check_status():
    global is_running
    # isRun: 1 で処理中、0 で完了
    status = 1 if is_running else 0
    return jsonify({"isRun": status})

@app.route('/result', methods=['GET'])
@check_auth
def get_result():
    # アプリ側に返すJSONデータ
    return jsonify({
        "status": "Success",
        "description": "サーバーでのダミー処理が正常に完了しました！",
        "score": 98.5
    })

@app.route('/result_image', methods=['GET'])
@check_auth
def get_result_image():
    global latest_image_path
    # 簡易的に、アップロードされた画像をそのまま返す
    if latest_image_path and os.path.exists(latest_image_path):
        return send_file(latest_image_path, mimetype='image/jpeg')
    return "No image available", 404

if __name__ == '__main__':
    print("サーバーをポート 2880 で起動します...")
    app.run(host='0.0.0.0', port=2880, 
            debug=False) # Digest認証とThreadingの兼ね合いでdebugはFalse推奨
