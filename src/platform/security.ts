import NativeFedd from './specs/NativeFedd';
export type AuthMode = 'none' | 'pin' | 'device';
export type LocalSecurityStatus = {
  hasData: boolean;
  authMode: AuthMode;
  locked: boolean;
  deviceAuthAvailable: boolean;
  backupFolder: { uri: string; name: string } | null;
  isSensitiveOperationActive: boolean;
  retryAfterMs: number;
};
export const localSecurity = {
  async status(): Promise<LocalSecurityStatus> {
    return JSON.parse(await NativeFedd.getLocalSecurityStatus());
  },
  read: () => NativeFedd.readSecureData(),
  write: (value: string) => NativeFedd.writeSecureData(value),
  configure: (mode: AuthMode, pin = '', currentPin = '') =>
    NativeFedd.configureLocalAuth(mode, pin, currentPin),
  unlockPin: (pin: string) => NativeFedd.unlockWithPin(pin),
  unlockDevice: () => NativeFedd.unlockWithDevice(),
  lock: () => NativeFedd.lockLocalData(),
  async chooseFolder() {
    return JSON.parse(await NativeFedd.chooseBackupFolder()) as {
      uri: string;
      name: string;
    };
  },
  backup: (password: string) => NativeFedd.writeEncryptedBackup(password),
  readBackup: (password: string) => NativeFedd.readEncryptedBackup(password),
};
export function wasCancelled(error: unknown) {
  return (error as { code?: string })?.code === 'CANCELLED';
}
