import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  Bookmark,
  ChevronRight,
  Compass,
  Download,
  ExternalLink,
  Info,
  Shapes,
  Timer,
  Trash2,
  UserRound,
  ShieldCheck,
  Vibrate,
} from 'lucide-react-native';
import { Button, Chip, Label, Sheet, styles, Title } from '../components/ui';
import { copy } from '../copy';
import { colors as c, fonts } from '../theme';
import { useStore } from '../state/Store';
import {
  openAlarmSettings,
  openNotificationSettings,
  notificationsEnabled,
  requestReminders,
} from '../platform';
import { nudges } from '../services/session';
import { nudgeChannels, nudgeStyles } from '../services/nudges';
import type { RootParams } from '../navigation/types';
export function SettingsScreen() {
  const { data, update, lock, security } = useStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootParams>>();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<
    'interests' | 'timer' | 'shortcut' | 'profile' | null
  >(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState('');
  const custom = data.savedInterests.filter(p => p.isCustom);
  const safely = (action: Promise<unknown>) =>
    action.catch(e => Alert.alert(copy.common.error, String(e)));
  const refreshPermission = useCallback(() => {
    notificationsEnabled(nudgeChannels[data.nudge])
      .then(setAllowed)
      .catch(() => setAllowed(null));
  }, [data.nudge]);
  useFocusEffect(
    useCallback(() => {
      refreshPermission();
    }, [refreshPermission]),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') refreshPermission();
    });
    return () => listener.remove();
  }, [refreshPermission]);
  async function testNudge() {
    if (testing) return;
    setTesting(true);
    setTestStatus('');
    try {
      if (
        !(await requestReminders()) ||
        !(await notificationsEnabled(nudgeChannels[data.nudge]))
      ) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      const mode = await nudges.sendTest(data.nudge);
      setTestStatus(
        mode === 'inexact'
          ? copy.nudges.testApproximate
          : copy.nudges.testScheduled,
      );
    } catch (e) {
      Alert.alert(copy.common.error, String(e));
    } finally {
      setTesting(false);
    }
  }
  function exportData() {
    const exported = {
      version: data.version,
      interests: data.savedInterests,
      sessions: data.sessions,
      ideas: data.ideas,
    };
    Alert.alert(copy.settings.export, copy.privacy.exportWarning, [
      {
        text: copy.settings.exportJson,
        onPress: () =>
          safely(
            Share.share({
              title: copy.settings.exportTitle,
              message: JSON.stringify(exported, null, 2),
            }),
          ),
      },
      {
        text: copy.settings.exportMarkdown,
        onPress: () =>
          safely(
            Share.share({
              title: copy.settings.exportTitle,
              message: `# ${copy.settings.exportTitle}\n\n${data.sessions
                .map(
                  s =>
                    `- ${new Date(
                      s.startedAt,
                    ).toISOString()}: ${copy.common.minutes(
                      s.durationMinutes,
                    )} · ${s.interests.map(p => p.name).join(', ')}${
                      s.goal ? `\n  ${copy.nudges.goal(s.goal)}` : ''
                    }`,
                )
                .join('\n')}\n\n## ${copy.ideas.title}\n\n${data.ideas
                .map(i => `- ${i.text}`)
                .join('\n')}`,
            }),
          ),
      },
      { text: copy.common.cancel, style: 'cancel' },
    ]);
  }
  function remove(id: string) {
    Alert.alert(copy.settings.deleteTitle, copy.settings.deleteBody, [
      { text: copy.common.cancel, style: 'cancel' },
      {
        text: copy.common.delete,
        style: 'destructive',
        onPress: () =>
          safely(
            update(d => ({
              ...d,
              savedInterests: d.savedInterests.filter(p => p.id !== id),
              selectedInterestIds: d.selectedInterestIds.filter(p => p !== id),
            })),
          ),
      },
    ]);
  }
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.brand}>{copy.brand}</Text>
        <Pressable
          style={s.profileButton}
          accessibilityRole="button"
          accessibilityLabel={copy.settings.profile}
          onPress={() => setSheet('profile')}
        >
          <UserRound size={20} color={c.secondary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 112 },
        ]}
      >
        <View style={s.heading}>
          <Title>{copy.tabs.Settings}</Title>
          <Label muted>{copy.settings.rhythmSubtitle}</Label>
        </View>
        <Group
          title={copy.settings.preferences}
          badge={copy.settings.rhythmActive}
        >
          <Row
            icon={Shapes}
            title={copy.settings.interests}
            hint={data.savedInterests.map(p => p.name).join(', ')}
            value={copy.settings.selected(data.savedInterests.length)}
            onPress={() => setSheet('interests')}
          />
          <Divider />
          <Row
            icon={Timer}
            title={copy.settings.sessionLength}
            hint={copy.settings.sessionLengthHint}
            value={copy.common.minutes(data.defaultMinutes)}
            onPress={() => setSheet('timer')}
          />
          <Divider />
          <View style={s.nudgeRow}>
            <RowContent
              icon={Vibrate}
              title={copy.settings.nudge}
              hint={copy.nudges.intensity}
            />
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={copy.settings.nudge}
              style={s.segments}
            >
              {nudgeStyles.map(style => (
                <Pressable
                  key={style}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: style === data.nudge,
                    selected: style === data.nudge,
                  }}
                  accessibilityLabel={`${copy.nudges.labels[style]}. ${copy.nudges.descriptions[style]}`}
                  onPress={() => safely(update(d => ({ ...d, nudge: style })))}
                  style={[s.segment, style === data.nudge && s.selectedSegment]}
                >
                  <Text
                    style={[
                      s.segmentText,
                      style === data.nudge && s.selectedText,
                    ]}
                  >
                    {copy.nudges.labels[style]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={s.description}>
              <Info size={15} color={c.primary} />
              <Text accessibilityLiveRegion="polite" style={s.hint}>
                {copy.nudges.descriptions[data.nudge]}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: testing }}
              disabled={testing}
              onPress={testNudge}
              style={s.smallButton}
            >
              <Text style={s.smallButtonText}>{copy.nudges.test}</Text>
            </Pressable>
            {!!testStatus && (
              <Text accessibilityLiveRegion="polite" style={s.hint}>
                {testStatus}
              </Text>
            )}
            {allowed === false && (
              <View style={s.permissionMessage}>
                <Text style={s.hint}>{copy.nudges.disabled}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => safely(openNotificationSettings())}
                  style={s.smallButton}
                >
                  <Text style={s.smallButtonText}>
                    {copy.settings.notifications}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Group>
        <Group title={copy.settings.integrations} badge={copy.settings.passive}>
          <View style={s.shortcutRow}>
            <RowContent
              icon={ExternalLink}
              title={copy.settings.openVia}
              hint={copy.settings.shortcutHint}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setSheet('shortcut')}
              style={[s.smallButton, { alignSelf: 'flex-end' }]}
            >
              <Text style={s.smallButtonText}>
                {copy.settings.setupShortcut}
              </Text>
            </Pressable>
          </View>
          <Divider />
          <View style={s.row}>
            <RowContent
              icon={Compass}
              title={copy.settings.interestLinks}
              hint={copy.settings.interestLinksHint}
            />
            <Switch
              accessibilityLabel={copy.settings.interestLinks}
              value={data.interestLinks}
              onValueChange={value => {
                safely(update(d => ({ ...d, interestLinks: value })));
              }}
              trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
              thumbColor={c.onPrimary}
            />
          </View>
          <Row
            icon={Bookmark}
            title={copy.settings.ideasBoard}
            hint={copy.settings.ideasHint}
            value={copy.settings.savedNotes(data.ideas.length)}
            onPress={() => navigation.navigate('Ideas')}
          />
        </Group>
        <Group title={copy.settings.dataHeading} badge={copy.settings.private}>
          <Row
            icon={ShieldCheck}
            title={copy.privacy.title}
            hint={copy.privacy.hint}
            onPress={() => navigation.navigate('Privacy')}
          />
          <Divider />
          <Row
            icon={Bell}
            title={copy.settings.reminders}
            hint={copy.settings.notifications}
            onPress={() => safely(openNotificationSettings())}
          />
          <Divider />
          <Row
            icon={Timer}
            title={copy.settings.exact}
            onPress={() => safely(openAlarmSettings())}
          />
          <Divider />
          <Row
            icon={Download}
            title={copy.settings.export}
            hint={copy.settings.exportHint}
            onPress={exportData}
          />
        </Group>
        <View style={s.footer}>
          <Text style={s.hint}>{copy.settings.designed}</Text>
          <Text style={s.footerCaption}>{copy.settings.quietFooter}</Text>
        </View>
      </ScrollView>
      <Sheet visible={sheet !== null} onClose={() => setSheet(null)}>
        <View style={{ gap: 20 }}>
          {sheet === 'interests' && (
            <>
              <Title>{copy.settings.interests}</Title>
              <Button
                secondary
                title={copy.settings.presets}
                onPress={() => {
                  setSheet(null);
                  navigation.navigate('Interests', { editing: true });
                }}
              />
              <Label>{copy.settings.own}</Label>
              {custom.length ? (
                custom.map(p => (
                  <View
                    key={p.id}
                    style={[styles.row, { justifyContent: 'space-between' }]}
                  >
                    <Label>{p.name}</Label>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${copy.common.delete} ${p.name}`}
                      style={styles.iconButton}
                      onPress={() => remove(p.id)}
                    >
                      <Trash2 color={c.secondary} size={20} />
                    </Pressable>
                  </View>
                ))
              ) : (
                <Label muted>{copy.settings.noCustom}</Label>
              )}
            </>
          )}
          {sheet === 'timer' && (
            <>
              <Title>{copy.settings.sessionLength}</Title>
              <View style={styles.wrap}>
                {[5, 10, 15].map(n => (
                  <Chip
                    key={n}
                    title={copy.common.minutes(n)}
                    selected={n === data.defaultMinutes}
                    onPress={() =>
                      safely(update(d => ({ ...d, defaultMinutes: n })))
                    }
                  />
                ))}
              </View>
            </>
          )}
          {sheet === 'shortcut' && (
            <>
              <Title>{copy.settings.shortcut}</Title>
              <Label muted>{copy.settings.shortcutBody}</Label>
            </>
          )}
          {sheet === 'profile' && (
            <>
              <Title>{copy.settings.profile}</Title>
              <Label>{data.profile?.name}</Label>
              <Label muted>{copy.settings.local}</Label>
              <Button
                secondary
                title={copy.offline.lockNow}
                onPress={() =>
                  safely(
                    (async () => {
                      if (security?.authMode === 'none') {
                        Alert.alert(copy.offline.noLock);
                        return;
                      }
                      setSheet(null);
                      await lock();
                    })(),
                  )
                }
              />
            </>
          )}
        </View>
      </Sheet>
    </View>
  );
}

type RowProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
};
function RowContent({ icon: Icon, title, hint }: RowProps) {
  return (
    <View style={s.rowLeft}>
      <View style={s.icon}>
        <Icon size={19} color={c.primary} />
      </View>
      <View style={s.rowCopy}>
        <Text style={s.rowTitle}>{title}</Text>
        {!!hint && <Text style={s.hint}>{hint}</Text>}
      </View>
    </View>
  );
}
function Row(props: RowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={props.onPress} style={s.row}>
      <RowContent {...props} />
      <View style={s.rowRight}>
        {!!props.value && <Text style={s.value}>{props.value}</Text>}
        <ChevronRight size={18} color={c.outline} />
      </View>
    </Pressable>
  );
}
function Divider() {
  return <View style={s.divider} />;
}
function Group({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.group}>
      <View style={s.groupHeading}>
        <Text style={s.groupTitle}>{title}</Text>
        <Text style={s.groupBadge}>{badge}</Text>
      </View>
      <View style={s.groupCard}>{children}</View>
    </View>
  );
}
const s = StyleSheet.create({
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
    fontSize: 20,
    fontWeight: '700',
    color: c.primary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, gap: 24 },
  heading: { paddingTop: 16, gap: 4, marginBottom: -8 },
  group: { gap: 8 },
  groupHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
  },
  groupTitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.65,
    color: c.secondary,
  },
  groupBadge: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    color: c.secondary,
  },
  groupCard: {
    backgroundColor: c.surfaceContainerLowest,
    borderRadius: 20,
    elevation: 1,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: c.onSurface,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: c.secondary,
    flexShrink: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5efeb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  value: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 16,
    color: c.secondary,
    flexShrink: 1,
    maxWidth: 90,
  },
  divider: {
    height: 1,
    backgroundColor: c.surfaceContainerHigh,
    marginHorizontal: 20,
  },
  nudgeRow: { padding: 20, paddingVertical: 16, gap: 12 },
  segments: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 99,
    backgroundColor: c.surfaceContainer,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 99,
  },
  selectedSegment: { backgroundColor: c.secondaryContainer },
  segmentText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: c.secondary,
  },
  selectedText: { color: c.primary, fontWeight: '600' },
  description: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  smallButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: c.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: c.primary,
    fontWeight: '500',
  },
  permissionMessage: { gap: 8 },
  shortcutRow: { padding: 20, paddingVertical: 16, gap: 12 },
  footer: { alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 24 },
  footerCaption: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    color: c.outline,
    textAlign: 'center',
  },
});
