import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRESETS } from '../src/domain/interests';
import { initialData, type AppData } from '../src/domain/model';
import { localSecurity } from '../src/platform/security';
import { createStorage, storage } from '../src/services/storage';

// The Android vault boundary returns decrypted data to the authenticated app.
// These tests keep that payload only in memory; no plaintext vault file is used.
jest.mock('../src/platform/security', () => ({
  localSecurity: {
    read: jest.fn().mockResolvedValue(null),
    write: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const LEGACY_KEY = 'fedd:data:v1';
const tea = {
  id: 'custom-1',
  name: 'Tea',
  icon: 'sparkles',
  isCustom: true,
};
const current: AppData = {
  ...initialData,
  profile: { name: 'Demo' },
  onboarded: true,
  savedInterests: [...PRESETS.slice(0, 3), tea],
  selectedInterestIds: [tea.id],
  nudge: 'silent',
  sessions: [
    {
      id: 'session-old',
      interests: [PRESETS[0], tea],
      goal: 'Notice framing',
      durationMinutes: 10,
      startedAt: 1000,
      endTimestamp: 601000,
      nudgeStyle: 'firm',
    },
  ],
  activeSessionId: 'session-old',
  ideas: [
    {
      id: 'idea-1',
      text: 'Try side light',
      interests: [tea],
      createdAt: 1000,
    },
  ],
  activityHistory: [
    {
      id: 'activity-1',
      activityId: 2,
      completedAt: 700000,
      text: 'Be curious',
    },
  ],
};
const legacy = {
  ...current,
  profile: { email: 'demo@example.com' },
  nudge: 'Firm',
  sessions: current.sessions.map(session => ({
    ...session,
    nudgeStyle: undefined,
  })),
  activityHistory: undefined,
  interestLinks: undefined,
};

function fixture(
  options: { secured?: string | null; old?: string | null } = {},
) {
  let decryptedPayload = options.secured ?? null;
  let legacyPayload = options.old ?? null;
  const vault = {
    read: jest.fn(async () => decryptedPayload),
    write: jest.fn(async (raw: string) => {
      decryptedPayload = raw;
    }),
  };
  const oldStore = {
    getItem: jest.fn(async (_key: string) => legacyPayload),
    removeItem: jest.fn(async (_key: string) => {
      legacyPayload = null;
    }),
  };
  return { vault, oldStore, store: createStorage(vault, oldStore) };
}

beforeEach(() => jest.clearAllMocks());

test('production storage uses the native vault boundary and fresh defaults', async () => {
  expect(await storage.load()).toEqual(initialData);
  expect(localSecurity.read).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(LEGACY_KEY);
  expect(localSecurity.write).not.toHaveBeenCalled();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
});

test.each(['gentle', 'firm', 'silent'] as const)(
  'saved %s nudge style persists through the encrypted vault adapter',
  async nudge => {
    const { store, vault, oldStore } = fixture();
    await store.save({ ...initialData, nudge });
    expect((await store.load()).nudge).toBe(nudge);
    expect(vault.write).toHaveBeenCalledTimes(1);
    expect(oldStore.getItem).not.toHaveBeenCalled();
  },
);

test('complete v1 data migrates only after a verified encrypted roundtrip', async () => {
  const { store, vault, oldStore } = fixture({ old: JSON.stringify(legacy) });
  const restored = await store.load();
  expect(restored).toEqual({
    ...current,
    profile: { name: 'demo', email: 'demo@example.com' },
    nudge: 'firm',
    activityHistory: [],
  });
  expect(restored.savedInterests).toEqual(current.savedInterests);
  expect(restored.ideas).toEqual(current.ideas);
  expect(restored.activeSessionId).toBe('session-old');
  expect(restored.sessions[0]).toEqual(current.sessions[0]);
  expect(vault.write).toHaveBeenCalledWith(JSON.stringify(restored));
  expect(vault.read).toHaveBeenCalledTimes(2);
  expect(oldStore.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
  expect(vault.read.mock.invocationCallOrder[1]).toBeLessThan(
    oldStore.removeItem.mock.invocationCallOrder[0],
  );
  expect(await oldStore.getItem(LEGACY_KEY)).toBeNull();
});

test('an interrupted migration cleans up its legacy remnant after reading valid secured data', async () => {
  const { store, vault, oldStore } = fixture({
    secured: JSON.stringify(current),
    old: JSON.stringify(legacy),
  });
  expect(await store.load()).toEqual(current);
  expect(oldStore.getItem).not.toHaveBeenCalled();
  expect(vault.write).not.toHaveBeenCalled();
  expect(oldStore.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
});

test('a failed encrypted migration write leaves the entire legacy copy intact', async () => {
  const raw = JSON.stringify(legacy);
  const { store, vault, oldStore } = fixture({ old: raw });
  vault.write.mockRejectedValueOnce(new Error('Keystore unavailable'));
  await expect(store.load()).rejects.toThrow('Keystore unavailable');
  expect(oldStore.removeItem).not.toHaveBeenCalled();
  expect(await oldStore.getItem(LEGACY_KEY)).toBe(raw);
});

test('a migration roundtrip mismatch never deletes the legacy copy', async () => {
  const raw = JSON.stringify(legacy);
  const { store, vault, oldStore } = fixture({ old: raw });
  vault.read
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(JSON.stringify(initialData));
  await expect(store.load()).rejects.toThrow('has not been migrated');
  expect(oldStore.removeItem).not.toHaveBeenCalled();
  expect(await oldStore.getItem(LEGACY_KEY)).toBe(raw);
});

test('a corrupted secured vault never falls back to an older legacy copy', async () => {
  const { store, vault, oldStore } = fixture({
    secured: '{corrupt',
    old: JSON.stringify(legacy),
  });
  await expect(store.load()).rejects.toThrow();
  expect(vault.write).not.toHaveBeenCalled();
  expect(oldStore.getItem).not.toHaveBeenCalled();
  expect(oldStore.removeItem).not.toHaveBeenCalled();
});

test('an unreadable secured vault propagates its error without overwriting or reverting data', async () => {
  const { store, vault, oldStore } = fixture({ old: JSON.stringify(legacy) });
  vault.read.mockRejectedValueOnce(new Error('Authentication required'));
  await expect(store.load()).rejects.toThrow('Authentication required');
  expect(vault.write).not.toHaveBeenCalled();
  expect(oldStore.getItem).not.toHaveBeenCalled();
  expect(oldStore.removeItem).not.toHaveBeenCalled();
});

test.each([
  { label: 'malformed JSON', raw: '{corrupt' },
  {
    label: 'unsupported version',
    raw: JSON.stringify({ ...initialData, version: 2 }),
  },
  {
    label: 'dangling active session',
    raw: JSON.stringify({ ...current, activeSessionId: 'missing' }),
  },
])(
  'corrupt legacy data is rejected without overwriting its only copy ($label)',
  async ({ raw }) => {
    const { store, vault, oldStore } = fixture({ old: raw });
    await expect(store.load()).rejects.toThrow();
    expect(vault.write).not.toHaveBeenCalled();
    expect(oldStore.removeItem).not.toHaveBeenCalled();
    expect(await oldStore.getItem(LEGACY_KEY)).toBe(raw);
  },
);

test('an active session retains its captured style after the default changes', async () => {
  const { store } = fixture({ secured: JSON.stringify(current) });
  const restored = await store.load();
  expect(restored.nudge).toBe('silent');
  expect(restored.sessions[0].nudgeStyle).toBe('firm');
});

test('save rejects malformed replacement data before calling the native writer', async () => {
  const { store, vault } = fixture();
  await expect(
    store.save({ ...current, selectedInterestIds: ['custom-missing'] }),
  ).rejects.toThrow();
  expect(vault.write).not.toHaveBeenCalled();
});

test('queued saves serialize native writes and load waits for the latest pending save', async () => {
  const { store, vault } = fixture();
  let releaseFirst!: () => void;
  let firstStarted!: () => void;
  const blocked = new Promise<void>(resolve => {
    releaseFirst = resolve;
  });
  const started = new Promise<void>(resolve => {
    firstStarted = resolve;
  });
  const ordinaryWrite = vault.write.getMockImplementation()!;
  vault.write.mockImplementationOnce(async raw => {
    firstStarted();
    await blocked;
    await ordinaryWrite(raw);
  });
  const first = store.save({ ...initialData, nudge: 'firm' });
  const second = store.save({ ...initialData, nudge: 'silent' });
  const loaded = store.load();
  await started;
  expect(vault.write).toHaveBeenCalledTimes(1);
  expect(vault.read).not.toHaveBeenCalled();
  releaseFirst();
  await Promise.all([first, second]);
  expect((await loaded).nudge).toBe('silent');
  expect(vault.write).toHaveBeenCalledTimes(2);
  expect(JSON.parse(vault.write.mock.calls[0][0]).nudge).toBe('firm');
  expect(JSON.parse(vault.write.mock.calls[1][0]).nudge).toBe('silent');
  await expect(store.flush()).resolves.toBeUndefined();
});

test('a rejected save is reported and does not poison later queued saves', async () => {
  const { store, vault } = fixture();
  vault.write.mockRejectedValueOnce(new Error('Disk write failed'));
  await expect(store.save({ ...initialData, nudge: 'firm' })).rejects.toThrow(
    'Disk write failed',
  );
  await expect(store.flush()).rejects.toThrow('Disk write failed');
  await store.save({ ...initialData, nudge: 'silent' });
  await expect(store.flush()).resolves.toBeUndefined();
  expect((await store.load()).nudge).toBe('silent');
  expect(vault.write).toHaveBeenCalledTimes(2);
});

test('a save requested during the first migration waits for its verified roundtrip', async () => {
  const { store, vault, oldStore } = fixture({ old: JSON.stringify(legacy) });
  let releaseMigration!: () => void;
  let migrationStarted!: () => void;
  const blocked = new Promise<void>(resolve => {
    releaseMigration = resolve;
  });
  const started = new Promise<void>(resolve => {
    migrationStarted = resolve;
  });
  const ordinaryWrite = vault.write.getMockImplementation()!;
  vault.write.mockImplementationOnce(async raw => {
    migrationStarted();
    await blocked;
    await ordinaryWrite(raw);
  });

  const migrating = store.load();
  await started;
  const edited: AppData = {
    ...current,
    profile: { name: 'My local name', email: 'demo@example.com' },
    nudge: 'gentle',
    activityHistory: [],
  };
  const saved = store.save(edited);
  // Let the newly queued work get a chance to run. It must not replace the
  // migration payload before verification has completed.
  await Promise.resolve();
  await Promise.resolve();
  expect(vault.write).toHaveBeenCalledTimes(1);
  expect(vault.read).toHaveBeenCalledTimes(1);
  expect(oldStore.removeItem).not.toHaveBeenCalled();

  releaseMigration();
  expect((await migrating).profile?.name).toBe('demo');
  await saved;
  expect(vault.read.mock.invocationCallOrder[1]).toBeLessThan(
    vault.write.mock.invocationCallOrder[1],
  );
  expect(oldStore.removeItem.mock.invocationCallOrder[0]).toBeLessThan(
    vault.write.mock.invocationCallOrder[1],
  );
  expect(await store.load()).toEqual(edited);
});

test('flush requested while a save is in progress observes that write failing', async () => {
  const { store, vault } = fixture();
  let rejectWrite!: (error: Error) => void;
  let writeStarted!: () => void;
  const blocked = new Promise<void>((_resolve, reject) => {
    rejectWrite = reject;
  });
  const started = new Promise<void>(resolve => {
    writeStarted = resolve;
  });
  vault.write.mockImplementationOnce(async () => {
    writeStarted();
    await blocked;
  });
  const pendingSave = store.save({ ...initialData, nudge: 'firm' });
  const flushing = store.flush();
  const saveError = pendingSave.catch(error => error);
  const flushError = flushing.catch(error => error);
  await started;
  const failure = new Error('Write failed');
  rejectWrite(failure);
  expect(await saveError).toBe(failure);
  expect(await flushError).toBe(failure);
});
