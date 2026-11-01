import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bookmark,
  CheckCircle2,
  Leaf,
  SlidersHorizontal,
} from 'lucide-react-native';
import {
  Button,
  Card,
  Eyebrow,
  Input,
  Label,
  Screen,
  Sheet,
  styles,
  Title,
} from '../components/ui';
import { InterestIcon } from '../components/InterestIcon';
import { useStore } from '../state/Store';
import {
  selectNewCustom,
  toggleSession,
  validateCustom,
} from '../domain/interests';
import { weeklyStats } from '../domain/model';
import { copy } from '../copy';
import { colors as c } from '../theme';
import type { RootParams } from '../navigation/types';
export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { data, update } = useStore();
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = data.selectedInterestIds
    .map(id => data.savedInterests.find(p => p.id === id))
    .filter(p => p !== undefined);
  async function toggle(id: string) {
    if (selected.length === 3 && !data.selectedInterestIds.includes(id)) {
      Alert.alert(copy.home.max);
      return;
    }
    try {
      await update(d => ({
        ...d,
        selectedInterestIds: toggleSession(d.selectedInterestIds, id),
      }));
    } catch (e) {
      Alert.alert(copy.common.error, String(e));
    }
  }
  async function add() {
    const issue = validateCustom(name, data.savedInterests);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      await update(d => {
        const validation = validateCustom(name, d.savedInterests);
        if (validation) {
          throw new Error(validation);
        }
        const interest = {
          id: `custom-${Date.now()}`,
          name: name.trim(),
          icon: 'sparkles',
          isCustom: true,
        };
        return {
          ...d,
          savedInterests: [...d.savedInterests, interest],
          selectedInterestIds: selectNewCustom(
            d.selectedInterestIds,
            interest.id,
          ),
        };
      });
      setSheet(false);
      setName('');
      if (selected.length === 3) {
        Alert.alert(copy.custom.replaced);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen tabbed>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={styles.brand}>{copy.brand}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.settings.interests}
          style={styles.iconButton}
          onPress={() => navigation.navigate('Interests', { editing: true })}
        >
          <SlidersHorizontal color={c.secondary} />
        </Pressable>
      </View>
      <Eyebrow>{copy.home.eyebrow}</Eyebrow>
      <Title>{copy.home.title}</Title>
      <View style={[styles.wrap, { gap: 14 }]}>
        {data.savedInterests.map(p => {
          const active = data.selectedInterestIds.includes(p.id);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="checkbox"
              accessibilityLabel={p.name}
              accessibilityState={{ checked: active }}
              onPress={() => toggle(p.id)}
              style={[
                styles.card,
                {
                  width: '47.5%',
                  minHeight: 126,
                  justifyContent: 'space-between',
                  borderRadius: 16,
                },
                active && styles.selected,
              ]}
            >
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <InterestIcon name={p.icon} />
                {active && (
                  <CheckCircle2 size={21} color={c.primaryContainer} />
                )}
              </View>
              <Label>{p.name}</Label>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setError(null);
          setSheet(true);
        }}
        style={[
          styles.card,
          {
            borderStyle: 'dashed',
            borderWidth: 2,
            alignItems: 'center',
            minHeight: 56,
            padding: 14,
          },
        ]}
      >
        <Label muted>{copy.home.add}</Label>
      </Pressable>
      <Button
        disabled={!selected.length}
        title={
          selected.length
            ? copy.home.continued(selected[0].name, selected.length - 1)
            : copy.home.none
        }
        onPress={() =>
          navigation.navigate(data.activeSessionId ? 'Checkin' : 'Intent')
        }
        arrow
      />
      {data.activeSessionId && (
        <Button
          secondary
          title={copy.checkin.active}
          onPress={() => navigation.navigate('Checkin')}
        />
      )}
      <Card>
        <View style={styles.row}>
          <CheckCircle2 color={c.primaryContainer} />
          <Label>
            {copy.home.sessions(weeklyStats(data.sessions).started)}
          </Label>
        </View>
      </Card>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Activity', { id: 0 })}
      >
        <Card>
          <View style={styles.row}>
            <Leaf color={c.secondary} />
            <View style={{ flex: 1 }}>
              <Label>{copy.home.pause}</Label>
              <Label muted>{copy.home.pauseHint}</Label>
            </View>
          </View>
        </Card>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Ideas')}
        style={[styles.row, { minHeight: 48 }]}
      >
        <Bookmark color={c.primaryContainer} />
        <Label>{copy.ideas.title}</Label>
      </Pressable>
      <Eyebrow>{copy.home.footer}</Eyebrow>
      <Sheet visible={sheet} onClose={() => setSheet(false)}>
        <View style={{ gap: 20 }}>
          <Title>{copy.custom.title}</Title>
          <Input
            label={copy.custom.subtitle}
            placeholder={copy.custom.placeholder}
            value={name}
            onChangeText={value => {
              setName(value);
              setError(null);
            }}
            maxLength={24}
            autoFocus
          />
          {error && <Label style={{ color: c.error }}>{error}</Label>}
          <Button title={copy.common.add} disabled={busy} onPress={add} />
        </View>
      </Sheet>
    </Screen>
  );
}
