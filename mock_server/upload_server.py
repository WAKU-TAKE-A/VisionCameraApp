from flask import Flask, request, jsonify
import os
import threading
from auth import check_auth

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-key-for-digest-auth'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

is_running = False
upload_lock = threading.Lock()

@app.route('/upload', methods=['POST'])
@check_auth
def upload_file():
    global is_running
    
    with upload_lock:
        if is_running:
            return "Server is currently processing another upload.", 409
        
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400
    
    # We acquire lock to prevent others from starting. We will hold the logic in a thread
    with upload_lock:
        is_running = True
        
    filepath = os.path.join(UPLOAD_DIR, 'captured_image.jpg')
    file.save(filepath)
    print(f"画像を受信して保存しました: {filepath}")
    
    # アップロード完了後、すぐにロックを解除して次の受け付けを可能にする
    with upload_lock:
        is_running = False
        
    return "Upload successful", 200

@app.route('/status', methods=['GET'])
@check_auth
def get_status():
    global is_running
    # 1: Upload in progress / busy. 0: Ready for upload.
    status = 1 if is_running else 0
    return jsonify({"isRun": status})

if __name__ == '__main__':
    print("アップロード専用サーバーをポート 2880 で起動します...")
    app.run(host='0.0.0.0', port=2880, debug=False)
