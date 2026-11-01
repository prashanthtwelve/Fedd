import React from 'react';
import { AppState } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import App from '../App';
import { PRESETS } from '../src/domain/interests';
import { initialData, type AppData } from '../src/domain/model';
import {
  localSecurity,
  type LocalSecurityStatus,
} from '../src/platform/security';
import { storage } from '../src/services/storage';
import { nudges } from '../src/services/session';
import { StoreProvider, useStore } from '../src/state/Store';

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn().mockResolvedValue(null),
  },
  StatusBar: () => null,
}));
jest.mock('../src/platform/security', () => ({
  localSecurity: {
    status: jest.fn(),
    lock: jest.fn(),
    unlockPin: jest.fn(),
    unlockDevice: jest.fn(),
  },
}));
jest.mock('../src/services/storage', () => ({
  storage: { load: jest.fn(), save: jest.fn(), flush: jest.fn() },
}));
jest.mock('../src/services/session', () => ({
  nudges: { finish: jest.fn(), schedule: jest.fn() },
}));

// Exercise the real App gate and Store while keeping native navigation/views
// outside this JVM-free regression suite. A locked route must never mount them.
jest.mock('@react-navigation/native', () => {
  const ReactRuntime = jest.requireActual<typeof import('react')>('react');
  const { TabHiddenContext } = jest.requireActual<
    typeof import('../src/navigation/TabVisibility')
  >('../src/navigation/TabVisibility');
  const { useStore: useActualStore } =
    jest.requireActual<typeof import('../src/state/Store')>(
      '../src/state/Store',
    );
  function NavigationContainer({
    children,
    onReady,
    onStateChange,
  }: {
    children: React.ReactNode;
    onReady?: () => void;
    onStateChange?: () => void;
  }) {
    mockNavigationCallbacks = { onReady, onStateChange };
    mockTabHidden = ReactRuntime.useContext(TabHiddenContext);
    mockCaptureStore(useActualStore());
    return children;
  }
  return {
    NavigationContainer,
    createNavigationContainerRef: () => ({
      isReady: () => mockNavigationReady,
      getCurrentRoute: () => ({ name: mockRoute }),
      navigate: (name: string) => mockNavigate(name),
    }),
  };
});
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Group: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ name }: { name: string }) =>
      name === 'Landing' ? 'First-use landing' : null,
  }),
}));
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../src/navigation/FloatingBar', () => ({ FloatingBar: () => null }));
jest.mock('../src/components/ui', () => ({
  Button: () => null,
  Label: ({ children }: { children: React.ReactNode }) => children,
  Screen: ({ children }: { children: React.ReactNode }) => children,
  Title: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../src/screens/LocalProfile', () => {
  const { useStore: useActualStore } =
    jest.requireActual<typeof import('../src/state/Store')>(
      '../src/state/Store',
    );
  function UnlockScreen() {
    mockCaptureStore(useActualStore());
    return 'Profile locked';
  }
  return { LocalProfileScreen: () => null, UnlockScreen };
});
jest.mock('../src/screens/Onboarding', () => ({
  PickerScreen: () => null,
  SessionLengthScreen: () => null,
}));
jest.mock('../src/screens/Activities', () => ({
  ActivitiesScreen: () => null,
  ActivityScreen: () => null,
}));
jest.mock('../src/screens/Session', () => ({
  IntentScreen: () => null,
  HandoffScreen: () => null,
  CheckinScreen: () => null,
}));
jest.mock('../src/screens/Landing', () => ({ LandingScreen: () => null }));
jest.mock('../src/screens/Home', () => ({ HomeScreen: () => null }));
jest.mock('../src/screens/Insights', () => ({ InsightsScreen: () => null }));
jest.mock('../src/screens/Settings', () => ({ SettingsScreen: () => null }));
jest.mock('../src/screens/Ideas', () => ({ IdeasScreen: () => null }));
jest.mock('../src/screens/Privacy', () => ({ PrivacyScreen: () => null }));

const personal: AppData = {
  ...initialData,
  profile: { name: 'TestUser' },
  onboarded: true,
  savedInterests: PRESETS.slice(0, 3),
  selectedInterestIds: [PRESETS[0].id],
  sessions: [
    {
      id: 'session-1',
      interests: [PRESETS[0]],
      goal: 'Notice lighting',
      durationMinutes: 5,
      startedAt: 1000,
      endTimestamp: 301000,
      nudgeStyle: 'firm',
    },
  ],
  activeSessionId: 'session-1',
};
const unlockedStatus: LocalSecurityStatus = {
  hasData: true,
  authMode: 'pin',
  locked: false,
  deviceAuthAvailable: true,
  backupFolder: null,
  isSensitiveOperationActive: false,
  retryAfterMs: 0,
};
let status: LocalSecurityStatus;
let latest!: ReturnType<typeof useStore>;
let renderer: ReactTestRenderer | undefined;
let mockNavigationReady = false;
let mockRoute = 'Home';
let mockTabHidden: boolean | undefined;
let mockNavigationCallbacks: {
  onReady?: () => void;
  onStateChange?: () => void;
} = {};
const mockNavigate = jest.fn((name: string) => {
  mockRoute = name;
  mockNavigationCallbacks.onStateChange?.();
});
function mockCaptureStore(value: ReturnType<typeof useStore>) {
  latest = value;
}

function Capture() {
  latest = useStore();
  return null;
}
async function mountStore() {
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Capture />
      </StoreProvider>,
    );
  });
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigationReady = false;
  mockRoute = 'Home';
  mockTabHidden = undefined;
  mockNavigationCallbacks = {};
  status = { ...unlockedStatus };
  jest
    .mocked(localSecurity.status)
    .mockImplementation(async () => ({ ...status }));
  jest.mocked(localSecurity.lock).mockImplementation(async () => {
    if (!status.isSensitiveOperationActive)
      status = { ...status, locked: true };
  });
  jest.mocked(localSecurity.unlockPin).mockImplementation(async () => {
    status = { ...status, locked: false };
  });
  jest.mocked(localSecurity.unlockDevice).mockImplementation(async () => {
    status = { ...status, locked: false };
  });
  jest.mocked(storage.load).mockResolvedValue(personal);
  jest.mocked(storage.save).mockResolvedValue(undefined);
  jest.mocked(storage.flush).mockResolvedValue(undefined);
  jest.mocked(nudges.finish).mockResolvedValue(undefined);
  jest.mocked(nudges.schedule).mockResolvedValue('exact');
});
afterEach(async () => {
  if (renderer)
    await act(async () => {
      renderer?.unmount();
    });
  renderer = undefined;
});

