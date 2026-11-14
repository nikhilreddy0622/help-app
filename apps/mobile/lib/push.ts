import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { NotificationCategory } from '@help/types';
import { api } from './api';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const CHANNELS: { id: string; name: string; importance: Notifications.AndroidImportance; cats: NotificationCategory[] }[] = [
  { id: 'status', name: 'Status and reviews', importance: Notifications.AndroidImportance.HIGH, cats: ['STATUS', 'REVIEWS'] },
  { id: 'messages', name: 'Messages', importance: Notifications.AndroidImportance.HIGH, cats: ['MESSAGES'] },
  { id: 'payments', name: 'Payments', importance: Notifications.AndroidImportance.HIGH, cats: ['PAYMENTS', 'ACCOUNT'] },
  { id: 'promotions', name: 'Offers and updates', importance: Notifications.AndroidImportance.LOW, cats: ['PROMOTIONS'] },
];
export const channelFor = (c: NotificationCategory) => CHANNELS.find((x) => x.cats.includes(c))?.id ?? 'messages';

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
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const t = projectId ? await Notifications.getExpoPushTokenAsync({ projectId }) : await Notifications.getDevicePushTokenAsync();
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
