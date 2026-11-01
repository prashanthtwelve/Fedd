import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  StatusBar,
  Switch,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  Circle,
  CircleCheck,
  CircleDot,
  Clock,
  EyeOff,
} from 'lucide-react-native';
import {
  Button,
  Card,
  Chip,
  Eyebrow,
  Input,
  Label,
  Screen,
  styles,
  Title,
  RouteSheet,
} from '../components/ui';
import { InterestIcon } from '../components/InterestIcon';
import { copy } from '../copy';
import { colors as c, fonts } from '../theme';
import { useStore } from '../state/Store';
import { joinInterests } from '../domain/interests';
import {
  recordSession,
  applyCheckin,
  markCheckinOpened,
} from '../domain/sessions';
import { remainingMs, type Session } from '../domain/model';
import {
  prepareReminder,
  openSessionInstagram,
  nudges,
} from '../services/session';
import type { RootParams } from '../navigation/types';
import { shouldAcknowledgeNudge } from '../services/nudges';

export function IntentScreen({
  navigation,
}: NativeStackScreenProps<RootParams, 'Intent'>) {
  const { data } = useStore();
  const [minutes, setMinutes] = useState(data.defaultMinutes);
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [goal, setGoal] = useState('');
  const [activity, setActivity] = useState(false);
  const chosen = data.selectedInterestIds
    .map(id => data.savedInterests.find(p => p.id === id))
    .filter(p => p !== undefined);
  const duration = custom ? Number(customValue) : minutes;
  const valid = Number.isInteger(duration) && duration >= 1 && duration <= 180;
  return (
    <RouteSheet onClose={navigation.goBack}>
      <Eyebrow>{copy.intent.eyebrow}</Eyebrow>
      <View style={styles.wrap}>
        {chosen.map(p => (
          <Chip key={p.id} title={p.name} selected />
        ))}
      </View>
      <Label>{copy.intent.time}</Label>
      <View style={styles.wrap}>
        {[5, 10, 15].map(n => (
          <Chip
            key={n}
            selected={!custom && n === minutes}
            title={copy.common.minutes(n)}
            onPress={() => {
              setCustom(false);
              setMinutes(n);
            }}
          />
        ))}
        <Chip
          title={copy.intent.custom}
          selected={custom}
          onPress={() => setCustom(true)}
        />
      </View>
      {custom && (
        <Input
          label={copy.intent.customLabel}
          keyboardType="number-pad"
          value={customValue}
          onChangeText={setCustomValue}
          maxLength={3}
        />
      )}
      <Input
        label={copy.intent.goal}
        placeholder={copy.intent.placeholder}
        value={goal}
        onChangeText={setGoal}
        maxLength={120}
      />
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Label>{copy.intent.activity}</Label>
            <Label muted>{copy.intent.activityHint}</Label>
          </View>
          <Switch
            accessibilityLabel={copy.intent.activity}
            value={activity}
            onValueChange={setActivity}
            trackColor={{ true: c.primaryContainer, false: c.outlineVariant }}
          />
        </View>
      </Card>
      <Button
        title={copy.intent.enter}
        disabled={!valid || !chosen.length}
        onPress={() => {
          const params = { minutes: duration, goal: goal.trim() };
          if (activity) {
            navigation.replace('Activity', { id: 0, thenSession: params });
          } else {
            navigation.replace('Handoff', params);
          }
        }}
        arrow
      />
      <Label muted>{copy.intent.nudge}</Label>
    </RouteSheet>
  );
}
export function HandoffScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootParams, 'Handoff'>) {
  const { data, update } = useStore();
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, []),
  );
  const saved = useRef<Session | null>(null);
  const launched = useRef(false);
  const launching = useRef(false);
  const mounted = useRef(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    return () => {
      mounted.current = false;
      listener.remove();
    };
  }, []);
  const [count, setCount] = useState(3);
  const [error, setError] = useState(false);
  const chosen = data.selectedInterestIds
    .map(id => data.savedInterests.find(p => p.id === id))
    .filter(p => p !== undefined);
  const names = joinInterests(chosen.map(p => p.name));
  const launch = useCallback(async () => {
    if (
      launching.current ||
      !mounted.current ||
      AppState.currentState !== 'active'
    ) {
      return;
    }
    launching.current = true;
    setError(false);
    try {
      let session = saved.current;
      if (!session) {
        const now = Date.now();
        session = {
          id: `session-${now}`,
          interests: chosen,
          goal: route.params.goal,
          durationMinutes: route.params.minutes,
          startedAt: now,
          endTimestamp: now + route.params.minutes * 60000,
          nudgeStyle: data.nudge,
        };
        if (!chosen.length) {
          throw new Error(copy.home.none);
        }
        const next = session;
        await update(d => recordSession(d, next));
        saved.current = session;
        if (!mounted.current) {
          return;
        }
        await prepareReminder(session, data.nudge);
      }
      if (!mounted.current || AppState.currentState !== 'active') {
        if (mounted.current) {
          setError(true);
        }
        return;
      }
      await openSessionInstagram(session, data.interestLinks);
      if (mounted.current) {
        navigation.replace('Checkin');
      }
    } catch {
      if (mounted.current) {
        setError(true);
      }
    } finally {
      launching.current = false;
    }
  }, [
    chosen,
    data.nudge,
    data.interestLinks,
    navigation,
    route.params,
    update,
  ]);
  useEffect(() => {
    if (!foreground) {
      return;
    }
    if (count === 0 && !launched.current) {
      launched.current = true;
      launch();
      return;
    }
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count, launch, foreground]);
  return (
    <View style={{ flex: 1, backgroundColor: c.handoff }}>
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="handoff" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.primaryContainer} />
            <Stop offset="0.55" stopColor={c.handoff} />
            <Stop offset="1" stopColor={c.primaryContainer} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#handoff)" />
      </Svg>
      <Screen dark transparent>
        <View style={s.handoff}>
          <Text style={s.lightEyebrow}>{copy.handoff.eyebrow}</Text>
          <View style={s.ring}>
            <View style={s.innerRing}>
              <InterestIcon
                name={chosen[0]?.icon ?? 'sparkles'}
                size={38}
                color={c.primaryFixed}
              />
            </View>
          </View>
          <Text style={s.lightEyebrow}>{copy.handoff.looking}</Text>
          <Text style={s.handoffTitle}>{names}</Text>
          <Text style={s.light}>
            {copy.handoff.duration(route.params.minutes)}
          </Text>
          {!!route.params.goal && (
            <Text style={[s.light, { fontStyle: 'italic' }]}>
              {route.params.goal}
            </Text>
          )}
          <Text style={s.go}>{count > 0 ? count : copy.handoff.go}</Text>
          <Text style={s.light}>{copy.handoff.opening(names)}</Text>
          {error && (
            <>
              <Text style={s.light}>{copy.handoff.fallback}</Text>
              <Button title={copy.handoff.retry} onPress={launch} />
              <Button
                secondary
                title={copy.tabs.Home}
                onPress={() => navigation.popToTop()}
              />
            </>
          )}
        </View>
      </Screen>
    </View>
  );
}
export function CheckinScreen({
  navigation,
}: NativeStackScreenProps<RootParams, 'Checkin'>) {
  const { data, update } = useStore();
  const session = data.sessions.find(s => s.id === data.activeSessionId);
  const [outcome, setOutcome] = useState<'found' | 'extend' | 'distracted'>(
    'found',
  );
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [early, setEarly] = useState(false);
  const [now, setNow] = useState(Date.now());
  const openedDeadline = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!session || session.checkinOpenedForEnd === session.endTimestamp)
        return;
      const acknowledge = () => {
        if (
          !shouldAcknowledgeNudge(
            session,
            AppState.currentState === 'active',
            early,
            Math.max(now, Date.now()),
          ) ||
          openedDeadline.current === session.endTimestamp
        )
          return;
        openedDeadline.current = session.endTimestamp;
        // Cancel natively first; persist acknowledgement so resume/reboot cannot
        // re-arm the follow-up. Mounting behind Instagram is not an acknowledgement.
        nudges
          .checkinOpened(session)
          .then(() => update(d => markCheckinOpened(d, session)))
          .catch(() => {
            openedDeadline.current = null;
          });
      };
      acknowledge();
      const listener = AppState.addEventListener('change', acknowledge);
      return () => listener.remove();
    }, [session, early, now, update]),
  );
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (timer) {
        clearInterval(timer);
      }
      setNow(Date.now());
      if (AppState.currentState === 'active') {
        timer = setInterval(() => setNow(Date.now()), 1000);
      }
    };
    sync();
    const subscription = AppState.addEventListener('change', sync);
    return () => {
      if (timer) {
        clearInterval(timer);
      }
      subscription.remove();
    };
  }, []);
  async function finish() {
    if (!session || submitting.current) {
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      let nextSession: Session | undefined;
      await update(d => {
        const next = applyCheckin(d, session, outcome, idea, Date.now());
        nextSession = next.sessions.find(item => item.id === session.id);
        return next;
      });
      setIdea('');
      if (outcome === 'extend' && nextSession && !nextSession.outcome) {
        setEarly(false);
        setOutcome('found');
        await prepareReminder(nextSession, data.nudge, session);
        await openSessionInstagram(nextSession, data.interestLinks);
      } else {
        await nudges.finish();
        navigation.popToTop();
      }
    } catch (e) {
      Alert.alert(copy.common.error, String(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  if (!session) {
    return (
      <Screen>
        <Title>{copy.checkin.none}</Title>
        <Button title={copy.tabs.Home} onPress={() => navigation.popToTop()} />
      </Screen>
    );
  }
  const remaining = remainingMs(session.endTimestamp, now);
  if (remaining > 0 && !early) {
    return (
      <Screen back={navigation.goBack}>
        <Eyebrow>{joinInterests(session.interests.map(p => p.name))}</Eyebrow>
        <Title>{copy.checkin.active}</Title>
        <Label muted>
          {copy.checkin.remaining(Math.ceil(remaining / 60000))}
        </Label>
        <Button
          title={copy.checkin.resume}
          onPress={() =>
            openSessionInstagram(session, data.interestLinks).catch(() =>
              Alert.alert(copy.handoff.fallback),
            )
          }
        />
        <Label muted>{copy.checkin.tagHelp}</Label>
        <Button
          secondary
          title={copy.checkin.appHome}
          onPress={() =>
            openSessionInstagram(session, false).catch(() =>
              Alert.alert(copy.handoff.fallback),
            )
          }
        />
        <Button
          secondary
          title={copy.checkin.checkEarly}
          onPress={() => setEarly(true)}
        />
      </Screen>
    );
  }
  const choices = [
    {
      id: 'found' as const,
      title: copy.checkin.found,
      hint: copy.checkin.foundHint,
      icon: CircleCheck,
    },
    {
      id: 'extend' as const,
      title: copy.checkin.extend,
      hint: copy.checkin.extendHint,
      icon: Clock,
    },
    {
      id: 'distracted' as const,
      title: copy.checkin.distracted,
      hint: copy.checkin.distractedHint,
      icon: EyeOff,
    },
  ];
  return (
    <Screen>
      <Eyebrow>{joinInterests(session.interests.map(p => p.name))}</Eyebrow>
      <Title>{copy.checkin.title}</Title>
      {!!session.goal && <Label muted>{copy.checkin.goal(session.goal)}</Label>}
      {choices.map(choice => (
        <Pressable
          key={choice.id}
          accessibilityRole="radio"
          accessibilityState={{ checked: outcome === choice.id }}
          onPress={() => setOutcome(choice.id)}
        >
          <Card
            style={
              outcome === choice.id
                ? { backgroundColor: c.secondaryContainer }
                : {}
            }
          >
            <View style={styles.row}>
              <choice.icon color={c.primaryContainer} />
              <View style={{ flex: 1 }}>
                <Label>{choice.title}</Label>
                <Label muted>{choice.hint}</Label>
              </View>
              {outcome === choice.id ? (
                <CircleDot color={c.primaryContainer} size={20} />
              ) : (
                <Circle color={c.outlineVariant} size={20} />
              )}
            </View>
          </Card>
        </Pressable>
      ))}
      <Input
        label={copy.checkin.idea}
        placeholder={copy.checkin.placeholder}
        value={idea}
        onChangeText={setIdea}
        maxLength={120}
      />
      <Button title={copy.common.done} onPress={finish} disabled={busy} arrow />
      <Label muted>{copy.checkin.savedHint}</Label>
    </Screen>
  );
}
const s = StyleSheet.create({
  handoff: { alignItems: 'center', gap: 22, paddingTop: 20 },
  lightEyebrow: {
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 2,
    color: c.tertiaryFixed,
  },
  ring: {
    height: 224,
    width: 224,
    borderRadius: 112,
    borderWidth: 1,
    borderColor: '#cae9e030',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  innerRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: '#cae9e060',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primaryContainer,
  },
  handoffTitle: {
    fontFamily: fonts.heading,
    fontSize: 32,
    lineHeight: 42,
    color: c.onPrimary,
    textAlign: 'center',
    fontWeight: '700',
  },
  light: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: c.tertiaryFixed,
    textAlign: 'center',
  },
  go: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: c.onPrimary,
    marginVertical: 16,
  },
});
