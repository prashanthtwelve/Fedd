import { Alert } from 'react-native';
import { copy } from '../copy';
import type { NudgeStyle, Session } from '../domain/model';
import {
  instagramTransport,
  requestReminders,
  scheduleNudge,
  cancelReminder,
  cancelFollowUp,
} from '../platform';
import { launchInstagram } from '../lib/instagram';
import { createNudgeService } from './nudges';
export const nudges = createNudgeService({
  schedule: scheduleNudge,
  cancel: cancelReminder,
  cancelFollowUp,
});
export async function prepareReminder(
  session: Session,
  nudge: NudgeStyle,
  previous?: Session,
) {
  try {
    const allowed = await requestReminders();
    // Persist the native alarm even when permission is denied, so later permission
    // changes can still deliver it. The saved JS timestamp always recovers check-in.
    const mode = previous
      ? await nudges.extend(previous, session, nudge)
      : await nudges.schedule(session, nudge);
    if (!allowed) {
      Alert.alert(copy.notification.denied);
    } else if (mode === 'inexact') {
      Alert.alert(copy.notification.approximate);
    }
  } catch {
    Alert.alert(copy.notification.failed);
  }
}
export const openSessionInstagram = (session: Session, useTag?: boolean) =>
  launchInstagram(session.interests[0].name, instagramTransport, useTag);
