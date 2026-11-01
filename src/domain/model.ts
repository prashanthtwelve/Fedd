import type { Interest } from './interests';
export type NudgeStyle = 'gentle' | 'firm' | 'silent';
export type Session = {
  id: string;
  interests: Interest[];
  goal: string;
  durationMinutes: number;
  startedAt: number;
  endTimestamp: number;
  outcome?: 'found' | 'distracted';
  completedAt?: number;
  nudgeStyle?: NudgeStyle;
  checkinOpenedForEnd?: number;
};
export type Idea = {
  id: string;
  text: string;
  interests: Interest[];
  createdAt: number;
};
// Email is retained only when migrating a profile made by the old demo login.
// A normalized offline profile always has a name; optional here keeps v1 callers
// and their existing data compatible while migration happens at the boundary.
export type Profile = { name?: string; email?: string };
export type ActivityRecord = {
  id: string;
  activityId: number;
  completedAt: number;
  text?: string;
};
export type AppData = {
  version: 1;
  profile: Profile | null;
  onboarded: boolean;
  landingSeen: boolean;
  savedInterests: Interest[];
  selectedInterestIds: string[];
  defaultMinutes: number;
  nudge: NudgeStyle;
  interestLinks: boolean;
  sessions: Session[];
  activeSessionId: string | null;
  ideas: Idea[];
  activityHistory: ActivityRecord[];
};
export const initialData: AppData = {
  version: 1,
  profile: null,
  onboarded: false,
  landingSeen: false,
  savedInterests: [],
  selectedInterestIds: [],
  defaultMinutes: 10,
  nudge: 'gentle',
  interestLinks: true,
  sessions: [],
  activeSessionId: null,
  ideas: [],
  activityHistory: [],
};
export const remainingMs = (endTimestamp: number, now = Date.now()) =>
  Math.max(0, endTimestamp - now);
export function weeklyStats(sessions: Session[], now = Date.now()) {
  const week = sessions.filter(
    s => s.startedAt >= now - 7 * 86400000 && s.startedAt <= now,
  );
  const found = week.filter(s => s.outcome === 'found').length;
  const distracted = week.filter(s => s.outcome === 'distracted').length;
  return {
    started: week.length,
    found,
    distracted,
    ratio: found + distracted ? found / (found + distracted) : 0,
  };
}
