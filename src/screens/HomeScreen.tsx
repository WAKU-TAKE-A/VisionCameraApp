import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { loadConfig, initConfigIfNeeded } from '../utils/config';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
    navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        const setup = async () => {
            try {
                await initConfigIfNeeded();
                setIsInitializing(false);
            } catch (e: any) {
                console.error('Config init error:', e);
                Alert.alert('設定初期化エラー', `設定ファイルの作成に失敗しました。\n${e.message || e}`);
            }
        };
        setup();
    }, []);

    const handleStart = () => {
        navigation.navigate('Camera');
    };

    const handleSettings = () => {
        navigation.navigate('Settings');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Vision Camera App</Text>

            {isInitializing ? (
                <Text>初期化中...</Text>
            ) : (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={handleStart}>
                        <Text style={styles.buttonText}>実行</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.settingsButton]} onPress={handleSettings}>
                        <Text style={styles.buttonText}>設定</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    buttonContainer: {
        alignItems: 'center',
        width: '100%',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 8,
        width: 200,
        alignItems: 'center',
    },
    settingsButton: {
        backgroundColor: '#8E8E93',
        marginTop: 15,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
