import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { initialData, type AppData } from '../domain/model';
import { parseAppData } from '../domain/data';
import { storage } from '../services/storage';
import { localSecurity, type LocalSecurityStatus } from '../platform/security';
import { nudges } from '../services/session';
type Store = {
  data: AppData;
  loading: boolean;
  error: string | null;
  security: LocalSecurityStatus | null;
  reload: () => Promise<void>;
  refreshSecurity: () => Promise<void>;
  lock: () => Promise<void>;
  unlock: (pin?: string) => Promise<void>;
  update: (change: (data: AppData) => AppData) => Promise<void>;
  replace: (data: AppData) => Promise<void>;
  flush: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [security, setSecurity] = useState<LocalSecurityStatus | null>(null);
  const current = useRef(initialData);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((work: () => Promise<void>) => {
    const task = queue.current.catch(() => undefined).then(work);
    queue.current = task;
    return task;
  }, []);
  const refreshSecurity = useCallback(async () => {
    const status = await localSecurity.status();
    setSecurity(status);
    if (status.locked) {
      current.current = initialData;
      setData(initialData);
    }
  }, []);
  const reload = useCallback(
    () =>
      enqueue(async () => {
        setLoading(true);
        try {
          const status = await localSecurity.status();
          setSecurity(status);
          const loaded = status.locked ? initialData : await storage.load();
          current.current = loaded;
          setData(loaded);
          setError(null);
        } catch (e) {
          setError(String(e));
        } finally {
          setLoading(false);
        }
      }),
    [enqueue],
  );
  const lock = useCallback(
    () =>
      enqueue(async () => {
        await localSecurity.lock();
        await refreshSecurity();
      }),
    [enqueue, refreshSecurity],
  );
  const unlock = useCallback(
    async (pin?: string) => {
      if (pin !== undefined) await localSecurity.unlockPin(pin);
      else await localSecurity.unlockDevice();
      await reload();
    },
    [reload],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') refreshSecurity().catch(e => setError(String(e)));
      else lock().catch(() => undefined);
    });
    return () => listener.remove();
  }, [refreshSecurity, lock]);
  const update = useCallback(
    (change: (value: AppData) => AppData) =>
      enqueue(async () => {
        const next = parseAppData(JSON.stringify(change(current.current)));
        await storage.save(next);
        current.current = next;
        setData(next);
      }),
    [enqueue],
  );
  const replace = useCallback(
    (next: AppData) =>
      enqueue(async () => {
        const checked = parseAppData(JSON.stringify(next));
        await storage.save(checked);
        // Cancel the old session only after the replacement is safely saved.
        await nudges.finish().catch(() => undefined);
        current.current = checked;
        setData(checked);
        await refreshSecurity();
      }),
    [enqueue, refreshSecurity],
  );
  const flush = useCallback(() => enqueue(() => storage.flush()), [enqueue]);
  return (
    <Context.Provider
      value={{
        data,
        loading,
        error,
        security,
        reload,
        refreshSecurity,
        lock,
        unlock,
        update,
        replace,
        flush,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider is required');
  return store;
}
