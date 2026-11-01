import { Linking, PermissionsAndroid, Platform } from 'react-native';
import NativeFedd from './specs/NativeFedd';
import type { NudgePayload } from '../services/nudges';
import { copy } from '../copy';
export async function requestReminders() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return true;
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    {
      title: copy.notification.permissionTitle,
      message: copy.notification.permissionBody,
      buttonPositive: copy.notification.allow,
      buttonNegative: copy.notification.later,
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}
export const scheduleNudge = (payload: NudgePayload) =>
  NativeFedd.scheduleReminder(JSON.stringify(payload));
export const cancelReminder = () => NativeFedd.cancelReminder();
export const cancelFollowUp = (id: string, endTimestamp: number) =>
  NativeFedd.cancelFollowUp(id, endTimestamp);
export const notificationsEnabled = (channelId: string) =>
  NativeFedd.notificationsEnabled(channelId);
export const openAlarmSettings = () => NativeFedd.openAlarmSettings();
export const openNotificationSettings = () =>
  NativeFedd.openNotificationSettings();
export const instagramTransport = {
  openTag: (url: string) => NativeFedd.openInstagramUrl(url),
  openApp: () => NativeFedd.openInstagramHome(),
  openBrowser: async (url: string) => {
    await Linking.openURL(url);
    return true;
  },
};
