// src/services/connectivityService.js
import NetInfo from '@react-native-community/netinfo';

export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
};