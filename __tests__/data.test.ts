import { PRESETS, type Interest } from '../src/domain/interests';
import { initialData, type AppData, type Session } from '../src/domain/model';
import {
  MAX_APP_DATA_BYTES,
  normalizeAppData,
  parseAppData,
} from '../src/domain/data';

const removedInterest: Interest = {
  id: 'custom-removed',
  name: 'Architecture',
  icon: 'sparkles',
  isCustom: true,
};
const active: Session = {
  id: 'session-1',
  interests: [PRESETS[0], removedInterest],
  goal: 'Notice light and framing',
  durationMinutes: 10,
  startedAt: 1000,
  endTimestamp: 601000,
  nudgeStyle: 'firm',
  checkinOpenedForEnd: 601000,
};
const data: AppData = {
  ...initialData,
  profile: { name: 'Ada' },
  onboarded: true,
  savedInterests: PRESETS.slice(0, 3),
  selectedInterestIds: [PRESETS[0].id],
  defaultMinutes: 15,
  nudge: 'silent',
  interestLinks: false,
  sessions: [active],
  activeSessionId: active.id,
  ideas: [
    {
      id: 'idea-1',
      text: 'Try natural light',
      interests: [removedInterest],
      createdAt: 700000,
    },
  ],
  activityHistory: [
    {
      id: 'activity-1',
      activityId: 2,
      completedAt: 800000,
      text: 'Be curious',
    },
  ],
};

test('a complete offline profile backup round-trips every stored feature', () => {
  expect(parseAppData(JSON.stringify(data))).toEqual(data);
  expect(normalizeAppData(data)).not.toBe(data);
  expect(parseAppData(JSON.stringify(initialData))).toEqual(initialData);
});

test('v1 demo migration preserves identity, goals, deadline, history and ideas', () => {
  const legacy = {
    ...data,
    profile: { email: 'art.design@example.com' },
    nudge: 'Firm',
    sessions: [{ ...active, nudgeStyle: undefined }],
    activityHistory: undefined,
    interestLinks: undefined,
  };
  const restored = parseAppData(JSON.stringify(legacy));
  expect(restored).toEqual({
    ...data,
    profile: { name: 'art design', email: 'art.design@example.com' },
    nudge: 'firm',
    interestLinks: true,
    activityHistory: [],
  });
  expect(restored.sessions[0].endTimestamp).toBe(active.endTimestamp);
});

test('history keeps deleted custom interests without requiring them on Home', () => {
  const restored = parseAppData(JSON.stringify(data));
  expect(restored.savedInterests).not.toContainEqual(removedInterest);
  expect(restored.sessions[0].interests).toContainEqual(removedInterest);
  expect(restored.ideas[0].interests).toContainEqual(removedInterest);
});

test('legacy labels are retained as contact metadata, without an online identity', () => {
  const restored = normalizeAppData({
    ...initialData,
    profile: { email: 'previous-local-profile' },
  });
  expect(restored.profile).toEqual({
    name: 'previous local profile',
    email: 'previous-local-profile',
  });
});

test.each([undefined, null, 'unknown', 'Gentle'])(
  'legacy default style %s normalizes safely and does not alter a session style',
  nudge => {
    const restored = normalizeAppData({ ...data, nudge });
    expect(restored.nudge).toBe('gentle');
    expect(restored.sessions[0].nudgeStyle).toBe('firm');
  },
);

test.each([
  '{broken',
  'null',
  '[]',
  JSON.stringify({ ...initialData, version: 0 }),
  JSON.stringify({ ...initialData, version: 2 }),
  JSON.stringify({ ...initialData, sessions: null }),
  JSON.stringify({ ...initialData, ideas: {} }),
  JSON.stringify({ ...initialData, profile: {} }),
  JSON.stringify({ ...initialData, profile: { name: '  ' } }),
  JSON.stringify({ ...initialData, interestLinks: 'false' }),
  JSON.stringify({ ...initialData, defaultMinutes: 999 }),
])(
  'damaged or unsupported backups never become empty replacement data (%s)',
  raw => {
    expect(() => parseAppData(raw)).toThrow();
  },
);

