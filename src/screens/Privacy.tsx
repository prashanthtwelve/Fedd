import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Input,
  Label,
  Screen,
  Sheet,
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
import { backups } from '../services/backups';
import { LockChoices, SecretInput } from './LocalProfile';
import type { RootParams } from '../navigation/types';
import type { AppData } from '../domain/model';

export function PrivacyScreen({
  navigation,
}: NativeStackScreenProps<RootParams, 'Privacy'>) {
  const { data, security, update, replace, refreshSecurity, lock, flush } =
    useStore();
  const [name, setName] = useState(data.profile?.name ?? '');
  const [mode, setMode] = useState<AuthMode>(security?.authMode ?? 'none');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<AppData | null>(null);
  useEffect(() => {
    setMode(security?.authMode ?? 'none');
  }, [security?.authMode]);
  useEffect(() => {
    setName(data.profile?.name ?? '');
  }, [data.profile?.name]);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await work();
    } catch (e) {
      if (!wasCancelled(e)) Alert.alert(copy.common.error, String(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeLock() {
    try {
      if (mode === 'pin') {
        const invalid = validatePin(pin);
        if (invalid) throw new Error(invalid);
        if (pin !== confirmPin) throw new Error(copy.offline.pinMismatch);
      }
      await localSecurity.configure(
        mode,
        mode === 'pin' ? pin : '',
        currentPin,
      );
      await refreshSecurity();
      setStatus(copy.privacy.locked);
    } finally {
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
    }
  }
  async function backUp() {
    try {
      await flush();
      setStatus(
        copy.privacy.created(await backups.create(password, confirmation)),
      );
    } finally {
      setPassword('');
      setConfirmation('');
    }
  }
  async function previewRestore() {
    try {
      setPending(await backups.prepareRestore(password));
    } finally {
      setPassword('');
      setConfirmation('');
    }
  }
  async function applyRestore() {
    if (!pending) return;
    await replace(pending);
    setPending(null);
    setStatus(copy.privacy.restored);
  }
  return (
    <Screen title={copy.brand} back={navigation.goBack}>
      <Title>{copy.privacy.title}</Title>
      <Label muted>{copy.privacy.dataHint}</Label>
      {data.profile && (
        <Card>
          <Label>{copy.privacy.profile}</Label>
          <Input
            label={copy.offline.name}
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoCapitalize="words"
          />
          <Button
            secondary
            title={copy.privacy.saveName}
            disabled={busy}
            onPress={() =>
              run(async () => {
                const profile = makeNameProfile(name);
                await update(value => ({
                  ...value,
                  profile: { ...value.profile, ...profile },
                }));
                setStatus(copy.privacy.nameSaved);
              })
            }
          />
          <LockChoices
            mode={mode}
            onChange={setMode}
            available={security?.deviceAuthAvailable === true}
          />
          <Label muted>{copy.privacy.lockHint}</Label>
          {security?.authMode === 'pin' && (
            <SecretInput
              pin
              label={copy.offline.currentPin}
              value={currentPin}
              onChangeText={setCurrentPin}
            />
          )}
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
                value={confirmPin}
                onChangeText={setConfirmPin}
              />
            </>
          )}
          <Button
            title={copy.privacy.saveLock}
            disabled={busy}
            onPress={() => run(changeLock)}
          />
          {security?.authMode !== 'none' && (
            <Button
              secondary
              title={copy.offline.lockNow}
              disabled={busy}
              onPress={() => run(lock)}
            />
          )}
        </Card>
      )}
      <Card>
        <Label>{copy.privacy.backupHeading}</Label>
        <Label>{copy.privacy.folder}</Label>
        <Label muted>
          {security?.backupFolder?.name ?? copy.privacy.noFolder}
        </Label>
        <Label muted>{copy.privacy.folderHint}</Label>
        <Button
          secondary
          title={
            security?.backupFolder ? copy.privacy.change : copy.privacy.choose
          }
          disabled={busy}
          onPress={() =>
            run(async () => {
              await localSecurity.chooseFolder();
              await refreshSecurity();
            })
          }
        />
        <SecretInput
          label={copy.privacy.password}
          value={password}
          onChangeText={setPassword}
        />
        <SecretInput
          label={copy.privacy.confirmPassword}
          value={confirmation}
          onChangeText={setConfirmation}
        />
        <Label muted>{copy.privacy.passwordHint}</Label>
        <Button
          title={copy.privacy.backup}
          disabled={busy || !data.profile || !security?.backupFolder}
          onPress={() => run(backUp)}
        />
        <Button
          secondary
          title={copy.privacy.restore}
          disabled={busy}
          onPress={() => run(previewRestore)}
        />
        <Label muted>{copy.privacy.restoreHint}</Label>
        <Label muted>{copy.offline.restoredLock}</Label>
      </Card>
      {pending && (
        <Sheet
          visible
          onClose={() => {
            if (!busy) setPending(null);
          }}
        >
          <Title>{copy.privacy.confirmRestore}</Title>
          <Label>
            {copy.privacy.restoreSummary(
              pending.savedInterests.length,
              pending.sessions.length,
              pending.ideas.length,
              pending.activityHistory.length,
            )}
          </Label>
          <Button
            title={copy.privacy.restore}
            disabled={busy}
            onPress={() => run(applyRestore)}
          />
          <Button
            secondary
            title={copy.common.cancel}
            disabled={busy}
            onPress={() => setPending(null)}
          />
        </Sheet>
      )}
      {!!status && <Label>{status}</Label>}
    </Screen>
  );
}
