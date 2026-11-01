import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  Check,
  Activity,
  CircleHelp,
  Focus,
  Grid2X2,
  Flower2,
  NotebookPen,
  Eye,
  Settings,
  Wind,
} from 'lucide-react-native';
import {
  Button,
  Card,
  Eyebrow,
  Input,
  Label,
  Screen,
  styles,
  Title,
} from '../components/ui';
import { copy } from '../copy';
import { useStore } from '../state/Store';
import { colors as c, fonts } from '../theme';
import type { RootParams } from '../navigation/types';
const durations = [60, 45, 30, 60, 60, 60];
const icons = [Wind, Eye, CircleHelp, Focus, Grid2X2, NotebookPen];
export function ActivitiesScreen() {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<
          { Activities: undefined; Settings: undefined },
          'Activities'
        >,
        NativeStackNavigationProp<RootParams>
      >
    >();
  const insets = useSafeAreaInsets();
  return (
    <View style={[hub.screen, { paddingTop: insets.top }]}>
      <View style={hub.header}>
        <Text style={hub.brand}>{copy.brand}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.tabs.Settings}
          onPress={() => navigation.navigate('Settings')}
          style={hub.settings}
        >
          <Settings size={22} color={c.onSurfaceVariant} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          hub.content,
          { paddingBottom: insets.bottom + 112 },
        ]}
      >
        <View style={hub.banner}>
          <View style={hub.bannerGlow} pointerEvents="none" />
          <View style={hub.eyebrowRow}>
            <Flower2 size={18} color={c.primary} />
            <Text style={hub.eyebrow}>{copy.activities.eyebrow}</Text>
          </View>
          <Text accessibilityRole="header" style={hub.heading}>
            {copy.activities.title}
          </Text>
          <Text style={hub.subtitle}>{copy.activities.subtitle}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${copy.activities.recommended}, ${copy.activities.recommendation}`}
          onPress={() => navigation.navigate('Activity', { id: 0 })}
          style={hub.recommendation}
        >
          <View style={hub.recommendationLeft}>
            <View style={hub.recommendationIcon}>
              <Wind size={18} color={c.primary} />
            </View>
            <View style={hub.recommendationCopy}>
              <Text style={hub.recommended}>{copy.activities.recommended}</Text>
              <Text style={hub.caption}>{copy.activities.recommendation}</Text>
            </View>
          </View>
          <View style={hub.activeBadge}>
            <Text style={hub.activeText}>{copy.activities.active}</Text>
            <View style={hub.dot} />
          </View>
        </Pressable>
        <View style={hub.grid}>
          {copy.activities.titles.map((title, id) => {
            const Icon = icons[id];
            return (
              <Pressable
                key={title}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${copy.common.seconds(
                  durations[id],
                )}`}
                onPress={() => navigation.navigate('Activity', { id })}
                style={({ pressed }) => [
                  hub.tile,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={hub.tileTop}>
                  <View style={[hub.tileIcon, id === 0 && hub.accent]}>
                    <Icon size={20} color={c.primary} />
                  </View>
                  <View style={[hub.durationBadge, id === 0 && hub.accent]}>
                    <Text
                      style={[
                        hub.durationText,
                        id === 0 && { color: c.primary },
                      ]}
                    >
                      {copy.activities.duration(durations[id])}
                    </Text>
                  </View>
                </View>
                <View style={hub.tileCopy}>
                  <Text numberOfLines={1} style={hub.tileTitle}>
                    {title}
                  </Text>
                  <Text style={hub.tileHint}>{copy.activities.hints[id]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={hub.footer}>
          <Activity size={18} color={c.primary} />
          <Text style={hub.footerText}>{copy.activities.footer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
const hub = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  header: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: c.onSurface,
  },
  settings: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 20 },
  banner: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: c.surfaceContainerLow,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bannerGlow: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: c.secondaryContainer,
    opacity: 0.18,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.55,
    fontWeight: '600',
    color: c.primary,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.65,
    fontWeight: '700',
    color: c.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: c.onSurfaceVariant,
    maxWidth: 280,
  },
  recommendation: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
    elevation: 1,
  },
  recommendationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationCopy: { flexShrink: 1 },
  recommended: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: c.onSurface,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    color: c.onSurfaceVariant,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: c.secondaryContainer,
  },
  activeText: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: c.primary,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  tile: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 140,
    padding: 16,
    borderRadius: 20,
    backgroundColor: c.surfaceContainerLowest,
    justifyContent: 'space-between',
    elevation: 1,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: c.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accent: { backgroundColor: c.secondaryContainer },
  durationBadge: {
    borderRadius: 99,
    backgroundColor: c.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    color: c.secondary,
  },
  tileCopy: { marginTop: 16, gap: 2 },
  tileTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.27,
    fontWeight: '600',
    color: c.onSurface,
  },
  tileHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: c.onSurfaceVariant,
  },
  footer: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: c.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    color: c.secondary,
    textAlign: 'center',
    flexShrink: 1,
  },
});
export function ActivityScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootParams, 'Activity'>) {
  const id = route.params.id;
  const { update } = useStore();
  const [recordId] = useState(
    () => `activity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const saving = useRef(false);
  const stub = id === 3 || id === 4;
  const [deadline] = useState(() => Date.now() + durations[id] * 1000);
  const [now, setNow] = useState(Date.now());
  const [noticed, setNoticed] = useState<number[]>([]);
  const [writing, setWriting] = useState('');
  useEffect(() => {
    if (stub) {
      return;
    }
    let interval: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (interval) {
        clearInterval(interval);
      }
      setNow(Date.now());
      if (AppState.currentState === 'active') {
        interval = setInterval(() => setNow(Date.now()), 250);
      }
    };
    sync();
    const event = AppState.addEventListener('change', sync);
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      event.remove();
    };
  }, [stub]);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const phase = Math.floor((durations[id] - remaining) / 4) % 4;
  async function finish() {
    if (saving.current || remaining > 0 || stub) return;
    saving.current = true;
    try {
      await update(data =>
        data.activityHistory.some(record => record.id === recordId)
          ? data
          : {
              ...data,
              activityHistory: [
                ...data.activityHistory,
                {
                  id: recordId,
                  activityId: id,
                  completedAt: Date.now(),
                  ...(writing.trim() ? { text: writing.trim() } : {}),
                },
              ],
            },
      );
      if (route.params.thenSession)
        navigation.replace('Handoff', route.params.thenSession);
      else navigation.goBack();
    } catch (e) {
      saving.current = false;
      Alert.alert(copy.common.error, String(e));
    }
  }
  return (
    <Screen back={navigation.goBack}>
      <Eyebrow>{copy.activities.eyebrow}</Eyebrow>
      <Title>{copy.activities.titles[id]}</Title>
      {stub ? (
        <Card>
          <Label muted>{copy.activities.stub}</Label>
        </Card>
      ) : (
        <>
          <View style={{ alignItems: 'center', paddingVertical: 24, gap: 24 }}>
            <View
              style={{
                width: 224,
                height: 224,
                borderRadius: 112,
                borderWidth: 2,
                borderColor: c.primaryContainer,
                backgroundColor: c.secondaryContainer,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 24,
              }}
            >
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  fontFamily: fonts.heading,
                  color: c.primaryContainer,
                  fontSize: id === 0 ? 23 : 40,
                  textAlign: 'center',
                }}
              >
                {remaining === 0 ? (
                  <Check size={44} color={c.primaryContainer} />
                ) : id === 0 ? (
                  copy.activities.breathe[phase]
                ) : (
                  remaining
                )}
              </Text>
            </View>
            <Label muted>{copy.common.seconds(remaining)}</Label>
          </View>
          {id === 1 && (
            <>
              <Label>{copy.activities.see}</Label>
              <View style={styles.wrap}>
                {[0, 1, 2, 3, 4].map(n => (
                  <Pressable
                    key={n}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: noticed.includes(n) }}
                    accessibilityLabel={`${n + 1}`}
                    onPress={() =>
                      setNoticed(old =>
                        old.includes(n)
                          ? old.filter(item => item !== n)
                          : [...old, n],
                      )
                    }
                    style={[
                      styles.iconButton,
                      noticed.includes(n) && {
                        backgroundColor: c.secondaryContainer,
                      },
                    ]}
                  >
                    {noticed.includes(n) ? (
                      <Check color={c.primaryContainer} />
                    ) : (
                      <Label>{n + 1}</Label>
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {(id === 2 || id === 5) && (
            <Input
              label={id === 2 ? copy.activities.why : copy.activities.write}
              placeholder={copy.activities.write}
              multiline
              value={writing}
              onChangeText={setWriting}
              maxLength={2000}
              style={{ minHeight: 150, textAlignVertical: 'top' }}
            />
          )}
          {remaining === 0 && <Label>{copy.activities.complete}</Label>}
          <Button
            disabled={remaining > 0}
            title={
              route.params.thenSession
                ? copy.activities.continueSession
                : copy.activities.finish
            }
            onPress={finish}
          />
        </>
      )}
    </Screen>
  );
}
