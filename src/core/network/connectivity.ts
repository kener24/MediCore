import NetInfo from '@react-native-community/netinfo';

export async function isDeviceOnline() {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function subscribeConnectivity(listener: (online: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    listener(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}