test('protected startup never reads private data before authentication', async () => {
  status = { ...status, locked: true };
  await mountStore();
  expect(latest.loading).toBe(false);
  expect(latest.security?.locked).toBe(true);
  expect(latest.data).toEqual(initialData);
  expect(storage.load).not.toHaveBeenCalled();
  expect(storage.save).not.toHaveBeenCalled();
});

test('actual locked App gate displays unlock and preserves pending session reminders', async () => {
  status = { ...status, locked: true };
  await act(async () => {
    renderer = create(<App />);
  });
  expect(renderer!.toJSON()).toBe('Profile locked');
  expect(storage.load).not.toHaveBeenCalled();
  expect(nudges.finish).not.toHaveBeenCalled();
  expect(nudges.schedule).not.toHaveBeenCalled();
});

test('unlocking after Privacy remounts Home with the floating navigation visible', async () => {
  // No active session means returning Home must not recover to Check-in.
  jest.mocked(storage.load).mockResolvedValue({
    ...personal,
    sessions: [],
    activeSessionId: null,
  });
  await act(async () => {
    renderer = create(<App />);
  });
  await act(async () => {
    mockNavigationReady = true;
    mockNavigationCallbacks.onReady?.();
  });
  expect(mockTabHidden).toBe(false);
  await act(async () => {
    mockRoute = 'Privacy';
    mockNavigationCallbacks.onStateChange?.();
  });
  expect(mockTabHidden).toBe(true);
  const finishedBeforeLock = jest.mocked(nudges.finish).mock.calls.length;
  await act(async () => {
    await latest.lock();
  });
  expect(renderer!.toJSON()).toBe('Profile locked');
  expect(nudges.finish).toHaveBeenCalledTimes(finishedBeforeLock);
  await act(async () => {
    mockNavigationReady = false;
    mockRoute = 'Home';
    await latest.unlock('123456');
  });
  // React Navigation emits onReady when the new container finishes mounting.
  await act(async () => {
    mockNavigationReady = true;
    mockNavigationCallbacks.onReady?.();
  });
  expect(mockTabHidden).toBe(false);
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(storage.load).toHaveBeenCalledTimes(2);
});

