import { create } from 'axios';

import { setupAuthInterceptors } from '@/core/api/authInterceptor';
import { appConfig } from '@/core/config/appConfig';

export const apiClient = create({
  baseURL: appConfig.API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

setupAuthInterceptors(apiClient);
