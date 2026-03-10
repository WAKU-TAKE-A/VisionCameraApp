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

export function getDevUrl(config: AppConfig, path: string): string {
    let base = config.serverUrl.replace(/:\d+$/, ''); // Remove any port from the user config
    // 強制的に http にする (TLS handshake エラー防止のため)
    if (base.startsWith('https://')) {
        base = base.replace('https://', 'http://');
    } else if (!base.startsWith('http://')) {
        base = 'http://' + base;
    }
    return `${base}:${config.serverPort}${path}`;
}

export async function uploadImageWithDigest(imageUri: string, config: AppConfig): Promise<boolean> {
    const uploadUrl = getDevUrl(config, '/upload');
    console.log(`[API] Uploading image to: ${uploadUrl}`);

    try {
        const initialResponse = await fetch(uploadUrl, { method: 'POST' });
        let authHeaderValue = '';

        if (initialResponse.status === 401) {
            const authenticateHeader = initialResponse.headers.get('WWW-Authenticate');
            if (authenticateHeader && authenticateHeader.toLowerCase().startsWith('digest')) {
                const uriPath = new URL(uploadUrl).pathname; // e.g., "/upload"
                authHeaderValue = buildDigestAuthHeader('POST', uriPath, authenticateHeader, config);
                console.log(`[API] Digest Auth Header generated for Upload: ${authHeaderValue}`);
            } else {
                throw new Error('Digest認証が見つかりませんでした');
            }
        } else if (initialResponse.ok) {
            console.log('[API] Upload succeeded without auth (unexpected but ok).');
            return true;
        }

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, imageUri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file', // Depending on server
            headers: {
                Authorization: authHeaderValue
            }
        });

        console.log(`[API] Upload Result Status: ${uploadResult.status}`);
        if (uploadResult.status >= 200 && uploadResult.status < 300) {
            return true;
        } else {
            throw new Error(`アップロードのステータスコードが異常です: ${uploadResult.status}`);
        }
    } catch (error: any) {
        console.error('[API] Upload error:', error);
        throw new Error(`アップロードに失敗しました: ${error.message}`);
    }
}

export async function pollCheckEndpoint(config: AppConfig): Promise<boolean> {
    const checkUrl = getDevUrl(config, '/check');
    const uriPath = '/check';
    console.log(`[API] Polling check endpoint: ${checkUrl}`);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            if (Date.now() - startTime > config.pollTimeoutMs) {
                clearInterval(interval);
                reject(new Error('ポーリングがタイムアウトしました'));
                return;
            }

            try {
                const response = await fetch(checkUrl, { method: 'GET' });

                if (response.status === 401) {
                    const authHeader = response.headers.get('WWW-Authenticate');
                    if (authHeader && authHeader.toLowerCase().startsWith('digest')) {
                        const authResponse = await fetch(checkUrl, {
                            headers: { Authorization: buildDigestAuthHeader('GET', uriPath, authHeader, config) }
                        });
                        if (authResponse.ok) {
                            const data = await authResponse.json();
                            if (data.isRun === 0) {
                                clearInterval(interval);
                                resolve(true);
                            }
                        }
                    }
                } else if (response.ok) {
                    const data = await response.json();
                    if (data.isRun === 0) {
                        clearInterval(interval);
                        resolve(true);
                    }
                }
            } catch (err) {
                console.warn('Poll error:', err);
            }
        }, config.pollIntervalMs);
    });
}

export async function fetchResults(config: AppConfig): Promise<{ resultData: any, imageUri: string }> {
    const resultUrl = getDevUrl(config, '/result');
    const resultImageUrl = getDevUrl(config, '/result_image');
    console.log(`[API] Fetching results from: ${resultUrl}`);

    const fetchWithAuth = async (url: string, path: string) => {
        const initRes = await fetch(url);
        if (initRes.status === 401) {
            const authHdr = initRes.headers.get('WWW-Authenticate');
            return fetch(url, {
                headers: { Authorization: buildDigestAuthHeader('GET', path, authHdr || '', config) }
            });
        }
        return initRes;
    };

    try {
        const dataRes = await fetchWithAuth(resultUrl, '/result');
        const resultData = await dataRes.json();

        const timestamp = Date.now();
        const imageFileUri = FileSystem.documentDirectory + `result_image_${timestamp}.jpg`;
        let downloadedImageUri = '';

        const imgInitRes = await fetch(resultImageUrl);
        if (imgInitRes.status === 401) {
            const authHdr = imgInitRes.headers.get('WWW-Authenticate');
            const auth = buildDigestAuthHeader('GET', '/result_image', authHdr || '', config);
            const dlRes = await FileSystem.downloadAsync(resultImageUrl, imageFileUri, {
                headers: { Authorization: auth }
            });
            downloadedImageUri = dlRes.uri;
        } else {
            const dlRes = await FileSystem.downloadAsync(resultImageUrl, imageFileUri);
            downloadedImageUri = dlRes.uri;
        }

        return { resultData, imageUri: downloadedImageUri };
    } catch (error) {
        console.error('Fetch results error:', error);
        throw error;
    }
}
