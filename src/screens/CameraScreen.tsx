import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { loadConfig } from '../utils/config';
import { 
    checkUploadStatus, 
    uploadImageWithDigest, 
    executeVisionEdition, 
    pollVisionEditionStatus, 
    fetchVisionEditionResult 
} from '../utils/api';

type CameraScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Camera'>;

interface Props {
    navigation: CameraScreenNavigationProp;
}

export default function CameraScreen({ navigation }: Props) {
    const [hasPermission, setHasPermission] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const device = useCameraDevice('back');
    const camera = useRef<Camera>(null);

    useEffect(() => {
        (async () => {
            const permission = await Camera.requestCameraPermission();
            setHasPermission(permission === 'granted');
        })();
    }, []);

    const handleCapture = async () => {
        if (!camera.current || isProcessing) return;
        try {
            const photo = await camera.current.takePhoto({
                flash: 'auto'
            });
            const imageUri = photo.path.startsWith('file://') ? photo.path : 'file://' + photo.path;
            setPreviewUri(imageUri);
        } catch (e: any) {
            console.error('Capture error', e);
            Alert.alert('エラー', '画像の撮影に失敗しました');
        }
    };

    const handleExecute = async () => {
        if (!previewUri || isProcessing) return;
        try {
            setIsProcessing(true);
            const config = await loadConfig();

            // 1. Wait until upload server is ready
            try {
                await checkUploadStatus(config);
            } catch (e: any) {
                throw new Error(`手順1(アップロード準備確認)失敗: ${e.message}`);
            }

            // 2. Upload image to our own upload server
            let uploadSuccess = false;
            try {
                uploadSuccess = await uploadImageWithDigest(previewUri, config);
            } catch (e: any) {
                throw new Error(`手順2(画像アップロード)失敗: ${e.message}`);
            }
            if (!uploadSuccess) {
                throw new Error('手順2(画像アップロード)失敗: 認証エラーまたはネットワークエラー');
            }

            // 3. Execute Vision Edition Job and get trigger time
            let triggerTime = '';
            try {
                triggerTime = await executeVisionEdition(config);
            } catch (e: any) {
                throw new Error(`手順3(VE実行トリガー)失敗: ${e.message}`);
            }

            // 4. Wait for Vision Edition to finish processing
            try {
                await pollVisionEditionStatus(config);
            } catch (e: any) {
                throw new Error(`手順4(VE処理完了待機)失敗: ${e.message}`);
            }

            // 5. Fetch the result image from Vision Edition
            let downloadedImageUri = '';
            try {
                downloadedImageUri = await fetchVisionEditionResult(config, triggerTime);
            } catch (e: any) {
                throw new Error(`手順5(VE結果画像取得)失敗: ${e.message}`);
            }

            setIsProcessing(false);
            setPreviewUri(null); // Reset preview for next time
            navigation.navigate('Result', { 
                imageUri: downloadedImageUri, 
                resultData: { triggerTime, message: 'Vision Edition 処理完了' }, 
                isSuccess: true 
            });
        } catch (e: any) {
            console.error(e);
            setIsProcessing(false);
            setPreviewUri(null); // Reset preview
            navigation.navigate('Result', {
                imageUri: undefined,
                resultData: null,
                isSuccess: false,
                errorMessage: e.message || '処理中にエラーが発生しました'
            });
        }
    };

    const handleRetake = () => {
        setPreviewUri(null);
    };

    if (!hasPermission) return <Text style={{ flex: 1, textAlign: 'center', marginTop: 50 }}>カメラの権限がありません</Text>;
    if (device == null) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <Camera
                ref={camera}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                photo={true}
            />

            {isProcessing && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.overlayText}>処理中...</Text>
                </View>
            )}

            {previewUri ? (
                <>
                    <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} />
                    {!isProcessing && (
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={[styles.captureButton, { backgroundColor: '#FF3B30' }]} onPress={handleRetake}>
                                <Text style={styles.buttonText}>撮り直す</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.captureButton, { backgroundColor: '#34C759' }]} onPress={handleExecute}>
                                <Text style={styles.buttonText}>実行する</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            ) : (
                <>
                    {!isProcessing && (
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
                                <Text style={styles.buttonText}>撮像</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20
    },
    captureButton: {
        backgroundColor: 'rgba(0, 122, 255, 0.8)',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 18,
    }
});
