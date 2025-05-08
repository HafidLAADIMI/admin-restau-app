import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold
} from '@expo-google-fonts/poppins';
import "../global.css"

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded, setFontsLoaded] = React.useState(false);

    useEffect(() => {
        async function loadResources() {
            try {
                // Load fonts
                await Font.loadAsync({
                    Poppins_400Regular,
                    Poppins_500Medium,
                    Poppins_600SemiBold,
                    Poppins_700Bold,
                });
                setFontsLoaded(true);
            } catch (e) {
                console.warn(e);
            } finally {
                await SplashScreen.hideAsync();
            }
        }

        loadResources();
    }, []);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerShown: false
                    }}
                />
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}