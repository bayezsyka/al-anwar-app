// app/_layout.tsx
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

const PRIMARY_GREEN = "#008362";

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000); // 2 detik
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashText}>
          APK ini masih dalam tahap uji coba.
        </Text>
        <ActivityIndicator style={{ marginTop: 16 }} color={PRIMARY_GREEN} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  splashLogo: {
    width: 200,
    height: 80,
    marginBottom: 16,
  },
  splashText: {
    fontSize: 13,
    color: "#4b5563",
    textAlign: "center",
  },
});
