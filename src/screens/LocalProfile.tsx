import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  Screen,
  styles,
  Title,
} from '../components/ui';
import { copy } from '../copy';
import { useStore } from '../state/Store';
import {
  localSecurity,
  wasCancelled,
  type AuthMode,
} from '../platform/security';
import { makeNameProfile, validatePin } from '../services/auth';
import type { RootParams } from '../navigation/types';

export function LockChoices({
  mode,
  onChange,
  available,
}: {
  mode: AuthMode;
  onChange: (value: AuthMode) => void;
  available: boolean;
}) {
  return (
    <>
      <Label>{copy.offline.lock}</Label>
      <View style={styles.wrap}>
        {(['none', 'pin', 'device'] as const).map(value => (
          <Chip
            key={value}
            title={copy.offline[value]}
            selected={mode === value}
            onPress={() => {
              if (value === 'device' && !available)
                Alert.alert(copy.offline.deviceUnavailable);
              else onChange(value);
            }}
          />
        ))}
      </View>
      {mode === 'device' && <Label muted>{copy.offline.deviceHint}</Label>}
    </>
  );
}
export function SecretInput({
  label,
  value,
  onChangeText,
  pin = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  pin?: boolean;
}) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry
      keyboardType={pin ? 'number-pad' : 'default'}
      maxLength={pin ? 12 : 128}
      autoComplete="off"
      importantForAutofill="no"
      autoCorrect={false}
      autoCapitalize="none"
    />
  );
}
export function LocalProfileScreen({
  navigation,
}: NativeStackScreenProps<RootParams, 'Login'>) {
  const { update, security, refreshSecurity } = useStore();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<AuthMode>(security?.authMode ?? 'none');
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  async function create() {
    if (busy) return;
    setBusy(true);
    try {
      const profile = makeNameProfile(name);
      if (mode === 'pin') {
        const invalid = validatePin(pin);
        if (invalid) throw new Error(invalid);
        if (pin !== confirm) throw new Error(copy.offline.pinMismatch);
      }
      await localSecurity.configure(
        mode,
        mode === 'pin' ? pin : '',
        currentPin,
      );
      await update(data => ({ ...data, profile }));
      await refreshSecurity();
    } catch (e) {
      if (!wasCancelled(e)) Alert.alert(copy.common.error, String(e));
    } finally {
      setPin('');
      setConfirm('');
      setCurrentPin('');
      await refreshSecurity().catch(() => undefined);
      setBusy(false);
    }
  }
  return (
    <Screen title={copy.brand}>
      <Title>{copy.offline.create}</Title>
      <Label muted>{copy.offline.subtitle}</Label>
      <Input
        label={copy.offline.name}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={60}
      />
      <Card>
        {security?.authMode === 'pin' && (
          <>
            <Label muted>{copy.offline.resumeProfile}</Label>
            <SecretInput
              pin
              label={copy.offline.currentPin}
              value={currentPin}
              onChangeText={setCurrentPin}
            />
          </>
        )}
        <LockChoices
          mode={mode}
          onChange={setMode}
          available={security?.deviceAuthAvailable === true}
        />
        {mode === 'pin' && (
          <>
            <SecretInput
              pin
              label={copy.offline.pinLabel}
              value={pin}
              onChangeText={setPin}
            />
            <SecretInput
              pin
              label={copy.offline.confirmPin}
              value={confirm}
              onChangeText={setConfirm}
            />
          </>
        )}
      </Card>
      <Button
        title={copy.offline.continue}
        onPress={create}
        disabled={busy || !name.trim()}
        arrow
      />
      <Label muted>{copy.offline.private}</Label>
      <Button
        secondary
        title={copy.offline.recover}
        onPress={() => navigation.navigate('Privacy', { recovery: true })}
        disabled={busy}
      />
    </Screen>
  );
}
export function UnlockScreen() {
  const { security, unlock } = useStore();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function authenticate() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await unlock(security?.authMode === 'pin' ? pin : undefined);
    } catch (e) {
      if (!wasCancelled(e)) setError(String(e));
    } finally {
      setPin('');
      setBusy(false);
    }
  }
  return (
    <Screen title={copy.brand}>
      <Title>{copy.offline.unlockTitle}</Title>
      <Label muted>{copy.offline.unlockHint}</Label>
      {security?.authMode === 'pin' && (
        <SecretInput
          pin
          label={copy.offline.pinLabel}
          value={pin}
          onChangeText={setPin}
        />
      )}
      {!!error && <Label>{error}</Label>}
      <Button
        title={
          security?.authMode === 'pin'
            ? copy.offline.unlock
            : copy.offline.unlockDevice
        }
        onPress={authenticate}
        disabled={busy || (security?.authMode === 'pin' && !pin)}
        arrow
      />
      <Label muted>{copy.offline.forgotten}</Label>
    </Screen>
  );
}
