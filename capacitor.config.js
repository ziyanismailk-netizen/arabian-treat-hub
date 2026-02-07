const config = {
  appId: 'com.arabiantreathub.app',
  appName: 'Arabian Treat Hub',
  webDir: 'out',
  server: {
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

module.exports = config;
