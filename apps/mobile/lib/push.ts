import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { NotificationCategory } from '@help/types';
import { ANDROID_CHANNELS, androidChannelFor } from '@help/domain';
import { api } from './api';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const CHANNELS = ANDROID_CHANNELS.map((c) => ({ id: c.id, name: c.name, importance: c.high ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.LOW }));
export const channelFor = (c: NotificationCategory) => androidChannelFor(c);

let configured = false;
/** The in-app banner replaces the OS banner while the app is open, so foreground pushes are not shown by the system. */
export function configureNotifications() {
  if (configured) return;
  configured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
    });
  } catch {
    /* unsupported (Expo Go) */
  }
  if (Platform.OS === 'android') {
    for (const c of CHANNELS) {
      Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        importance: c.importance,
        lightColor: '#0F766E',
        vibrationPattern: c.importance === Notifications.AndroidImportance.LOW ? undefined : [0, 200, 100, 200],
      }).catch(() => undefined);
    }
  }
}

export async function setBadge(n: number) {
  try {
    await Notifications.setBadgeCountAsync(n);
  } catch {
    /* ignore */
  }
}

async function sendToken() {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  try {
    // The API sends through firebase-admin directly, which only accepts native FCM tokens (not ExponentPushToken[...]).
    const t = await Notifications.getDevicePushTokenAsync();
    const token = typeof t.data === 'string' ? t.data : String(t.data);
    await api.users.registerPushToken(token, platform);
  } catch {
    /* no FCM config in this build */
  }
}

/** After login: registers the token only if permission was already granted. Never prompts. */
export async function registerPushIfGranted() {
  if (isExpoGo && Platform.OS === 'android') return;
  configureNotifications();
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) await sendToken();
  } catch {
    /* ignore */
  }
}

/** Contextual prompt: call after the first chat or after provider onboarding. */
export async function askPushPermission(): Promise<boolean> {
  if (isExpoGo && Platform.OS === 'android') return false;
  configureNotifications();
  try {
    let p = await Notifications.getPermissionsAsync();
    if (!p.granted && p.canAskAgain) p = await Notifications.requestPermissionsAsync();
    if (p.granted) await sendToken();
    return p.granted;
  } catch {
    return false;
  }
}
