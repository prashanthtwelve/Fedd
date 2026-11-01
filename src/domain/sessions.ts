import type { AppData, Session } from './model';

export function recordSession(data: AppData, session: Session): AppData {
  // A repeated handoff must never append the same session twice.
  if (data.sessions.some(item => item.id === session.id)) {
    return data;
  }
  if (data.activeSessionId) {
    throw new Error('An intentional session is already active.');
  }
  return {
    ...data,
    sessions: [
      ...data.sessions,
      { ...session, nudgeStyle: session.nudgeStyle ?? data.nudge },
    ],
    activeSessionId: session.id,
  };
}

export function applyCheckin(
  data: AppData,
  expected: Session,
  outcome: 'found' | 'distracted' | 'extend',
  idea: string,
  now: number,
): AppData {
  const session = data.sessions.find(item => item.id === data.activeSessionId);
  // Comparing the deadline also makes a repeated extension submission a no-op.
  if (
    !session ||
    session.id !== expected.id ||
    session.endTimestamp !== expected.endTimestamp ||
    session.outcome
  ) {
    return data;
  }
  const next =
    outcome === 'extend'
      ? {
          ...session,
          endTimestamp: now + 5 * 60000,
          durationMinutes: session.durationMinutes + 5,
          checkinOpenedForEnd: undefined,
        }
      : { ...session, outcome, completedAt: now };
  const text = idea.trim().slice(0, 120);
  return {
    ...data,
    sessions: data.sessions.map(item => (item.id === session.id ? next : item)),
    activeSessionId: outcome === 'extend' ? session.id : null,
    ideas: text
      ? [
          {
            id: `idea-${session.id}-${session.endTimestamp}`,
            text,
            interests: session.interests,
            createdAt: now,
          },
          ...data.ideas,
        ]
      : data.ideas,
  };
}

export function markCheckinOpened(data: AppData, expected: Session): AppData {
  return {
    ...data,
    sessions: data.sessions.map(session =>
      session.id === expected.id &&
      session.endTimestamp === expected.endTimestamp
        ? { ...session, checkinOpenedForEnd: session.endTimestamp }
        : session,
    ),
  };
}

export function shouldCheckIn(data: AppData, now: number) {
  return Boolean(
    data.profile &&
      data.onboarded &&
      data.sessions.some(
        session =>
          session.id === data.activeSessionId &&
          !session.outcome &&
          session.endTimestamp <= now,
      ),
  );
}
