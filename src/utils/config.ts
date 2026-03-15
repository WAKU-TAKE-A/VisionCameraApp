import { documentDirectory, getInfoAsync, writeAsStringAsync, readAsStringAsync } from 'expo-file-system/legacy';

export interface AppConfig {
    serverUrl: string;
    uploadPort: number;
    vePort: number;
    jobNumber: number;
    triggerNumber: number;
    timeoutSecs: number;
    username: string;
    password?: string;
    pollIntervalMs: number;
}

const CONFIG_FILE_URI = documentDirectory + 'config.json';

const DEFAULT_CONFIG: AppConfig = {
    serverUrl: 'http://10.26.57.202',
    uploadPort: 2880,
    vePort: 31000,
    jobNumber: 1,
    triggerNumber: 1,
    timeoutSecs: 300,
    username: 'admin',
    password: 'password',
    pollIntervalMs: 1000,
};

export async function loadConfig(): Promise<AppConfig> {
    const fileInfo = await getInfoAsync(CONFIG_FILE_URI);
    if (!fileInfo.exists) {
        await writeAsStringAsync(CONFIG_FILE_URI, JSON.stringify(DEFAULT_CONFIG, null, 2));
        return DEFAULT_CONFIG;
    }
    
    try {
        const content = await readAsStringAsync(CONFIG_FILE_URI);
        const parsed = JSON.parse(content);
        // Merge missing values from DEFAULT_CONFIG backwards-compatibly
        return { ...DEFAULT_CONFIG, ...parsed } as AppConfig;
    } catch (e) {
        // Fallback in case the file is corrupted
        await writeAsStringAsync(CONFIG_FILE_URI, JSON.stringify(DEFAULT_CONFIG, null, 2));
        return DEFAULT_CONFIG;
    }
}

export async function saveConfig(config: AppConfig): Promise<void> {
    await writeAsStringAsync(CONFIG_FILE_URI, JSON.stringify(config, null, 2));
}
