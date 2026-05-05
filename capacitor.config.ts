import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d3c284dad79e41f48e4bdf82217ff9b3',
  appName: 'jepcabooking',
  webDir: 'dist',
  server: {
    url: 'https://d3c284da-d79e-41f4-8e4b-df82217ff9b3.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
