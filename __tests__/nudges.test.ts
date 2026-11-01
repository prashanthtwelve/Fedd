import {
  createNudgeService,
  getNudgeConfig,
  nudgeStyles,
  normalizeNudgeStyle,
  shouldAcknowledgeNudge,
  type NudgePayload,
} from '../src/services/nudges';
import { initialData, type Session } from '../src/domain/model';
import {
  applyCheckin,
  markCheckinOpened,
  recordSession,
} from '../src/domain/sessions';

const session: Session = {
  id: 'session-nudge',
  interests: [],
  goal: '',
  startedAt: 1000,
  durationMinutes: 5,
  endTimestamp: 301000,
  nudgeStyle: 'firm',
};
function setup() {
  const pending = new Map<string, number>();
  const transport = {
    schedule: jest.fn(async (payload: NudgePayload) => {
      if (payload.test) {
        pending.set('test', payload.endTimestamp);
        return 'exact';
      }
      pending.delete('followUp');
      pending.set('primary', payload.endTimestamp);
      if (payload.followUp && !payload.checkedIn)
        pending.set('followUp', payload.followUp.at);
      return 'exact';
    }),
    cancelFollowUp: jest.fn(async () => {
      pending.delete('followUp');
    }),
    cancel: jest.fn(async () => {
      pending.delete('primary');
      pending.delete('followUp');
    }),
  };
  return { service: createNudgeService(transport), transport, pending };
}
test.each([
  ['gentle', 'fedd_nudge_gentle', "Time's up. Did you find what you wanted?"],
  ['firm', 'fedd_nudge_firm', 'Your 5 minutes are up. Time to check in.'],
  [
    'silent',
    'fedd_nudge_silent',
    "Session finished. Check in whenever you're ready.",
  ],
] as const)(
  '%s has its fixed channel and calm copy, with an optional trimmed goal line',
  (style, channelId, title) => {
    expect(getNudgeConfig(style, session)).toMatchObject({
      channelId,
      title,
      body: '',
    });
    expect(
      getNudgeConfig(style, { ...session, goal: '  Find framing ideas  ' })
        .body,
    ).toBe('Goal: Find framing ideas');
    expect(getNudgeConfig(style, { ...session, goal: '   ' }).body).toBe('');
  },
);
test('only Firm schedules one follow-up at the deadline plus two minutes', () => {
  expect(getNudgeConfig('firm', session).followUp).toEqual({
    at: 421000,
    title: 'Still in Instagram? Come back and check in.',
    body: '',
  });
  expect(getNudgeConfig('gentle', session).followUp).toBeUndefined();
  expect(getNudgeConfig('silent', session).followUp).toBeUndefined();
});
test('changing the saved default selects the next session channel, but not the active session style', async () => {
  const { service, transport } = setup();
  for (const style of nudgeStyles) {
    const data = recordSession(
      { ...initialData, nudge: style },
      { ...session, id: style, nudgeStyle: undefined },
    );
    await service.schedule(data.sessions[0], 'silent');
    expect(transport.schedule.mock.calls.at(-1)?.[0].channelId).toBe(
      `fedd_nudge_${style}`,
    );
  }
  await service.schedule(session, 'silent');
  expect(transport.schedule.mock.calls.at(-1)?.[0].style).toBe('firm');
});
test('concurrent Handoff/resume scheduling does not produce duplicate notifications', async () => {
  const { service, transport, pending } = setup();
  await Promise.all([
    service.schedule(session, 'gentle'),
    service.schedule(session, 'gentle'),
    service.schedule(session, 'silent'),
  ]);
  expect(transport.schedule).toHaveBeenCalledTimes(1);
  expect([...pending.keys()]).toEqual(['primary', 'followUp']);
});
test('failed scheduling can retry and does not mark the session as scheduled', async () => {
  const { service, transport } = setup();
  transport.schedule.mockRejectedValueOnce(new Error('failed'));
  await expect(service.schedule(session, 'firm')).rejects.toThrow('failed');
  await expect(service.schedule(session, 'firm')).resolves.toBe('exact');
  expect(transport.schedule).toHaveBeenCalledTimes(2);
});
test('Check-in removes its pending follow-up and persisted acknowledgement survives service restart', async () => {
  const { service, transport, pending } = setup();
  await service.schedule(session, 'firm');
  await service.checkinOpened(session);
  expect(pending.has('followUp')).toBe(false);
  expect(transport.cancelFollowUp).toHaveBeenCalledWith(
    session.id,
    session.endTimestamp,
  );
  const data = markCheckinOpened(recordSession(initialData, session), session);
  await createNudgeService(transport).schedule(data.sessions[0], 'gentle');
  expect(pending.has('followUp')).toBe(false);
  expect(transport.schedule.mock.calls.at(-1)?.[0].checkedIn).toBe(true);
});
test('Need 5 more minutes cancels the old follow-up and schedules a new pair with the original style', async () => {
  const { service, transport, pending } = setup();
  const data = markCheckinOpened(recordSession(initialData, session), session);
  await service.schedule(session, 'firm');
  const next = applyCheckin(data, data.sessions[0], 'extend', '', 310000)
    .sessions[0];
  await service.extend(session, next, 'silent');
  expect(transport.cancelFollowUp).toHaveBeenCalledWith(
    session.id,
    session.endTimestamp,
  );
  expect(pending.get('primary')).toBe(610000);
  expect(pending.get('followUp')).toBe(730000);
  expect(next.checkinOpenedForEnd).toBeUndefined();
  expect(transport.schedule.mock.calls.at(-1)?.[0].style).toBe('firm');
});
test.each(['found', 'distracted'] as const)(
  'finishing with %s removes pending primary and follow-up',
  async outcome => {
    const { service, pending } = setup();
    await service.schedule(session, 'firm');
    const data = applyCheckin(
      recordSession(initialData, session),
      session,
      outcome,
      '',
      310000,
    );
    expect(data.activeSessionId).toBeNull();
    await service.finish();
    expect(pending.size).toBe(0);
  },
);
test('test nudge uses its own five-second alarm, has no follow-up, and survives session cancellation', async () => {
  const { service, transport, pending } = setup();
  await service.schedule(session, 'firm');
  await service.sendTest('silent', 10000);
  expect(transport.schedule.mock.calls.at(-1)?.[0]).toMatchObject({
    id: 'test-nudge',
    test: true,
    endTimestamp: 15000,
    channelId: 'fedd_nudge_silent',
  });
  expect(transport.schedule.mock.calls.at(-1)?.[0].followUp).toBeUndefined();
  expect(pending.has('followUp')).toBe(true);
  await service.finish();
  expect([...pending.keys()]).toEqual(['test']);
});
test('mounting the active-session screen behind Instagram does not count as opening Check-in', () => {
  expect(shouldAcknowledgeNudge(session, false, false, 400000)).toBe(false);
  expect(shouldAcknowledgeNudge(session, true, false, 1000)).toBe(false);
  expect(shouldAcknowledgeNudge(session, true, false, 301000)).toBe(true);
  expect(shouldAcknowledgeNudge(session, true, true, 1000)).toBe(true);
  expect(
    shouldAcknowledgeNudge(
      { ...session, checkinOpenedForEnd: session.endTimestamp },
      true,
      true,
      400000,
    ),
  ).toBe(false);
});
test('legacy capitalized and missing/invalid styles normalize to compatible values', () => {
  expect(normalizeNudgeStyle('Firm')).toBe('firm');
  expect(normalizeNudgeStyle('Silent')).toBe('silent');
  expect(normalizeNudgeStyle(undefined)).toBe('gentle');
  expect(normalizeNudgeStyle('invalid')).toBe('gentle');
});
