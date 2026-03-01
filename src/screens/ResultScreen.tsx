import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type ResultScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

interface Props {
    navigation: ResultScreenNavigationProp;
    route: ResultScreenRouteProp;
}

export default function ResultScreen({ navigation, route }: Props) {
    const { isSuccess, resultData, imageUri, errorMessage } = route.params;

    return (
        <View style={styles.container}>
            {isSuccess ? (
                <>
                    <Text style={styles.title}>結果: 完了</Text>
                    {imageUri && <Image source={{ uri: 'file://' + imageUri }} style={styles.image} />}
                    <Text style={styles.info}>取得データ: {JSON.stringify(resultData)}</Text>
                </>
            ) : (
                <>
                    <Text style={[styles.title, { color: 'red' }]}>結果: エラー</Text>
                    <Text style={styles.info}>{errorMessage}</Text>
                </>
            )}

            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.buttonText}>ホームに戻る (再実行)</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    image: {
        width: 300,
        height: 300,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    info: {
        fontSize: 16,
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
