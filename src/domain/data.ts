import { PRESETS, type Interest } from './interests';
import type {
  ActivityRecord,
  AppData,
  Idea,
  NudgeStyle,
  Profile,
  Session,
} from './model';
import { hasControlCharacters, makeNameProfile } from '../services/auth';
import { normalizeNudgeStyle } from '../services/nudges';

export const MAX_APP_DATA_BYTES = 8 * 1024 * 1024;
const MAX_RECORDS = 100000;
const INVALID = 'This data is damaged or is not a supported FedD backup.';

function invalid(): never {
  throw new Error(INVALID);
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid();
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, max = MAX_RECORDS): unknown[] {
  if (!Array.isArray(value) || value.length > max) {
    return invalid();
  }
  return value;
}

function text(value: unknown, max: number, allowEmpty = false): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (!allowEmpty && !value.trim())
  ) {
    return invalid();
  }
  return value;
}

function identifier(value: unknown): string {
  const id = text(value, 128);
  if (!/^[a-zA-Z0-9_.:-]+$/.test(id)) {
    return invalid();
  }
  return id;
}

function timestamp(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 8640000000000000
  ) {
    return invalid();
  }
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    return invalid();
  }
  return value;
}

function unique<T>(values: T[], key: (value: T) => string): T[] {
  if (new Set(values.map(key)).size !== values.length) {
    return invalid();
  }
  return values;
}

function interest(value: unknown): Interest {
  const record = object(value);
  const id = identifier(record.id);
  const isCustom = boolean(record.isCustom);
  const name = text(record.name, isCustom ? 24 : 60);
  const icon = text(record.icon, 32);
  if (hasControlCharacters(name) || hasControlCharacters(icon)) {
    return invalid();
  }
  if (isCustom) {
    if (
      !id.startsWith('custom-') ||
      name !== name.trim() ||
      PRESETS.some(p => p.name.toLowerCase() === name.toLowerCase())
    ) {
      return invalid();
    }
  } else if (
    !PRESETS.some(p => p.id === id && p.name === name && p.icon === icon)
  ) {
    return invalid();
  }
  return { id, name, icon, isCustom };
}

function interestList(value: unknown, max: number): Interest[] {
  return unique(array(value, max).map(interest), item => item.id);
}

function profile(value: unknown): Profile | null {
  if (value === null) {
    return null;
  }
  const record = object(value);
  let email: string | undefined;
  if (record.email !== undefined) {
    email = text(record.email, 320);
    if (hasControlCharacters(email)) {
      return invalid();
    }
  }
  const name =
    record.name !== undefined
      ? text(record.name, 60)
      : email
          ?.split('@')[0]
          .replace(/[._-]+/g, ' ')
          .trim()
          .slice(0, 60);
  if (!name) {
    return invalid();
  }
  try {
    return { ...makeNameProfile(name), ...(email ? { email } : {}) };
  } catch {
    return invalid();
  }
}

function session(value: unknown, fallback: NudgeStyle): Session {
  const record = object(value);
  const interests = interestList(record.interests, 3);
  const startedAt = timestamp(record.startedAt);
  const endTimestamp = timestamp(record.endTimestamp);
  const durationMinutes = record.durationMinutes;
  if (
    !interests.length ||
    typeof durationMinutes !== 'number' ||
    !Number.isSafeInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 525600 ||
    endTimestamp < startedAt
  ) {
    return invalid();
  }
  const result: Session = {
    id: identifier(record.id),
    interests,
    goal: text(record.goal, 120, true),
    durationMinutes,
    startedAt,
    endTimestamp,
    nudgeStyle: normalizeNudgeStyle(record.nudgeStyle ?? fallback),
  };
  if (record.outcome !== undefined) {
    if (record.outcome !== 'found' && record.outcome !== 'distracted') {
      return invalid();
    }
    result.outcome = record.outcome;
    result.completedAt = timestamp(record.completedAt);
    if (result.completedAt < startedAt) {
      return invalid();
    }
  } else if (record.completedAt !== undefined) {
    return invalid();
  }
  if (record.checkinOpenedForEnd !== undefined) {
    result.checkinOpenedForEnd = timestamp(record.checkinOpenedForEnd);
    if (result.checkinOpenedForEnd !== endTimestamp) {
      return invalid();
    }
  }
  return result;
}