test('navigation remount still recovers an expired session to Check-in after unlocking', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
  try {
    jest.mocked(storage.load).mockResolvedValue({
      ...personal,
      sessions: [
        {
          ...personal.sessions[0],
          startedAt: 1_000_000,
          endTimestamp: 1_300_000,
        },
      ],
    });
    await act(async () => {
      renderer = create(<App />);
    });
    await act(async () => {
      mockNavigationReady = true;
      mockNavigationCallbacks.onReady?.();
      mockRoute = 'Privacy';
      mockNavigationCallbacks.onStateChange?.();
    });
    expect(mockTabHidden).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
    await act(async () => {
      await latest.lock();
    });
    expect(nudges.finish).not.toHaveBeenCalled();
    clock.mockReturnValue(1_300_001);
    await act(async () => {
      mockNavigationReady = false;
      mockRoute = 'Home';
      await latest.unlock('123456');
    });
    await act(async () => {
      mockNavigationReady = true;
      mockNavigationCallbacks.onReady?.();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Checkin');
    expect(mockRoute).toBe('Checkin');
    expect(mockTabHidden).toBe(true);
    expect(nudges.finish).not.toHaveBeenCalled();
  } finally {
    clock.mockRestore();
  }
});

test('unlock waits for successful native PIN authentication before loading data', async () => {
  status = { ...status, locked: true };
  await mountStore();
  const authentication = deferred();
  jest.mocked(localSecurity.unlockPin).mockImplementationOnce(async () => {
    await authentication.promise;
    status = { ...status, locked: false };
  });
  let unlocking!: Promise<void>;
  await act(async () => {
    unlocking = latest.unlock('123456');
  });
  expect(localSecurity.unlockPin).toHaveBeenCalledWith('123456');
  expect(storage.load).not.toHaveBeenCalled();
  expect(latest.data.profile).toBeNull();
  await act(async () => {
    authentication.resolve();
    await unlocking;
  });
  expect(storage.load).toHaveBeenCalledTimes(1);
  expect(latest.data).toEqual(personal);
});

test('failed authentication never loads or changes the protected profile', async () => {
  status = { ...status, locked: true };
  await mountStore();
  jest
    .mocked(localSecurity.unlockPin)
    .mockRejectedValueOnce(new Error('PIN did not match'));
  await act(async () => {
    await expect(latest.unlock('000000')).rejects.toThrow('PIN did not match');
  });
  expect(latest.security?.locked).toBe(true);
  expect(latest.data).toEqual(initialData);
  expect(storage.load).not.toHaveBeenCalled();
});

test('leaving the app clears private data in memory without erasing its saved data or reminders', async () => {
  await mountStore();
  expect(latest.data).toEqual(personal);
  const onChange = jest.mocked(AppState.addEventListener).mock.calls[0][1];
  await act(async () => {
    onChange('background');
    await latest.flush();
  });
  expect(localSecurity.lock).toHaveBeenCalledTimes(1);
  expect(latest.security?.locked).toBe(true);
  expect(latest.data).toEqual(initialData);
  expect(storage.save).not.toHaveBeenCalled();
  expect(nudges.finish).not.toHaveBeenCalled();
});

test('an owned Android picker does not spuriously clear the authenticated profile', async () => {
  await mountStore();
  status = { ...status, isSensitiveOperationActive: true };
  await act(async () => {
    await latest.lock();
  });
  expect(latest.security?.locked).toBe(false);
  expect(latest.data).toEqual(personal);
  expect(storage.load).toHaveBeenCalledTimes(1);
});

test('backup flush waits for all upstream Store changes, including an update not yet passed to storage', async () => {
  await mountStore();
  const firstWrite = deferred();
  const firstStarted = deferred();
  jest.mocked(storage.save).mockImplementationOnce(async () => {
    firstStarted.resolve();
    await firstWrite.promise;
  });
  let first!: Promise<void>;
  let second!: Promise<void>;
  let flushed!: Promise<void>;
  let flushFinished = false;
  await act(async () => {
    first = latest.update(data => ({ ...data, nudge: 'silent' }));
    second = latest.update(data => ({ ...data, defaultMinutes: 15 }));
    flushed = latest.flush().then(() => {
      flushFinished = true;
    });
    await firstStarted.promise;
  });
  expect(storage.save).toHaveBeenCalledTimes(1);
  expect(storage.flush).not.toHaveBeenCalled();
  expect(flushFinished).toBe(false);
  await act(async () => {
    firstWrite.resolve();
    await Promise.all([first, second, flushed]);
  });
  expect(storage.save).toHaveBeenCalledTimes(2);
  expect(jest.mocked(storage.save).mock.calls[1][0]).toMatchObject({
    nudge: 'silent',
    defaultMinutes: 15,
  });
  expect(storage.flush).toHaveBeenCalledTimes(1);
  expect(jest.mocked(storage.save).mock.invocationCallOrder[1]).toBeLessThan(
    jest.mocked(storage.flush).mock.invocationCallOrder[0],
  );
  expect(flushFinished).toBe(true);
  expect(latest.data).toMatchObject({ nudge: 'silent', defaultMinutes: 15 });
});

test('a failed write is not published and a later change starts from the last committed data', async () => {
  await mountStore();
  jest.mocked(storage.save).mockRejectedValueOnce(new Error('Disk full'));
  await act(async () => {
    await expect(
      latest.update(data => ({ ...data, nudge: 'silent' })),
    ).rejects.toThrow('Disk full');
  });
  expect(latest.data).toEqual(personal);
  await act(async () => {
    await latest.update(data => ({ ...data, defaultMinutes: 15 }));
  });
  expect(latest.data).toMatchObject({ nudge: 'gentle', defaultMinutes: 15 });
});

test('invalid or failed restore never replaces existing data or cancels its session reminder', async () => {
  await mountStore();
  await act(async () => {
    await expect(
      latest.replace({ ...personal, selectedInterestIds: ['missing'] }),
    ).rejects.toThrow();
  });
  expect(storage.save).not.toHaveBeenCalled();
  expect(nudges.finish).not.toHaveBeenCalled();
  jest.mocked(storage.save).mockRejectedValueOnce(new Error('Disk full'));
  await act(async () => {
    await expect(
      latest.replace({ ...personal, profile: { name: 'Restored' } }),
    ).rejects.toThrow('Disk full');
  });
  expect(latest.data).toEqual(personal);
  expect(nudges.finish).not.toHaveBeenCalled();
});

test('successful restore saves first, then cancels the old session and publishes restored data', async () => {
  await mountStore();
  const restored = {
    ...personal,
    profile: { name: 'Restored' },
    nudge: 'silent' as const,
  };
  await act(async () => {
    await latest.replace(restored);
  });
  expect(latest.data).toEqual(restored);
  expect(storage.save).toHaveBeenCalledWith(restored);
  expect(nudges.finish).toHaveBeenCalledTimes(1);
  expect(jest.mocked(storage.save).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(nudges.finish).mock.invocationCallOrder[0],
  );
});

test('fresh install shows landing and only advances after the marker is saved', async () => {
  status = { ...unlockedStatus, hasData: false, authMode: 'none' };
  jest.mocked(storage.load).mockResolvedValue({ ...initialData });
  await act(async () => {
    renderer = create(<App />);
  });
  expect(renderer!.toJSON()).toContain('First-use landing');
  jest.mocked(storage.save).mockRejectedValueOnce(new Error('Disk full'));
  await act(async () => {
    await expect(
      latest.update(data => ({ ...data, landingSeen: true })),
    ).rejects.toThrow('Disk full');
  });
  expect(renderer!.toJSON()).toContain('First-use landing');
  await act(async () => {
    await latest.update(data => ({ ...data, landingSeen: true }));
  });
  expect(storage.save).toHaveBeenLastCalledWith({
    ...initialData,
    landingSeen: true,
  });
  expect(JSON.stringify(renderer!.toJSON())).not.toContain('First-use landing');
  jest
    .mocked(storage.load)
    .mockResolvedValue({ ...initialData, landingSeen: true });
  await act(async () => {
    await latest.reload();
  });
  expect(JSON.stringify(renderer!.toJSON())).not.toContain('First-use landing');
});

test('existing profiles bypass the landing even without its marker', async () => {
  await act(async () => {
    renderer = create(<App />);
  });
  expect(JSON.stringify(renderer!.toJSON())).not.toContain('First-use landing');
  expect(latest.data).toEqual(personal);
});
