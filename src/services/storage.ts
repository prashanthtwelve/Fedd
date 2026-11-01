import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialData, type AppData } from '../domain/model';
import { parseAppData } from '../domain/data';
import { localSecurity } from '../platform/security';
const LEGACY_KEY = 'fedd:data:v1';
type Vault = {
  read: () => Promise<string | null>;
  write: (raw: string) => Promise<void>;
};
type Legacy = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
};
export function createStorage(vault: Vault, legacy: Legacy) {
  let queue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const task = queue.catch(() => undefined).then(work);
    queue = task;
    return task;
  }
  return {
    load(): Promise<AppData> {
      return enqueue(async () => {
        const secured = await vault.read();
        if (secured !== null) {
          const data = parseAppData(secured);
          // Retry cleanup after a previously interrupted migration.
          await legacy.removeItem(LEGACY_KEY);
          return data;
        }
        const old = await legacy.getItem(LEGACY_KEY);
        if (old === null) return { ...initialData };
        const migrated = parseAppData(old);
        const normalized = JSON.stringify(migrated);
        await vault.write(normalized);
        // Remove the legacy copy only after a verified encrypted roundtrip.
        const verified = await vault.read();
        if (verified !== normalized)
          throw new Error(
            'Your existing data has not been migrated. Please try again.',
          );
        await legacy.removeItem(LEGACY_KEY);
        return migrated;
      });
    },
    save(data: AppData) {
      return enqueue(async () => {
        const validated = parseAppData(JSON.stringify(data));
        await vault.write(JSON.stringify(validated));
      });
    },
    flush: () => queue.then(() => undefined),
  };
}
export const storage = createStorage(localSecurity, AsyncStorage);
