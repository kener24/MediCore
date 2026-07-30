import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { appConfig } from '@/core/config/appConfig';
import { getSession } from '@/core/storage/sessionStorage';

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120) || 'documento';
}

export async function downloadAndShareAuthenticated({
  dialogTitle,
  filename,
  mimeType,
  path,
}: {
  dialogTitle: string;
  filename: string;
  mimeType: string;
  path: string;
}) {
  const session = await getSession();
  if (!session.accessToken || !FileSystem.cacheDirectory) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }
  const url = path.startsWith('http') ? path : `${appConfig.API_BASE_URL}${path}`;
  const result = await FileSystem.downloadAsync(
    url,
    `${FileSystem.cacheDirectory}${safeFilename(filename)}`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(session.sessionKey ? { 'X-Session-Key': session.sessionKey } : {}),
      },
    },
  );
  if (result.status < 200 || result.status >= 300) {
    throw new Error('No se pudo descargar el archivo.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite abrir o compartir el archivo.');
  }
  await Sharing.shareAsync(result.uri, { dialogTitle, mimeType });
  return result.uri;
}
