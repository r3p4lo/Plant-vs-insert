import type { CapacitorConfig } from "@capacitor/cli";

// Konfigurasi pembungkus Android (APK) — nama paket & aplikasi dapat diubah di sini
const config: CapacitorConfig = {
  appId: "id.gardenguardians.game",
  appName: "Garden Guardians",
  webDir: "dist",
  backgroundColor: "#123d1c",
  server: {
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#123d1c",
      androidSplashResourceName: "splash",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
