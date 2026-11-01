import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
export interface Spec extends TurboModule {
  scheduleReminder(payload: string): Promise<string>;
  cancelReminder(): Promise<void>;
  cancelFollowUp(id: string, endTimestamp: number): Promise<void>;
  notificationsEnabled(channelId: string): Promise<boolean>;
  openNotificationSettings(): Promise<void>;
  openInstagramUrl(url: string): Promise<boolean>;
  openInstagramHome(): Promise<boolean>;
  openAlarmSettings(): Promise<void>;
  getLocalSecurityStatus(): Promise<string>;
  readSecureData(): Promise<string | null>;
  writeSecureData(data: string): Promise<void>;
  configureLocalAuth(mode: string, pin: string, currentPin: string): Promise<void>;
  unlockWithPin(pin: string): Promise<void>;
  unlockWithDevice(): Promise<void>;
  lockLocalData(): Promise<void>;
  chooseBackupFolder(): Promise<string>;
  writeEncryptedBackup(password: string): Promise<string>;
  readEncryptedBackup(password: string): Promise<string>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('FeddPlatform');
