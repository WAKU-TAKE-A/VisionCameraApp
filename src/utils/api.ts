import * as FileSystemLib from 'expo-file-system/legacy';
import md5 from 'md5';
import { AppConfig } from './config';

const FileSystem = FileSystemLib as any;

function getMatch(str: string, key: string) {
    const match = str.match(new RegExp(`${key}="([^"]+)"`));
    return match ? match[1] : '';
}

function buildDigestAuthHeader(
    method: string,
    uri: string,
    authenticateHeader: string,
    config: AppConfig
) {
    const realm = getMatch(authenticateHeader, 'realm');
    const nonce = getMatch(authenticateHeader, 'nonce');
    const qop = getMatch(authenticateHeader, 'qop');
    const opaque = getMatch(authenticateHeader, 'opaque');

    const ha1 = md5(`${config.username}:${realm}:${config.password || ''}`);
    const ha2 = md5(`${method}:${uri}`);

    const nc = '00000001';
    const cnonce = md5(Date.now().toString()).slice(0, 16);

    let response;
    if (qop === 'auth' || qop === 'auth-int') {
        response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    } else {
        response = md5(`${ha1}:${nonce}:${ha2}`);
    }

    let authHeader = `Digest username="${config.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
    if (opaque) authHeader += `, opaque="${opaque}"`;
    if (qop) authHeader += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

    return authHeader;
}

function getBaseUrl(config: AppConfig): string {
    let base = config.serverUrl.replace(/:\d+$/, '');
    if (base.startsWith('https://')) {
        base = base.replace('https://', 'http://');
    } else if (!base.startsWith('http://')) {
        base = 'http://' + base;
    }
    return base;
}

function getUploadUrl(config: AppConfig, path: string): string {
    return `${getBaseUrl(config)}:${config.uploadPort}${path}`;
}

function getVeUrl(config: AppConfig, path: string): string {
    return `${getBaseUrl(config)}:${config.vePort}${path}`;
}

async function fetchWithOptionalDigest(url: string, method: string, path: string, config: AppConfig) {
    const initRes = await fetch(url, { 
        method,
        headers: { 'Connection': 'close' }
    });
    if (initRes.status === 401) {
        const authHdr = initRes.headers.get('WWW-Authenticate');
        if (authHdr && authHdr.toLowerCase().startsWith('digest')) {
            return fetch(url, {
                method,
                headers: { 
                    'Authorization': buildDigestAuthHeader(method, path, authHdr, config),
                    'Connection': 'close'
                }
            });
        }
    }
    return initRes;
}

export async function checkUploadStatus(config: AppConfig): Promise<void> {
    const checkUrl = getUploadUrl(config, '/status');
    const uriPath = '/status';
    console.log(`[API] Checking upload status: ${checkUrl}`);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            if (Date.now() - startTime > config.timeoutSecs * 1000) {
                clearInterval(interval);
                reject(new Error('アップロードサーバーの待機がタイムアウトしました。'));
                return;
            }

            try {
                const response = await fetchWithOptionalDigest(checkUrl, 'GET', uriPath, config);
                if (response.ok) {
                    const data = await response.json();
                    if (data.isRun === 0) {
                        clearInterval(interval);
                        resolve();
                    }
                }
            } catch (err) {
                console.warn('Upload status check error:', err);
            }
        }, config.pollIntervalMs);
    });
}

export async function uploadImageWithDigest(imageUri: string, config: AppConfig): Promise<boolean> {
    const uploadUrl = getUploadUrl(config, '/upload');
    const uriPath = '/upload';
    console.log(`[API] Uploading image to: ${uploadUrl}`);

    try {
        const initialResponse = await fetch(uploadUrl, { method: 'POST' });
        let authHeaderValue = '';

        if (initialResponse.status === 401) {
            const authenticateHeader = initialResponse.headers.get('WWW-Authenticate');
            if (authenticateHeader && authenticateHeader.toLowerCase().startsWith('digest')) {
                authHeaderValue = buildDigestAuthHeader('POST', uriPath, authenticateHeader, config);
                console.log(`[API] Digest Auth Header generated for Upload`);
            } else {
                throw new Error('Digest認証が見つかりませんでした');
            }
        } else if (initialResponse.ok) {
            return true;
        }

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, imageUri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            headers: {
                Authorization: authHeaderValue
            }
        });

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
            return true;
        } else {
            throw new Error(`アップロードのステータスコードが異常です: ${uploadResult.status}`);
        }
    } catch (error: any) {
        throw new Error(`アップロードに失敗しました: ${error.message}`);
    }
}

export async function executeVisionEdition(config: AppConfig): Promise<string> {
    const executePath = `/ici/v1/vecom/imageProcess/execute?job=${config.jobNumber}&trig=${config.triggerNumber}`;
    const executeUrl = getVeUrl(config, executePath);
    console.log(`[API] Executing VE: ${executeUrl}`);

    const response = await fetchWithOptionalDigest(executeUrl, 'GET', executePath, config);
    if (!response.ok) {
        throw new Error(`Vision Edition の実行に失敗しました (Status: ${response.status})`);
    }

    const data = await response.json();
    if (data.status === -1) {
        throw new Error('Vision Edition でエラーが発生しました (status: -1)');
    }
    
    return data.triggerTime;
}

export async function pollVisionEditionStatus(config: AppConfig): Promise<void> {
    const statusPath = '/ici/v1/vecom/imageProcess/status';
    const statusUrl = getVeUrl(config, statusPath);
    console.log(`[API] Polling VE status: ${statusUrl}`);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            if (Date.now() - startTime > config.timeoutSecs * 1000) {
                clearInterval(interval);
                reject(new Error('Vision Edition の処理待ちがタイムアウトしました。'));
                return;
            }

            try {
                const response = await fetchWithOptionalDigest(statusUrl, 'GET', statusPath, config);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 0) { // 0: Standby
                        clearInterval(interval);
                        resolve();
                    } else if (data.status === -1) {
                        clearInterval(interval);
                        reject(new Error('Vision Edition 処理中にエラーが発生しました'));
                    }
                }
            } catch (err) {
                console.warn('VE status check error:', err);
            }
        }, config.pollIntervalMs);
    });
}

export async function fetchVisionEditionResult(config: AppConfig, triggerTime: string): Promise<string> {
    const resultPath = `/ici/v1/vecom/imageProcess/result?mode=3&triggerTime=${triggerTime}`;
    const resultUrl = getVeUrl(config, resultPath);
    console.log(`[API] Fetching VE result image: ${resultUrl}`);

    const timestamp = Date.now();
    const imageFileUri = FileSystem.documentDirectory + `result_image_${timestamp}.jpg`;

    try {
        // Try initial download. If it returns 401, we can read headers from the result.
        let dlRes = await FileSystem.downloadAsync(resultUrl, imageFileUri, {
            headers: { 
                'Connection': 'close',
                'Accept': '*/*'
            }
        });

        if (dlRes.status === 401) {
            const authHdr = dlRes.headers['www-authenticate'] || dlRes.headers['WWW-Authenticate'];
            if (authHdr && authHdr.toLowerCase().startsWith('digest')) {
                const auth = buildDigestAuthHeader('GET', resultPath, authHdr, config);
                dlRes = await FileSystem.downloadAsync(resultUrl, imageFileUri, {
                    headers: { 
                        'Authorization': auth,
                        'Connection': 'close',
                        'Accept': '*/*'
                    }
                });
            }
        }
        
        if (dlRes.status >= 200 && dlRes.status < 300) {
            return dlRes.uri;
        } else {
            throw new Error(`画像ダウンロード失敗 (Status: ${dlRes.status})`);
        }
    } catch (error: any) {
        throw new Error(`ダウンロード処理通信エラー: ${error.message}`);
    }
}