function idea(value: unknown): Idea {
  const record = object(value);
  return {
    id: identifier(record.id),
    text: text(record.text, 120),
    interests: interestList(record.interests, 3),
    createdAt: timestamp(record.createdAt),
  };
}

function activity(value: unknown): ActivityRecord {
  const record = object(value);
  if (
    typeof record.activityId !== 'number' ||
    !Number.isInteger(record.activityId) ||
    record.activityId < 0 ||
    record.activityId > 5
  ) {
    return invalid();
  }
  return {
    id: identifier(record.id),
    activityId: record.activityId,
    completedAt: timestamp(record.completedAt),
    ...(record.text !== undefined
      ? { text: text(record.text, 2000, true) }
      : {}),
  };
}

// The same boundary migrates old local data and validates decrypted backups.
// Historical interest snapshots deliberately need not reference saved interests:
// deleting a custom interest must never erase its sessions or saved ideas.
export function normalizeAppData(value: unknown): AppData {
  const record = object(value);
  if (record.version !== 1) {
    return invalid();
  }
  const savedInterests = interestList(record.savedInterests, 15);
  unique(savedInterests, item => item.name.toLowerCase());
  const presetCount = savedInterests.filter(item => !item.isCustom).length;
  const onboarded = boolean(record.onboarded);
  if (
    presetCount > 5 ||
    savedInterests.length - presetCount > 10 ||
    (onboarded && presetCount < 3)
  ) {
    return invalid();
  }
  const selectedInterestIds = unique(
    array(record.selectedInterestIds, 3).map(identifier),
    id => id,
  );
  if (
    selectedInterestIds.some(id => !savedInterests.some(item => item.id === id))
  ) {
    return invalid();
  }
  if (![5, 10, 15].includes(record.defaultMinutes as number)) {
    return invalid();
  }
  const nudge = normalizeNudgeStyle(record.nudge);
  const sessions = unique(
    array(record.sessions).map(valueSession => session(valueSession, nudge)),
    item => item.id,
  );
  const activeSessionId =
    record.activeSessionId === null ? null : identifier(record.activeSessionId);
  if (
    activeSessionId &&
    !sessions.some(item => item.id === activeSessionId && !item.outcome)
  ) {
    return invalid();
  }
  return {
    version: 1,
    profile: profile(record.profile),
    // Existing profiles skip the new welcome page when reading older data/backups.
    landingSeen:
      record.landingSeen === undefined
        ? record.profile !== null || onboarded
        : boolean(record.landingSeen),
    onboarded,
    savedInterests,
    selectedInterestIds,
    defaultMinutes: record.defaultMinutes as number,
    nudge,
    interestLinks:
      record.interestLinks === undefined ? true : boolean(record.interestLinks),
    sessions,
    activeSessionId,
    ideas: unique(array(record.ideas).map(idea), item => item.id),
    activityHistory: unique(
      record.activityHistory === undefined
        ? []
        : array(record.activityHistory).map(activity),
      item => item.id,
    ),
  };
}

// Avoid a dependency on TextEncoder, which is not available in every supported
// React Native runtime. Stop counting as soon as the bound is exceeded.
function withinByteLimit(raw: string) {
  if (raw.length > MAX_APP_DATA_BYTES) {
    return false;
  }
  let bytes = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.codePointAt(i)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (code >= 0x10000) {
      i += 1;
    }
    if (bytes > MAX_APP_DATA_BYTES) {
      return false;
    }
  }
  return true;
}

export function parseAppData(raw: string): AppData {
  if (!withinByteLimit(raw)) {
    throw new Error('This data is too large to safely restore.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return invalid();
  }
  return normalizeAppData(parsed);
}
