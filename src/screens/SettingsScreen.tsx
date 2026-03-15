import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { loadConfig, saveConfig, AppConfig } from '../utils/config';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
    navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [serverUrl, setServerUrl] = useState('');
    const [uploadPort, setUploadPort] = useState('');
    const [vePort, setVePort] = useState('');
    const [jobNumber, setJobNumber] = useState('');
    const [triggerNumber, setTriggerNumber] = useState('');
    const [timeoutSecs, setTimeoutSecs] = useState('');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const conf = await loadConfig();
                setConfig(conf);
                setServerUrl(conf.serverUrl);
                setUploadPort(conf.uploadPort.toString());
                setVePort(conf.vePort.toString());
                setJobNumber(conf.jobNumber.toString());
                setTriggerNumber(conf.triggerNumber.toString());
                setTimeoutSecs(conf.timeoutSecs.toString());
            } catch (e: any) {
                Alert.alert('エラー', '設定の読み込みに失敗しました');
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        if (!config) return;

        const uploadPortNum = parseInt(uploadPort, 10);
        const vePortNum = parseInt(vePort, 10);
        const jobNum = parseInt(jobNumber, 10);
        const triggerNum = parseInt(triggerNumber, 10);
        const timeoutNum = parseInt(timeoutSecs, 10);

        if ([uploadPortNum, vePortNum, jobNum, triggerNum, timeoutNum].some(n => isNaN(n) || n <= 0)) {
            Alert.alert('エラー', '有効な数値を入力してください');
            return;
        }

        const newConfig = { 
            ...config, 
            serverUrl, 
            uploadPort: uploadPortNum,
            vePort: vePortNum,
            jobNumber: jobNum,
            triggerNumber: triggerNum,
            timeoutSecs: timeoutNum
        };
        try {
            await saveConfig(newConfig);
            Alert.alert('成功', '設定を保存しました', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (e: any) {
            Alert.alert('エラー', '設定の保存に失敗しました');
        }
    };

    if (!config) {
        return (
            <View style={styles.container}>
                <Text>読み込み中...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.label}>サーバーURL (例: http://10.26.57.202)</Text>
                <TextInput
                    style={styles.input}
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    keyboardType="url"
                    autoCapitalize="none"
                />

                <Text style={styles.label}>アップロード用ポート番号 (例: 2880)</Text>
                <TextInput
                    style={styles.input}
                    value={uploadPort}
                    onChangeText={setUploadPort}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Vision Edition用ポート番号 (例: 31000)</Text>
                <TextInput
                    style={styles.input}
                    value={vePort}
                    onChangeText={setVePort}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>ジョブ番号 (例: 1)</Text>
                <TextInput
                    style={styles.input}
                    value={jobNumber}
                    onChangeText={setJobNumber}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>トリガー番号 (例: 1)</Text>
                <TextInput
                    style={styles.input}
                    value={triggerNumber}
                    onChangeText={setTriggerNumber}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>タイムアウト[秒] (例: 300)</Text>
                <TextInput
                    style={styles.input}
                    value={timeoutSecs}
                    onChangeText={setTimeoutSecs}
                    keyboardType="numeric"
                />

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>保存</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        padding: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: 'bold',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        fontSize: 16,
        color: '#000',
    },
    saveButton: {
        backgroundColor: '#34C759',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
