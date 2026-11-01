import { copy } from '../copy';
import type { NudgeStyle, Session } from '../domain/model';

export type { NudgeStyle } from '../domain/model';
export const nudgeStyles: NudgeStyle[] = ['gentle', 'firm', 'silent'];
export const nudgeChannels = {
  gentle: 'fedd_nudge_gentle',
  firm: 'fedd_nudge_firm',
  silent: 'fedd_nudge_silent',
} as const;

export function normalizeNudgeStyle(value: unknown): NudgeStyle {
  const style = typeof value === 'string' ? value.toLowerCase() : '';
  return style === 'firm' || style === 'silent' ? style : 'gentle';
}

export function getNudgeConfig(style: NudgeStyle, session: Session) {
  const goal = session.goal.trim();
  return {
    channelId: nudgeChannels[style],
    title:
      style === 'firm'
        ? copy.nudges.firm(session.durationMinutes)
        : copy.nudges[style],
    body: goal ? copy.nudges.goal(goal) : '',
    ...(style === 'firm'
      ? {
          followUp: {
            at: session.endTimestamp + 120000,
            title: copy.nudges.followUp,
            body: '',
          },
        }
      : {}),
  };
}

export function shouldAcknowledgeNudge(
  session: Session,
  foreground: boolean,
  early: boolean,
  now: number,
) {
  return (
    foreground &&
    (early || session.endTimestamp <= now) &&
    session.checkinOpenedForEnd !== session.endTimestamp
  );
}

export type NudgePayload = ReturnType<typeof getNudgeConfig> & {
  id: string;
  endTimestamp: number;
  style: NudgeStyle;
  checkedIn: boolean;
  test: boolean;
  channels: { id: string; name: string; description: string }[];
};
type Transport = {
  schedule: (payload: NudgePayload) => Promise<string>;
  cancelFollowUp: (id: string, endTimestamp: number) => Promise<void>;
  cancel: () => Promise<void>;
};
function payload(
  session: Session,
  style: NudgeStyle,
  test = false,
): NudgePayload {
  const config = getNudgeConfig(style, session);
  return {
    ...config,
    ...(test ? { followUp: undefined } : {}),
    id: session.id,
    endTimestamp: session.endTimestamp,
    style,
    checkedIn: session.checkinOpenedForEnd === session.endTimestamp,
    test,
    channels: nudgeStyles.map(s => ({
      id: nudgeChannels[s],
      name: copy.nudges.channelName(copy.nudges.labels[s]),
      description: copy.nudges.descriptions[s],
    })),
  };
}

// Serialize lifecycle operations, including React resume/Handoff races. Native
// storage provides the durable duplicate/delivery guard across process restarts.
export function createNudgeService(transport: Transport) {
  let queue = Promise.resolve();
  let lastKey: string | undefined;
  let lastMode = 'exact';
  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const task = queue.catch(() => undefined).then(work);
    queue = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }
  const cancelFollowUp = (session: Session) =>
    enqueue(() => transport.cancelFollowUp(session.id, session.endTimestamp));
  return {
    schedule(session: Session, fallback: NudgeStyle) {
      return enqueue(async () => {
        const style = session.nudgeStyle ?? fallback;
        const key = `${session.id}:${session.endTimestamp}:${style}`;
        if (lastKey !== key) {
          lastMode = await transport.schedule(payload(session, style));
          lastKey = key;
        }
        if (session.checkinOpenedForEnd === session.endTimestamp) {
          await transport.cancelFollowUp(session.id, session.endTimestamp);
        }
        return lastMode;
      });
    },
    checkinOpened: cancelFollowUp,
    async extend(previous: Session, next: Session, fallback: NudgeStyle) {
      await cancelFollowUp(previous);
      return this.schedule(next, previous.nudgeStyle ?? fallback);
    },
    finish() {
      return enqueue(async () => {
        await transport.cancel();
        lastKey = undefined;
      });
    },
    sendTest(style: NudgeStyle, now = Date.now()) {
      return enqueue(() =>
        transport.schedule(
          payload(
            {
              id: 'test-nudge',
              interests: [],
              goal: '',
              durationMinutes: 5,
              startedAt: now,
              endTimestamp: now + 5000,
            },
            style,
            true,
          ),
        ),
      );
    },
  };
}
