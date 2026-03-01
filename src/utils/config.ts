import { documentDirectory, getInfoAsync, writeAsStringAsync, readAsStringAsync } from 'expo-file-system/legacy';

export interface AppConfig {
    serverUrl: string;
    serverPort: number;
    username: string;
    password?: string;
    pollIntervalMs: number;
    pollTimeoutMs: number;
}

const CONFIG_FILE_URI = documentDirectory + 'config.json';

const DEFAULT_CONFIG: AppConfig = {
    serverUrl: 'http://192.168.0.121',
    serverPort: 31000,
    username: 'admin',
    password: 'password',
    pollIntervalMs: 1000,
    pollTimeoutMs: 30000,
};

export async function initConfigIfNeeded() {
    await writeAsStringAsync(CONFIG_FILE_URI, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

export async function loadConfig(): Promise<AppConfig> {
    await initConfigIfNeeded();
    const content = await readAsStringAsync(CONFIG_FILE_URI);
    return JSON.parse(content) as AppConfig;
}
