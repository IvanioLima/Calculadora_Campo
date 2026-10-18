import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.calculadoracampo.app',
  appName: 'Calculadora de Campo',
  webDir: 'dist',
  android: { allowMixedContent: false },
};

export default config;
