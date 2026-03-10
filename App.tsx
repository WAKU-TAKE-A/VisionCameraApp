import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import ResultScreen from './src/screens/ResultScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '初期画面' }} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'カメラ' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: '結果' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