test.each([
  { selectedInterestIds: ['custom-missing'] },
  { activeSessionId: 'session-missing' },
  { selectedInterestIds: [PRESETS[0].id, PRESETS[0].id] },
  { sessions: [active, active] },
  { ideas: [data.ideas[0], data.ideas[0]] },
  { activityHistory: [data.activityHistory[0], data.activityHistory[0]] },
  { savedInterests: [PRESETS[0], PRESETS[0], PRESETS[1], PRESETS[2]] },
])('duplicate IDs and dangling references are rejected (%j)', patch => {
  expect(() => normalizeAppData({ ...data, ...patch })).toThrow();
});

test('an active session cannot refer to already completed history', () => {
  expect(() =>
    normalizeAppData({
      ...data,
      sessions: [{ ...active, outcome: 'found', completedAt: 700000 }],
    }),
  ).toThrow();
});

test.each([
  { startedAt: -1 },
  { startedAt: Infinity },
  { endTimestamp: NaN },
  { endTimestamp: 999 },
  { durationMinutes: 0 },
  { durationMinutes: 1.5 },
  { interests: [] },
  { interests: [PRESETS[0], PRESETS[0]] },
  { checkinOpenedForEnd: 601001 },
  { outcome: 'found' },
  { completedAt: 700000 },
])('malformed session fields cannot be restored (%j)', patch => {
  expect(() =>
    normalizeAppData({ ...data, sessions: [{ ...active, ...patch }] }),
  ).toThrow();
});

test('saved custom rules match the picker and Home limits', () => {
  const custom = { ...removedInterest, id: 'custom-kept' };
  expect(
    normalizeAppData({
      ...data,
      savedInterests: [...data.savedInterests, custom],
    }).savedInterests,
  ).toContainEqual(custom);
  for (const invalid of [
    { ...custom, name: PRESETS[0].name },
    { ...custom, name: 'Architecture\n' },
    { ...custom, name: 'x'.repeat(25) },
    { ...custom, id: PRESETS[0].id },
    { ...PRESETS[0], name: 'A forged preset' },
  ]) {
    expect(() =>
      normalizeAppData({
        ...data,
        savedInterests: [...data.savedInterests, invalid],
      }),
    ).toThrow();
  }
  expect(() =>
    normalizeAppData({ ...data, savedInterests: PRESETS.slice(0, 6) }),
  ).toThrow();
  expect(() =>
    normalizeAppData({ ...data, savedInterests: PRESETS.slice(0, 2) }),
  ).toThrow();
  expect(() =>
    normalizeAppData({
      ...data,
      savedInterests: PRESETS.slice(0, 4),
      selectedInterestIds: PRESETS.slice(0, 4).map(item => item.id),
    }),
  ).toThrow();
});

test('oversized Unicode data is bounded by encoded bytes rather than character count', () => {
  const raw = JSON.stringify({
    ...initialData,
    padding: '😀'.repeat(Math.floor(MAX_APP_DATA_BYTES / 4)),
  });
  expect(raw.length).toBeLessThan(MAX_APP_DATA_BYTES);
  expect(() => parseAppData(raw)).toThrow('too large');
});

test('activity text, timestamps and IDs are checked before replacing local data', () => {
  for (const patch of [
    { activityId: 6 },
    { activityId: 0.5 },
    { completedAt: -1 },
    { text: 'x'.repeat(2001) },
    { id: '../another-file' },
  ]) {
    expect(() =>
      normalizeAppData({
        ...data,
        activityHistory: [{ ...data.activityHistory[0], ...patch }],
      }),
    ).toThrow();
  }
});

test('pre-landing profiles/backups migrate without replaying welcome or losing data', () => {
  const legacy = { ...data, landingSeen: undefined };
  expect(normalizeAppData(legacy)).toEqual({ ...data, landingSeen: true });
  const fresh = { ...initialData, landingSeen: undefined };
  expect(normalizeAppData(fresh)).toEqual(initialData);
});

test('the first-use marker survives save/restore and rejects corrupt values', () => {
  expect(
    parseAppData(JSON.stringify({ ...initialData, landingSeen: true }))
      .landingSeen,
  ).toBe(true);
  expect(() =>
    normalizeAppData({ ...initialData, landingSeen: 'true' }),
  ).toThrow();
});
