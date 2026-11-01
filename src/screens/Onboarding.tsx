import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Chip,
  Eyebrow,
  Label,
  Screen,
  styles,
  Title,
} from '../components/ui';
import { copy } from '../copy';
import { colors as c } from '../theme';
import { useStore } from '../state/Store';
import {
  pickerValid,
  PRESETS,
  savePresets,
  togglePreset,
} from '../domain/interests';
import type { RootParams } from '../navigation/types';
export function PickerScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootParams, 'Interests'>) {
  const { data, update } = useStore();
  const editing = route.params?.editing;
  const [ids, setIds] = useState(
    data.savedInterests.filter(p => !p.isCustom).map(p => p.id),
  );
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await update(d => {
        const saved = savePresets(d.savedInterests, ids);
        return {
          ...d,
          savedInterests: saved,
          selectedInterestIds: d.selectedInterestIds.filter(id =>
            saved.some(p => p.id === id),
          ),
        };
      });
      if (editing) {
        navigation.goBack();
      } else {
        navigation.navigate('SessionLength');
      }
    } catch (e) {
      Alert.alert(copy.common.error, String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title={copy.brand} back={editing ? navigation.goBack : undefined}>
      <Eyebrow>{editing ? copy.settings.interests : copy.picker.step}</Eyebrow>
      <Title>{copy.picker.title}</Title>
      <Label muted>{copy.picker.subtitle}</Label>
      <Eyebrow>{copy.picker.label}</Eyebrow>
      <View style={styles.wrap}>
        {PRESETS.map(p => (
          <Chip
            key={p.id}
            title={p.name}
            selected={ids.includes(p.id)}
            onPress={() => {
              if (ids.length === 5 && !ids.includes(p.id)) {
                Alert.alert(copy.picker.limit);
              }
              setIds(togglePreset(ids, p.id));
            }}
          />
        ))}
      </View>
      <View style={{ flex: 1, minHeight: 32 }} />
      <Text style={styles.brand}>{copy.picker.counter(ids.length)}</Text>
      <Label muted>{copy.picker.hint}</Label>
      <Button
        title={editing ? copy.common.save : copy.common.continue}
        disabled={!pickerValid(ids) || busy}
        onPress={save}
        arrow
      />
    </Screen>
  );
}
export function SessionLengthScreen({
  navigation,
}: NativeStackScreenProps<RootParams, 'SessionLength'>) {
  const { data, update } = useStore();
  const [minutes, setMinutes] = useState(data.defaultMinutes);
  const [busy, setBusy] = useState(false);
  async function finish() {
    setBusy(true);
    try {
      await update(d => ({ ...d, defaultMinutes: minutes, onboarded: true }));
    } catch (e) {
      Alert.alert(copy.common.error, String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back={navigation.goBack}>
      <Eyebrow>{copy.length.step}</Eyebrow>
      <Title>{copy.length.title}</Title>
      <Label muted>{copy.length.subtitle}</Label>
      {[5, 10, 15].map((n, i) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityState={{ checked: n === minutes }}
          onPress={() => setMinutes(n)}
        >
          <Card
            style={
              n === minutes
                ? {
                    backgroundColor: c.secondaryContainer,
                    borderColor: c.primaryContainer,
                  }
                : {}
            }
          >
            <Text style={styles.brand}>{copy.common.minutes(n)}</Text>
            <Label muted>{copy.length.hints[i]}</Label>
          </Card>
        </Pressable>
      ))}
      <Card>
        <Label muted>{copy.length.note}</Label>
      </Card>
      <Button
        disabled={busy}
        title={copy.length.start}
        onPress={finish}
        arrow
      />
    </Screen>
  );
}
