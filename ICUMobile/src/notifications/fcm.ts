// Firebase Cloud Messaging setup. Defensive: if the native module isn't present
// (e.g. a JS-only reload), everything no-ops instead of crashing.
import { PermissionsAndroid, Platform } from 'react-native';
import * as api from '../api/endpoints';

let currentUserId: string | null = null;
let currentToken: string | null = null;

async function getMessaging() {
  try {
    // Lazy require so a missing native module doesn't crash app startup.
    const mod = require('@react-native-firebase/messaging').default;
    return mod();
  } catch {
    return null;
  }
}

// Called once after login. Requests permission, registers the FCM token with the
// server, and wires foreground + token-refresh handlers.
export async function initFcm(userId: string, onMessage?: (title: string, body: string) => void) {
  currentUserId = userId;
  const messaging = await getMessaging();
  if (!messaging) return;
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    const status = await messaging.requestPermission();
    // 1 = AUTHORIZED, 2 = PROVISIONAL
    if (status !== 1 && status !== 2) return;

    const token = await messaging.getToken();
    if (token) {
      currentToken = token;
      await api.registerDevice(userId, token).catch(() => {});
    }

    messaging.onTokenRefresh((t: string) => {
      currentToken = t;
      if (currentUserId) api.registerDevice(currentUserId, t).catch(() => {});
    });

    if (onMessage) {
      messaging.onMessage((msg: any) => {
        const title = msg?.notification?.title || msg?.data?.title || 'ICU Manager';
        const body = msg?.notification?.body || msg?.data?.body || '';
        onMessage(title, body);
      });
    }
  } catch {
    // Firebase unavailable — skip silently.
  }
}

// Called on sign-out: unregister this device's token so it receives no more
// pushes while signed out (the token is re-registered on the next login).
export async function unregisterFcm() {
  const token = currentToken;
  currentUserId = null;
  if (token) {
    await api.unregisterDevice(token).catch(() => {});
  }
}

export function clearFcmUser() {
  currentUserId = null;
}
