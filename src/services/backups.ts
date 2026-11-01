import { parseAppData } from '../domain/data';
import { localSecurity } from '../platform/security';
import { validateBackupPassword } from './auth';
import { storage } from './storage';
import { copy } from '../copy';
type BackupTransport = {
  readBackup: (password: string) => Promise<string>;
  backup: (password: string) => Promise<string>;
};
export function createBackupService(
  transport: BackupTransport,
  flush: () => Promise<void>,
) {
  function validate(password: string) {
    const error = validateBackupPassword(password);
    if (error) throw new Error(error);
  }
  return {
    async create(password: string, confirmation: string) {
      validate(password);
      if (password !== confirmation) throw new Error(copy.privacy.mismatch);
      await flush();
      return transport.backup(password);
    },
    async prepareRestore(password: string) {
      validate(password);
      // Decrypt, validate and preview only. Applying data needs a separate user action.
      return parseAppData(await transport.readBackup(password));
    },
  };
}
export const backups = createBackupService(localSecurity, storage.flush);
