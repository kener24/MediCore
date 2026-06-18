const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://kp-software.tech/api';

export const AppConfig = {
  API_BASE_URL: apiBaseUrl.replace(/\/$/, ''),
  APP_NAME: 'MediCore Mobile',
  APP_VERSION: '1.0.0',
  ENVIRONMENT: process.env.EXPO_PUBLIC_APP_ENV || 'production',
} as const;

export const appConfig = AppConfig;
