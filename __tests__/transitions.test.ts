import { initialData, type AppData, type Session } from '../src/domain/model';
import { PRESETS } from '../src/domain/interests';
import {
  applyCheckin,
  recordSession,
  shouldCheckIn,
} from '../src/domain/sessions';
const session: Session = {
  id: 'session-test',
  interests: PRESETS.slice(0, 2),
  goal: 'Find framing ideas',
  durationMinutes: 10,
  startedAt: 1000,
  endTimestamp: 601000,
};
const data: AppData = {
  ...initialData,
  profile: { email: 'demo@example.com' },
  onboarded: true,
};
test('handoff persists one active session and does not duplicate a retry', () => {
  const saved = recordSession(data, session);
  expect(saved.activeSessionId).toBe(session.id);
  expect(recordSession(saved, session)).toBe(saved);
  expect(() => recordSession(saved, { ...session, id: 'another' })).toThrow();
});
test('extension keeps the session identity, saves one idea and starts five minutes now', () => {
  const saved = recordSession(data, session);
  const next = applyCheckin(
    saved,
    session,
    'extend',
    '  Use natural light  ',
    700000,
  );
  expect(next.sessions).toHaveLength(1);
  expect(next.sessions[0].endTimestamp).toBe(1000000);
  expect(next.sessions[0].outcome).toBeUndefined();
  expect(next.ideas[0].text).toBe('Use natural light');
  expect(applyCheckin(next, session, 'extend', 'duplicate', 700001)).toBe(next);
});
test.each(['found', 'distracted'] as const)(
  'completion %s closes the session and is idempotent',
  outcome => {
    const next = applyCheckin(
      recordSession(data, session),
      session,
      outcome,
      'An idea',
      700000,
    );
    expect(next.activeSessionId).toBeNull();
    expect(next.sessions[0].outcome).toBe(outcome);
    expect(applyCheckin(next, session, outcome, 'Again', 700001)).toBe(next);
  },
);
test('reopening checks a persisted deadline only after expiry and while signed in', () => {
  const saved = recordSession(data, session);
  expect(shouldCheckIn(saved, 601000)).toBe(true);
  expect(shouldCheckIn(saved, 600999)).toBe(false);
  expect(shouldCheckIn({ ...saved, profile: null }, 700000)).toBe(false);
  expect(shouldCheckIn({ ...saved, activeSessionId: null }, 700000)).toBe(
    false,
  );
});
