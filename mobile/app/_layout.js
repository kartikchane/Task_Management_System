import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { AuthProvider, useAuth } from "../src/auth";
import { ToastProvider } from "../src/toast";
import { ShellProvider } from "../src/components/layout";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Gate fontsReady={fontsLoaded || !!fontError} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Gate({ fontsReady }) {
  const { ready, user } = useAuth();
  useEffect(() => {
    if (fontsReady && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, ready]);
  if (!fontsReady || !ready) return null;
  return (
    <ToastProvider>
      <ShellProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#2f4392" }, animation: "fade" }}>
          <Stack.Protected guard={!user}>
            {/* login first: after logout the app falls back to the first allowed screen */}
            <Stack.Screen name="login" />
            <Stack.Screen name="intro" />
          </Stack.Protected>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
        </Stack>
      </ShellProvider>
    </ToastProvider>
  );
}
